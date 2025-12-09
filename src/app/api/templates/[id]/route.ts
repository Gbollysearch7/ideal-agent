import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/templates/[id] - Get a single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const template = await prisma.emailTemplate.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PATCH /api/templates/[id] - Update a template
const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').optional(),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject is too long').optional(),
  htmlContent: z.string().min(1, 'HTML content is required').optional(),
  textContent: z.string().optional(),
  category: z.string().max(50).optional().nullable(),
  thumbnail: z.string().url().optional().nullable(),
  variables: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const validation = updateTemplateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Check if template exists and belongs to user
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const { name, subject, htmlContent, textContent, category, thumbnail, variables } =
      validation.data;

    // Extract variables from HTML content if content changed and variables not provided
    let finalVariables = variables;
    if (htmlContent && !variables) {
      finalVariables = extractVariables(htmlContent);
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(subject && { subject }),
        ...(htmlContent && { htmlContent }),
        ...(textContent !== undefined && { textContent }),
        ...(category !== undefined && { category }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(finalVariables && { variables: finalVariables }),
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/[id] - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Check if template exists and belongs to user
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check if template is being used in any campaigns
    const campaignsUsingTemplate = await prisma.campaign.count({
      where: {
        templateId: id,
      },
    });

    if (campaignsUsingTemplate > 0) {
      return NextResponse.json(
        {
          error: `This template is used by ${campaignsUsingTemplate} campaign(s). Remove it from campaigns before deleting.`,
        },
        { status: 400 }
      );
    }

    await prisma.emailTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

// POST /api/templates/[id]/duplicate - Duplicate a template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Check if template exists and belongs to user
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Create a copy of the template
    const newTemplate = await prisma.emailTemplate.create({
      data: {
        name: `${existingTemplate.name} (Copy)`,
        subject: existingTemplate.subject,
        htmlContent: existingTemplate.htmlContent,
        textContent: existingTemplate.textContent,
        previewText: existingTemplate.previewText,
        thumbnailUrl: existingTemplate.thumbnailUrl,
        isDraft: true,
        userId: user.id,
      },
    });

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error duplicating template:', error);
    return NextResponse.json(
      { error: 'Failed to duplicate template' },
      { status: 500 }
    );
  }
}

// Helper function to extract variables from HTML content
function extractVariables(html: string): string[] {
  const regex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
  const matches = new Set<string>();
  let match;

  while ((match = regex.exec(html)) !== null) {
    matches.add(match[1]);
  }

  return Array.from(matches);
}
