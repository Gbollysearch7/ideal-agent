import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
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
    const list = await prisma.list.findFirst({
      where: {
        id: listId,
        userId: user.id,
      },
    });

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const { contactIds } = validation.data;

    // Verify all contacts belong to the user
    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: contactIds },
        userId: user.id,
      },
      select: { id: true },
    });

    const validContactIds = contacts.map((c) => c.id);
    const invalidIds = contactIds.filter((id) => !validContactIds.includes(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Some contacts not found: ${invalidIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Get existing associations
    const existingAssociations = await prisma.listContact.findMany({
      where: {
        listId,
        contactId: { in: validContactIds },
      },
      select: { contactId: true },
    });

    const existingIds = new Set(existingAssociations.map((a) => a.contactId));
    const newContactIds = validContactIds.filter((id) => !existingIds.has(id));

    if (newContactIds.length === 0) {
      return NextResponse.json({
        added: 0,
        skipped: validContactIds.length,
        message: 'All contacts are already in this list',
      });
    }

    // Add new associations
    await prisma.listContact.createMany({
      data: newContactIds.map((contactId) => ({
        contactId,
        listId,
      })),
    });

    // Update list contact count
    await prisma.list.update({
      where: { id: listId },
      data: { contactCount: { increment: newContactIds.length } },
    });

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
    const list = await prisma.list.findFirst({
      where: {
        id: listId,
        userId: user.id,
      },
    });

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 });
    }

    const { contactIds } = validation.data;

    // Remove associations
    const result = await prisma.listContact.deleteMany({
      where: {
        listId,
        contactId: { in: contactIds },
      },
    });

    // Update list contact count
    if (result.count > 0) {
      await prisma.list.update({
        where: { id: listId },
        data: { contactCount: { decrement: result.count } },
      });
    }

    return NextResponse.json({
      removed: result.count,
      message: `Removed ${result.count} contacts from the list`,
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
