import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface EmailBlock {
  id: string;
  type: string;
  content: Record<string, unknown>;
  styles?: Record<string, string>;
}

// POST /api/email-builder/[id]/blocks - Add block to template
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const { type, content, styles, position } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Block type is required' },
        { status: 400 }
      );
    }

    // Get existing template
    const { data: template, error: fetchError } = await supabaseAdmin
      .from('templates')
      .select('html_content')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Parse existing content
    let templateContent = { blocks: [] as EmailBlock[], globalStyles: {} };
    try {
      templateContent = JSON.parse(template.html_content || '{}');
    } catch {
      // Use defaults
    }

    // Create new block
    const newBlock: EmailBlock = {
      id: uuidv4(),
      type,
      content: content || getDefaultContent(type),
      styles: styles || {},
    };

    // Insert at position or end
    const blocks = templateContent.blocks || [];
    if (
      typeof position === 'number' &&
      position >= 0 &&
      position <= blocks.length
    ) {
      blocks.splice(position, 0, newBlock);
    } else {
      blocks.push(newBlock);
    }

    // Update template
    const { error: updateError } = await supabaseAdmin
      .from('templates')
      .update({
        html_content: JSON.stringify({
          ...templateContent,
          blocks,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error adding block:', updateError);
      return NextResponse.json(
        { error: 'Failed to add block' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        block: newBlock,
        position: typeof position === 'number' ? position : blocks.length - 1,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/email-builder/[id]/blocks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/email-builder/[id]/blocks - List all blocks
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const { data: template, error } = await supabaseAdmin
      .from('templates')
      .select('html_content')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    let blocks: EmailBlock[] = [];
    try {
      const content = JSON.parse(template.html_content || '{}');
      blocks = content.blocks || [];
    } catch {
      // Return empty array
    }

    return NextResponse.json({ blocks });
  } catch (error) {
    console.error('Error in GET /api/email-builder/[id]/blocks:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper: Get default content for block type
function getDefaultContent(type: string): Record<string, unknown> {
  switch (type) {
    case 'header':
      return {
        showLogo: true,
        logoUrl: '',
        title: 'Your Company',
        subtitle: 'Tagline goes here',
      };
    case 'text':
      return {
        text: 'Enter your text here...',
        heading: undefined,
      };
    case 'image':
      return {
        src: '',
        alt: 'Image description',
      };
    case 'button':
      return {
        text: 'Click Here',
        link: 'https://example.com',
        variant: 'primary',
      };
    case 'divider':
      return {
        style: 'solid',
        color: '#e5e7eb',
        thickness: '1px',
      };
    case 'spacer':
      return {
        height: '20px',
      };
    case 'hero':
      return {
        title: 'Big Announcement',
        subtitle: 'Discover something amazing',
        backgroundColor: '#000000',
        buttonText: 'Learn More',
        buttonLink: 'https://example.com',
      };
    case 'product':
      return {
        imageUrl: '',
        name: 'Product Name',
        description: 'Product description goes here',
        price: '$99',
        buttonText: 'Buy Now',
        buttonLink: 'https://example.com',
      };
    case 'footer':
      return {
        companyName: 'Your Company',
        address: '123 Main St, City, State 12345',
        showUnsubscribe: true,
        unsubscribeText: 'Unsubscribe',
        copyrightText: '© 2024 Your Company. All rights reserved.',
      };
    default:
      return {};
  }
}
