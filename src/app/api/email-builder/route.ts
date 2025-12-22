import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Types for API
interface EmailBlock {
  id: string;
  type: string;
  content: Record<string, unknown>;
  styles?: Record<string, string>;
}

interface EmailTemplate {
  id?: string;
  name: string;
  subject?: string;
  previewText?: string;
  blocks: EmailBlock[];
  globalStyles?: Record<string, string>;
}

// GET /api/email-builder - List all templates
export async function GET(request: Request) {
  try {
    const user = await requireAuth();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const {
      data: templates,
      error,
      count,
    } = await supabaseAdmin
      .from('templates')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      templates: templates || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error in GET /api/email-builder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/email-builder - Create new template
export async function POST(request: Request) {
  try {
    const user = await requireAuth();

    const body: EmailTemplate = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    const templateId = uuidv4();
    const now = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('templates')
      .insert({
        id: templateId,
        user_id: user.id,
        name: body.name,
        subject: body.subject || '',
        preview_text: body.previewText || '',
        html_content: JSON.stringify({
          blocks: body.blocks || [],
          globalStyles: body.globalStyles || {},
        }),
        created_at: now,
        updated_at: now,
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
        id: data.id,
        name: data.name,
        subject: data.subject,
        previewText: data.preview_text,
        blocks: body.blocks || [],
        globalStyles: body.globalStyles || {},
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/email-builder:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
