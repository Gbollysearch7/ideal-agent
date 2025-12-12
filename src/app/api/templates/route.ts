import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin, createSearchFilter } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth';

// GET /api/templates - List all templates with pagination
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

    // Filter by draft status
    const isDraft = searchParams.get('isDraft');

    // Build query
    let query = supabaseAdmin
      .from('email_templates')
      .select(
        'id, name, subject, preview_text, thumbnail_url, is_draft, created_at, updated_at',
        {
          count: 'exact',
        }
      )
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      const searchFilter = createSearchFilter(['name', 'subject'], search);
      if (searchFilter) {
        query = query.or(searchFilter);
      }
    }

    if (isDraft !== null && isDraft !== undefined) {
      query = query.eq('is_draft', isDraft === 'true');
    }

    const { data: templates, count: total, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      templates: (templates || []).map((t) => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        previewText: t.preview_text,
        thumbnailUrl: t.thumbnail_url,
        isDraft: t.is_draft,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
      })),
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create a new template
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject is too long'),
  htmlContent: z.string().min(1, 'HTML content is required'),
  textContent: z.string().optional(),
  previewText: z.string().max(200).optional(),
  thumbnailUrl: z.string().url().optional(),
  isDraft: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const validation = createTemplateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const {
      name,
      subject,
      htmlContent,
      textContent,
      previewText,
      thumbnailUrl,
      isDraft,
    } = validation.data;

    // Generate template ID
    const templateId = `tpl_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;

    const { data: template, error } = await supabaseAdmin
      .from('email_templates')
      .insert({
        id: templateId,
        name,
        subject,
        html_content: htmlContent,
        text_content: textContent || generateTextContent(htmlContent),
        preview_text: previewText || null,
        thumbnail_url: thumbnailUrl || null,
        is_draft: isDraft ?? true,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        id: template.id,
        name: template.name,
        subject: template.subject,
        htmlContent: template.html_content,
        textContent: template.text_content,
        previewText: template.preview_text,
        thumbnailUrl: template.thumbnail_url,
        isDraft: template.is_draft,
        userId: template.user_id,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

// Helper function to generate text content from HTML
function generateTextContent(html: string): string {
  // Remove HTML tags but keep text content
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
