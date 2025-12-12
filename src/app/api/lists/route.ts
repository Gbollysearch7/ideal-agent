import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin, createSearchFilter } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// GET /api/lists - List all lists with pagination
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Search
    const search = searchParams.get('search') || '';

    // Build query
    let query = supabaseAdmin
      .from('lists')
      .select('id, name, description, contact_count, created_at, updated_at', {
        count: 'exact',
      })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply search filter (with proper escaping to prevent SQL injection)
    if (search) {
      const searchFilter = createSearchFilter(['name', 'description'], search);
      if (searchFilter) {
        query = query.or(searchFilter);
      }
    }

    const { data: lists, count, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Transform response
    const transformedLists = (lists || []).map((list) => ({
      id: list.id,
      name: list.name,
      description: list.description,
      contactCount: list.contact_count,
      createdAt: list.created_at,
      updatedAt: list.updated_at,
    }));

    return NextResponse.json({
      lists: transformedLists,
      pagination: {
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
    console.error('Error fetching lists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lists' },
      { status: 500 }
    );
  }
}

// POST /api/lists - Create a new list
const createListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const validation = createListSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description } = validation.data;

    // Check if list with same name exists (case-insensitive)
    const { data: existingList } = await supabaseAdmin
      .from('lists')
      .select('id')
      .eq('user_id', user.id)
      .ilike('name', name)
      .single();

    if (existingList) {
      return NextResponse.json(
        { error: 'A list with this name already exists' },
        { status: 409 }
      );
    }

    // Generate list ID
    const listId = `l_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

    const { data: list, error } = await supabaseAdmin
      .from('lists')
      .insert({
        id: listId,
        name,
        description: description || null,
        user_id: user.id,
        contact_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return NextResponse.json(
      {
        id: list.id,
        name: list.name,
        description: list.description,
        contactCount: list.contact_count,
        createdAt: list.created_at,
        updatedAt: list.updated_at,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating list:', error);
    return NextResponse.json(
      { error: 'Failed to create list' },
      { status: 500 }
    );
  }
}
