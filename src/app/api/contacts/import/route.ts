import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// POST /api/contacts/import - Bulk import contacts from CSV data
const importContactSchema = z.object({
  contacts: z.array(
    z.object({
      email: z.string().email('Invalid email address'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })
  ),
  listIds: z.array(z.string()).optional(),
  skipDuplicates: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const validation = importContactSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { contacts, listIds, skipDuplicates } = validation.data;

    // Get existing emails for this user
    const emails = contacts.map((c) => c.email.toLowerCase());
    const { data: existingContacts } = await supabaseAdmin
      .from('contacts')
      .select('email')
      .eq('user_id', user.id)
      .in('email', emails);

    const existingEmails = new Set(
      (existingContacts || []).map((c) => c.email)
    );

    // Filter out duplicates if skipDuplicates is true
    let contactsToImport = contacts;
    let skippedCount = 0;

    if (skipDuplicates) {
      contactsToImport = contacts.filter((c) => {
        const isDuplicate = existingEmails.has(c.email.toLowerCase());
        if (isDuplicate) skippedCount++;
        return !isDuplicate;
      });
    }

    if (contactsToImport.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: skippedCount,
        errors: [],
        message: 'No new contacts to import',
      });
    }

    // Create contacts in batches to avoid overwhelming the database
    const BATCH_SIZE = 100;
    const errors: { email: string; error: string }[] = [];
    let importedCount = 0;

    for (let i = 0; i < contactsToImport.length; i += BATCH_SIZE) {
      const batch = contactsToImport.slice(i, i + BATCH_SIZE);

      try {
        // Prepare batch data
        const batchData = batch.map((contactData) => ({
          id: `c_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
          email: contactData.email.toLowerCase(),
          first_name: contactData.firstName || null,
          last_name: contactData.lastName || null,
          metadata: contactData.metadata || {},
          user_id: user.id,
          status: 'SUBSCRIBED',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        // Insert contacts batch
        const { data: insertedContacts, error: insertError } =
          await supabaseAdmin.from('contacts').insert(batchData).select('id');

        if (insertError) {
          console.error('Batch insert error:', insertError);
          batch.forEach((c) => {
            errors.push({ email: c.email, error: insertError.message });
          });
          continue;
        }

        importedCount += insertedContacts?.length || 0;

        // Add to lists if specified
        if (listIds && listIds.length > 0 && insertedContacts) {
          const listContactRecords: {
            contact_id: string;
            list_id: string;
            created_at: string;
          }[] = [];

          for (const contact of insertedContacts) {
            for (const listId of listIds) {
              listContactRecords.push({
                contact_id: contact.id,
                list_id: listId,
                created_at: new Date().toISOString(),
              });
            }
          }

          if (listContactRecords.length > 0) {
            await supabaseAdmin
              .from('list_contacts')
              .insert(listContactRecords);
          }
        }
      } catch (batchError) {
        console.error('Batch import error:', batchError);
        batch.forEach((c) => {
          errors.push({
            email: c.email,
            error:
              batchError instanceof Error
                ? batchError.message
                : 'Unknown error',
          });
        });
      }
    }

    // Update list contact counts
    if (listIds && listIds.length > 0 && importedCount > 0) {
      for (const listId of listIds) {
        const { data: list } = await supabaseAdmin
          .from('lists')
          .select('contact_count')
          .eq('id', listId)
          .single();

        await supabaseAdmin
          .from('lists')
          .update({ contact_count: (list?.contact_count || 0) + importedCount })
          .eq('id', listId);
      }
    }

    return NextResponse.json({
      imported: importedCount,
      skipped: skippedCount,
      errors: errors.slice(0, 10), // Only return first 10 errors
      totalErrors: errors.length,
      message: `Successfully imported ${importedCount} contacts`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error importing contacts:', error);
    return NextResponse.json(
      { error: 'Failed to import contacts' },
      { status: 500 }
    );
  }
}
