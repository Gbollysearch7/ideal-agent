import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin, updateListContactCount } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// POST /api/lists/[id]/contacts - Add contacts to a list
const addContactsSchema = z.object({
  contactIds: z.array(z.string()).min(1, 'At least one contact is required'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: listId } = await params;
    const body = await request.json();

    const validation = addContactsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Check if list exists and belongs to user
    const { data: list, error: listError } = await supabaseAdmin
      .from('lists')
      .select('id, contact_count')
      .eq('id', listId)
      .eq('user_id', user.id)
      .single();

    if (listError || !list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const { contactIds } = validation.data;

    // Verify all contacts belong to the user
    const { data: contacts } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('user_id', user.id)
      .in('id', contactIds);

    const validContactIds = (contacts || []).map((c) => c.id);
    const invalidIds = contactIds.filter((id) => !validContactIds.includes(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Some contacts not found: ${invalidIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Get existing associations
    const { data: existingAssociations } = await supabaseAdmin
      .from('list_contacts')
      .select('contact_id')
      .eq('list_id', listId)
      .in('contact_id', validContactIds);

    const existingIds = new Set(
      (existingAssociations || []).map((a) => a.contact_id)
    );
    const newContactIds = validContactIds.filter((id) => !existingIds.has(id));

    if (newContactIds.length === 0) {
      return NextResponse.json({
        added: 0,
        skipped: validContactIds.length,
        message: 'All contacts are already in this list',
      });
    }

    // Add new associations
    const listContactRecords = newContactIds.map((contactId) => ({
      contact_id: contactId,
      list_id: listId,
      created_at: new Date().toISOString(),
    }));

    await supabaseAdmin.from('list_contacts').insert(listContactRecords);

    // Update list contact count atomically to prevent race conditions
    await updateListContactCount(listId, newContactIds.length);

    return NextResponse.json({
      added: newContactIds.length,
      skipped: existingIds.size,
      message: `Added ${newContactIds.length} contacts to the list`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error adding contacts to list:', error);
    return NextResponse.json(
      { error: 'Failed to add contacts to list' },
      { status: 500 }
    );
  }
}

// DELETE /api/lists/[id]/contacts - Remove contacts from a list
const removeContactsSchema = z.object({
  contactIds: z.array(z.string()).min(1, 'At least one contact is required'),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: listId } = await params;
    const body = await request.json();

    const validation = removeContactsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Check if list exists and belongs to user
    const { data: list, error: listError } = await supabaseAdmin
      .from('lists')
      .select('id, contact_count')
      .eq('id', listId)
      .eq('user_id', user.id)
      .single();

    if (listError || !list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const { contactIds } = validation.data;

    // Count existing associations before delete
    const { count: existingCount } = await supabaseAdmin
      .from('list_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', listId)
      .in('contact_id', contactIds);

    // Remove associations
    const { error: deleteError } = await supabaseAdmin
      .from('list_contacts')
      .delete()
      .eq('list_id', listId)
      .in('contact_id', contactIds);

    if (deleteError) {
      throw deleteError;
    }

    const removedCount = existingCount || 0;

    // Update list contact count atomically to prevent race conditions
    if (removedCount > 0) {
      await updateListContactCount(listId, -removedCount);
    }

    return NextResponse.json({
      removed: removedCount,
      message: `Removed ${removedCount} contacts from the list`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error removing contacts from list:', error);
    return NextResponse.json(
      { error: 'Failed to remove contacts from list' },
      { status: 500 }
    );
  }
}
