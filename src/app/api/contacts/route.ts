import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  supabaseAdmin,
  createSearchFilter,
  updateListContactCount,
} from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// GET /api/contacts - List contacts with pagination, search, and filtering
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

    // Filters
    const status = searchParams.get('status');
    const listId = searchParams.get('listId');

    // Build query
    let query = supabaseAdmin
      .from('contacts')
      .select('*, list_contacts(list_id, lists(id, name))', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply search filter (with proper escaping to prevent SQL injection)
    if (search) {
      const searchFilter = createSearchFilter(
        ['email', 'first_name', 'last_name'],
        search
      );
      if (searchFilter) {
        query = query.or(searchFilter);
      }
    }

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply list filter - need separate query for this
    if (listId) {
      // Get contact IDs that belong to the list first
      const { data: listContacts } = await supabaseAdmin
        .from('list_contacts')
        .select('contact_id')
        .eq('list_id', listId);

      if (listContacts && listContacts.length > 0) {
        const contactIds = listContacts.map((lc) => lc.contact_id);
        query = query.in('id', contactIds);
      } else {
        // No contacts in this list
        return NextResponse.json({
          contacts: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        });
      }
    }

    const { data: contacts, count, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Transform the response
    const transformedContacts = (contacts || []).map((contact: any) => ({
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
    }));

    return NextResponse.json({
      contacts: transformedContacts,
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
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

// POST /api/contacts - Create a new contact
const createContactSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  listIds: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const validation = createContactSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { email, firstName, lastName, metadata, listIds } = validation.data;

    // Check if contact already exists for this user
    const { data: existingContact } = await supabaseAdmin
      .from('contacts')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('user_id', user.id)
      .single();

    if (existingContact) {
      return NextResponse.json(
        { error: 'A contact with this email already exists' },
        { status: 409 }
      );
    }

    // Generate contact ID
    const contactId = `c_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

    // Create the contact
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .insert({
        id: contactId,
        email: email.toLowerCase(),
        first_name: firstName || null,
        last_name: lastName || null,
        metadata: metadata || {},
        user_id: user.id,
        status: 'SUBSCRIBED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (contactError) {
      console.error('Supabase error creating contact:', contactError);
      throw contactError;
    }

    // Add to lists if specified
    if (listIds && listIds.length > 0) {
      const listContactRecords = listIds.map((listId) => ({
        contact_id: contactId,
        list_id: listId,
        created_at: new Date().toISOString(),
      }));

      await supabaseAdmin.from('list_contacts').insert(listContactRecords);

      // Update list contact counts atomically to prevent race conditions
      await Promise.all(
        listIds.map((listId) => updateListContactCount(listId, 1))
      );
    }

    // Fetch lists for the contact
    const { data: contactLists } = await supabaseAdmin
      .from('list_contacts')
      .select('lists(id, name)')
      .eq('contact_id', contactId);

    return NextResponse.json(
      {
        id: contact.id,
        email: contact.email,
        firstName: contact.first_name,
        lastName: contact.last_name,
        status: contact.status,
        metadata: contact.metadata,
        userId: contact.user_id,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at,
        lists: (contactLists || []).map((cl: any) => cl.lists).filter(Boolean),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    );
  }
}
