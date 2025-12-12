import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// GET /api/templates/[id] - Get a single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const { data: template, error } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: template.id,
      name: template.name,
      subject: template.subject,
      htmlContent: template.html_content,
      textContent: template.text_content,
      previewText: template.preview_text,
      thumbnailUrl: template.thumbnail_url,
      isDraft: template.is_draft,
      category: template.category,
      variables: template.variables,
      userId: template.user_id,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    });
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
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long')
    .optional(),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject is too long')
    .optional(),
  htmlContent: z.string().min(1, 'HTML content is required').optional(),
  textContent: z.string().optional(),
  previewText: z.string().max(200).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  isDraft: z.boolean().optional(),
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
    const { data: existingTemplate, error: fetchError } = await supabaseAdmin
      .from('email_templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const {
      name,
      subject,
      htmlContent,
      textContent,
      previewText,
      category,
      thumbnailUrl,
      isDraft,
      variables,
    } = validation.data;

    // Extract variables from HTML content if content changed and variables not provided
    let finalVariables = variables;
    if (htmlContent && !variables) {
      finalVariables = extractVariables(htmlContent);
    }

    // Build update data object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name) updateData.name = name;
    if (subject) updateData.subject = subject;
    if (htmlContent) updateData.html_content = htmlContent;
    if (textContent !== undefined) updateData.text_content = textContent;
    if (previewText !== undefined) updateData.preview_text = previewText;
    if (category !== undefined) updateData.category = category;
    if (thumbnailUrl !== undefined) updateData.thumbnail_url = thumbnailUrl;
    if (isDraft !== undefined) updateData.is_draft = isDraft;
    if (finalVariables) updateData.variables = finalVariables;

    const { data: template, error: updateError } = await supabaseAdmin
      .from('email_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating template:', updateError);
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: template.id,
      name: template.name,
      subject: template.subject,
      htmlContent: template.html_content,
      textContent: template.text_content,
      previewText: template.preview_text,
      thumbnailUrl: template.thumbnail_url,
      isDraft: template.is_draft,
      category: template.category,
      variables: template.variables,
      userId: template.user_id,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    });
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
    const { data: existingTemplate, error: fetchError } = await supabaseAdmin
      .from('email_templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check if template is being used in any campaigns
    const { count: campaignsUsingTemplate } = await supabaseAdmin
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('template_id', id);

    if (campaignsUsingTemplate && campaignsUsingTemplate > 0) {
      return NextResponse.json(
        {
          error: `This template is used by ${campaignsUsingTemplate} campaign(s). Remove it from campaigns before deleting.`,
        },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('email_templates')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting template:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }

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
    const { data: existingTemplate, error: fetchError } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Generate new template ID
    const newTemplateId = `tpl_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

    // Create a copy of the template
    const { data: newTemplate, error: createError } = await supabaseAdmin
      .from('email_templates')
      .insert({
        id: newTemplateId,
        name: `${existingTemplate.name} (Copy)`,
        subject: existingTemplate.subject,
        html_content: existingTemplate.html_content,
        text_content: existingTemplate.text_content,
        preview_text: existingTemplate.preview_text,
        thumbnail_url: existingTemplate.thumbnail_url,
        is_draft: true,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Error duplicating template:', createError);
      return NextResponse.json(
        { error: 'Failed to duplicate template' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: newTemplate.id,
        name: newTemplate.name,
        subject: newTemplate.subject,
        htmlContent: newTemplate.html_content,
        textContent: newTemplate.text_content,
        previewText: newTemplate.preview_text,
        thumbnailUrl: newTemplate.thumbnail_url,
        isDraft: newTemplate.is_draft,
        userId: newTemplate.user_id,
        createdAt: newTemplate.created_at,
        updatedAt: newTemplate.updated_at,
      },
      { status: 201 }
    );
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
