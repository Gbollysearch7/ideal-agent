import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

const ContactStatus = [
  'SUBSCRIBED',
  'UNSUBSCRIBED',
  'BOUNCED',
  'COMPLAINED',
] as const;

// GET /api/contacts/[id] - Get a single contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Get contact with lists
    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .select('*, list_contacts(list_id, lists(id, name))')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Get email history
    const { data: emailSends } = await supabaseAdmin
      .from('email_sends')
      .select(
        'id, status, sent_at, opened_at, clicked_at, campaign_id, campaigns(id, name)'
      )
      .eq('contact_id', id)
      .order('sent_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      id: contact.id,
      email: contact.email,
      firstName: contact.first_name,
      lastName: contact.last_name,
      status: contact.status,
      metadata: contact.metadata,
      userId: contact.user_id,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
      lastEmailSentAt: contact.last_email_sent_at,
      lists: (contact.list_contacts || [])
        .map((lc: any) => lc.lists)
        .filter(Boolean),
      emailSends: (emailSends || []).map((es: any) => ({
        id: es.id,
        status: es.status,
        sentAt: es.sent_at,
        openedAt: es.opened_at,
        clickedAt: es.clicked_at,
        campaign: es.campaigns,
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching contact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

// PATCH /api/contacts/[id] - Update a contact
const updateContactSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  status: z.enum(ContactStatus).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  listIds: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const validation = updateContactSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Check if contact exists and belongs to user
    const { data: existingContact } = await supabaseAdmin
      .from('contacts')
      .select('*, list_contacts(list_id)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const { email, firstName, lastName, status, metadata, listIds } =
      validation.data;

    // If email is being changed, check for duplicates
    if (email && email.toLowerCase() !== existingContact.email) {
      const { data: duplicateContact } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .eq('email', email.toLowerCase())
        .eq('user_id', user.id)
        .neq('id', id)
        .single();

      if (duplicateContact) {
        return NextResponse.json(
          { error: 'A contact with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Update list associations if provided
    if (listIds !== undefined) {
      const currentListIds = (existingContact.list_contacts || []).map(
        (l: any) => l.list_id
      );
      const listsToAdd = listIds.filter(
        (listId) => !currentListIds.includes(listId)
      );
      const listsToRemove = currentListIds.filter(
        (listId: string) => !listIds.includes(listId)
      );

      // Remove from old lists
      if (listsToRemove.length > 0) {
        await supabaseAdmin
          .from('list_contacts')
          .delete()
          .eq('contact_id', id)
          .in('list_id', listsToRemove);

        // Decrement list counts
        for (const listId of listsToRemove) {
          const { data: list } = await supabaseAdmin
            .from('lists')
            .select('contact_count')
            .eq('id', listId)
            .single();

          await supabaseAdmin
            .from('lists')
            .update({
              contact_count: Math.max(0, (list?.contact_count || 1) - 1),
            })
            .eq('id', listId);
        }
      }

      // Add to new lists
      if (listsToAdd.length > 0) {
        await supabaseAdmin.from('list_contacts').insert(
          listsToAdd.map((listId) => ({
            contact_id: id,
            list_id: listId,
            created_at: new Date().toISOString(),
          }))
        );

        // Increment list counts
        for (const listId of listsToAdd) {
          const { data: list } = await supabaseAdmin
            .from('lists')
            .select('contact_count')
            .eq('id', listId)
            .single();

          await supabaseAdmin
            .from('lists')
            .update({ contact_count: (list?.contact_count || 0) + 1 })
            .eq('id', listId);
        }
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (email) updateData.email = email.toLowerCase();
    if (firstName !== undefined) updateData.first_name = firstName;
    if (lastName !== undefined) updateData.last_name = lastName;
    if (status) updateData.status = status;
    if (metadata) updateData.metadata = metadata;

    // Update the contact
    const { data: contact, error: updateError } = await supabaseAdmin
      .from('contacts')
      .update(updateData)
      .eq('id', id)
      .select('*, list_contacts(list_id, lists(id, name))')
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      id: contact.id,
      email: contact.email,
      firstName: contact.first_name,
      lastName: contact.last_name,
      status: contact.status,
      metadata: contact.metadata,
      userId: contact.user_id,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
      lists: (contact.list_contacts || [])
        .map((lc: any) => lc.lists)
        .filter(Boolean),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

// DELETE /api/contacts/[id] - Delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Check if contact exists and belongs to user
    const { data: existingContact } = await supabaseAdmin
      .from('contacts')
      .select('*, list_contacts(list_id)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Get list IDs to decrement counts
    const listIds = (existingContact.list_contacts || []).map(
      (l: any) => l.list_id
    );

    // Delete list_contacts associations first
    await supabaseAdmin.from('list_contacts').delete().eq('contact_id', id);

    // Delete email_sends
    await supabaseAdmin.from('email_sends').delete().eq('contact_id', id);

    // Delete the contact
    const { error: deleteError } = await supabaseAdmin
      .from('contacts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw deleteError;
    }

    // Update list contact counts
    for (const listId of listIds) {
      const { data: list } = await supabaseAdmin
        .from('lists')
        .select('contact_count')
        .eq('id', listId)
        .single();

      await supabaseAdmin
        .from('lists')
        .update({ contact_count: Math.max(0, (list?.contact_count || 1) - 1) })
        .eq('id', listId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
