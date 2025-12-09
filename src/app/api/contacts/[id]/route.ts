import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ContactStatus } from '@prisma/client';

// GET /api/contacts/[id] - Get a single contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        userId: user.id,
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
        emailSends: {
          orderBy: { sentAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            sentAt: true,
            openedAt: true,
            clickedAt: true,
            campaign: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...contact,
      lists: contact.lists.map((cl) => cl.list),
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
  status: z.nativeEnum(ContactStatus).optional(),
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
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        lists: true,
      },
    });

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const { email, firstName, lastName, status, metadata, listIds } =
      validation.data;

    // If email is being changed, check for duplicates
    if (email && email.toLowerCase() !== existingContact.email) {
      const duplicateContact = await prisma.contact.findFirst({
        where: {
          email: email.toLowerCase(),
          userId: user.id,
          id: { not: id },
        },
      });

      if (duplicateContact) {
        return NextResponse.json(
          { error: 'A contact with this email already exists' },
          { status: 409 }
        );
      }
    }

    // Update list associations if provided
    if (listIds !== undefined) {
      const currentListIds = existingContact.lists.map((l) => l.listId);
      const listsToAdd = listIds.filter((id) => !currentListIds.includes(id));
      const listsToRemove = currentListIds.filter((id) => !listIds.includes(id));

      // Remove from old lists
      if (listsToRemove.length > 0) {
        await prisma.listContact.deleteMany({
          where: {
            contactId: id,
            listId: { in: listsToRemove },
          },
        });
        await prisma.list.updateMany({
          where: { id: { in: listsToRemove } },
          data: { contactCount: { decrement: 1 } },
        });
      }

      // Add to new lists
      if (listsToAdd.length > 0) {
        await prisma.listContact.createMany({
          data: listsToAdd.map((listId) => ({
            contactId: id,
            listId,
          })),
        });
        await prisma.list.updateMany({
          where: { id: { in: listsToAdd } },
          data: { contactCount: { increment: 1 } },
        });
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (email) updateData.email = email.toLowerCase();
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (status) updateData.status = status;
    if (metadata) updateData.metadata = metadata;

    // Update the contact
    const contact = await prisma.contact.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json({
      ...contact,
      lists: contact.lists.map((cl) => cl.list),
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
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        lists: true,
      },
    });

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    // Get list IDs to decrement counts
    const listIds = existingContact.lists.map((l) => l.listId);

    // Delete the contact (cascade will handle related records)
    await prisma.contact.delete({
      where: { id },
    });

    // Update list contact counts
    if (listIds.length > 0) {
      await prisma.list.updateMany({
        where: { id: { in: listIds } },
        data: { contactCount: { decrement: 1 } },
      });
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
