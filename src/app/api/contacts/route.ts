import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ContactStatus } from '@prisma/client';

// GET /api/contacts - List contacts with pagination, search, and filtering
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    // Search
    const search = searchParams.get('search') || '';

    // Filters
    const status = searchParams.get('status') as ContactStatus | null;
    const listId = searchParams.get('listId');

    // Build where clause
    const where: any = {
      userId: user.id,
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (listId) {
      where.lists = {
        some: {
          listId: listId,
        },
      };
    }

    // Execute queries in parallel
    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lists: {
            include: {
              list: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    // Transform the response
    const transformedContacts = contacts.map((contact) => ({
      ...contact,
      lists: contact.lists.map((cl) => cl.list),
    }));

    return NextResponse.json({
      contacts: transformedContacts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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
    const existingContact = await prisma.contact.findFirst({
      where: {
        email: email.toLowerCase(),
        userId: user.id,
      },
    });

    if (existingContact) {
      return NextResponse.json(
        { error: 'A contact with this email already exists' },
        { status: 409 }
      );
    }

    // Create the contact
    const contact = await prisma.contact.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        metadata: (metadata || {}) as object,
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
      include: {
        lists: {
          include: {
            list: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Update list contact counts
    if (listIds && listIds.length > 0) {
      await prisma.list.updateMany({
        where: { id: { in: listIds } },
        data: { contactCount: { increment: 1 } },
      });
    }

    return NextResponse.json(
      {
        ...contact,
        lists: contact.lists.map((cl) => cl.list),
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
