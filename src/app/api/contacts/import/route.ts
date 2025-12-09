import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ContactStatus } from '@prisma/client';

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
    const existingContacts = await prisma.contact.findMany({
      where: {
        userId: user.id,
        email: {
          in: contacts.map((c) => c.email.toLowerCase()),
        },
      },
      select: { email: true },
    });

    const existingEmails = new Set(existingContacts.map((c) => c.email));

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
        // Use transaction for each batch
        await prisma.$transaction(async (tx) => {
          for (const contactData of batch) {
            try {
              const contact = await tx.contact.create({
                data: {
                  email: contactData.email.toLowerCase(),
                  firstName: contactData.firstName,
                  lastName: contactData.lastName,
                  metadata: (contactData.metadata || {}) as object,
                  userId: user.id,
                  status: ContactStatus.SUBSCRIBED,
                  lists: listIds
                    ? {
                        create: listIds.map((listId) => ({
                          listId,
                        })),
                      }
                    : undefined,
                },
              });
              importedCount++;
            } catch (err) {
              errors.push({
                email: contactData.email,
                error: err instanceof Error ? err.message : 'Unknown error',
              });
            }
          }
        });
      } catch (batchError) {
        console.error('Batch import error:', batchError);
        // Continue with next batch even if this one fails
      }
    }

    // Update list contact counts
    if (listIds && listIds.length > 0 && importedCount > 0) {
      await prisma.list.updateMany({
        where: { id: { in: listIds } },
        data: { contactCount: { increment: importedCount } },
      });
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
