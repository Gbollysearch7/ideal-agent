import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// GET /api/lists/[id] - Get a single list with contacts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Pagination for contacts
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Get the list
    const { data: list, error: listError } = await supabaseAdmin
      .from('lists')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (listError || !list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // Get contacts in this list with pagination
    const { data: listContacts, count } = await supabaseAdmin
      .from('list_contacts')
      .select(
        'created_at, contacts(id, email, first_name, last_name, status, created_at)',
        { count: 'exact' }
      )
      .eq('list_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const contacts = (listContacts || [])
      .map((lc: any) => ({
        id: lc.contacts?.id,
        email: lc.contacts?.email,
        firstName: lc.contacts?.first_name,
        lastName: lc.contacts?.last_name,
        status: lc.contacts?.status,
        createdAt: lc.contacts?.created_at,
        addedAt: lc.created_at,
      }))
      .filter((c) => c.id);

    return NextResponse.json({
      id: list.id,
      name: list.name,
      description: list.description,
      contactCount: list.contact_count,
      createdAt: list.created_at,
      updatedAt: list.updated_at,
      contacts,
      contactsPagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch list' },
      { status: 500 }
    );
  }
}

// PATCH /api/lists/[id] - Update a list
const updateListSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .optional(),
  description: z.string().max(500, 'Description is too long').optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const validation = updateListSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Check if list exists and belongs to user
    const { data: existingList } = await supabaseAdmin
      .from('lists')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existingList) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const { name, description } = validation.data;

    // If name is being changed, check for duplicates
    if (name && name.toLowerCase() !== existingList.name.toLowerCase()) {
      const { data: duplicateList } = await supabaseAdmin
        .from('lists')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', name)
        .neq('id', id)
        .single();

      if (duplicateList) {
        return NextResponse.json(
          { error: 'A list with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const { data: list, error } = await supabaseAdmin
      .from('lists')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      id: list.id,
      name: list.name,
      description: list.description,
      contactCount: list.contact_count,
      createdAt: list.created_at,
      updatedAt: list.updated_at,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating list:', error);
    return NextResponse.json(
      { error: 'Failed to update list' },
      { status: 500 }
    );
  }
}

// DELETE /api/lists/[id] - Delete a list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Check if list exists and belongs to user
    const { data: existingList } = await supabaseAdmin
      .from('lists')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existingList) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    // Delete list_contacts associations first
    await supabaseAdmin.from('list_contacts').delete().eq('list_id', id);

    // Delete the list
    const { error } = await supabaseAdmin.from('lists').delete().eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting list:', error);
    return NextResponse.json(
      { error: 'Failed to delete list' },
      { status: 500 }
    );
  }
}
