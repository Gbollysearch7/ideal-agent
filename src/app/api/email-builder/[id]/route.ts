import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

interface EmailBlock {
  id: string;
  type: string;
  content: Record<string, unknown>;
  styles?: Record<string, string>;
}

interface UpdateTemplateBody {
  name?: string;
  subject?: string;
  previewText?: string;
  blocks?: EmailBlock[];
  globalStyles?: Record<string, string>;
}

// GET /api/email-builder/[id] - Get single template
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const { data: template, error } = await supabaseAdmin
      .from('templates')
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

    // Parse stored JSON content
    let blocks: EmailBlock[] = [];
    let globalStyles = {};
    try {
      const content = JSON.parse(template.html_content || '{}');
      blocks = content.blocks || [];
      globalStyles = content.globalStyles || {};
    } catch {
      // If parsing fails, content might be raw HTML
    }

    return NextResponse.json({
      id: template.id,
      name: template.name,
      subject: template.subject,
      previewText: template.preview_text,
      blocks,
      globalStyles,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    });
  } catch (error) {
    console.error('Error in GET /api/email-builder/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/email-builder/[id] - Update template
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body: UpdateTemplateBody = await request.json();

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from('templates')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.previewText !== undefined)
      updateData.preview_text = body.previewText;
    if (body.blocks !== undefined || body.globalStyles !== undefined) {
      updateData.html_content = JSON.stringify({
        blocks: body.blocks || [],
        globalStyles: body.globalStyles || {},
      });
    }

    const { data, error } = await supabaseAdmin
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      return NextResponse.json(
        { error: 'Failed to update template' },
        { status: 500 }
      );
    }

    // Parse updated content
    let blocks: EmailBlock[] = [];
    let globalStyles = {};
    try {
      const content = JSON.parse(data.html_content || '{}');
      blocks = content.blocks || [];
      globalStyles = content.globalStyles || {};
    } catch {
      // Handle parse error
    }

    return NextResponse.json({
      id: data.id,
      name: data.name,
      subject: data.subject,
      previewText: data.preview_text,
      blocks,
      globalStyles,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('Error in PUT /api/email-builder/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/email-builder/[id] - Delete template
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting template:', error);
      return NextResponse.json(
        { error: 'Failed to delete template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/email-builder/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
