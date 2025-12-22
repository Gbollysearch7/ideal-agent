import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

interface EmailBlock {
  id: string;
  type: string;
  content: Record<string, unknown>;
  styles?: Record<string, string>;
}

// GET /api/email-builder/[id]/blocks/[blockId] - Get single block
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, blockId } = await params;

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
      // Use empty array
    }

    const block = blocks.find((b) => b.id === blockId);
    if (!block) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    const position = blocks.findIndex((b) => b.id === blockId);

    return NextResponse.json({ block, position });
  } catch (error) {
    console.error(
      'Error in GET /api/email-builder/[id]/blocks/[blockId]:',
      error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/email-builder/[id]/blocks/[blockId] - Update block
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, blockId } = await params;
    const body = await request.json();

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

    let templateContent = { blocks: [] as EmailBlock[], globalStyles: {} };
    try {
      templateContent = JSON.parse(template.html_content || '{}');
    } catch {
      // Use defaults
    }

    const blockIndex = templateContent.blocks.findIndex(
      (b) => b.id === blockId
    );
    if (blockIndex === -1) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    // Update block
    const existingBlock = templateContent.blocks[blockIndex];
    const updatedBlock: EmailBlock = {
      ...existingBlock,
      content:
        body.content !== undefined
          ? { ...existingBlock.content, ...body.content }
          : existingBlock.content,
      styles:
        body.styles !== undefined
          ? { ...existingBlock.styles, ...body.styles }
          : existingBlock.styles,
    };

    templateContent.blocks[blockIndex] = updatedBlock;

    // Save
    const { error: updateError } = await supabaseAdmin
      .from('templates')
      .update({
        html_content: JSON.stringify(templateContent),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating block:', updateError);
      return NextResponse.json(
        { error: 'Failed to update block' },
        { status: 500 }
      );
    }

    return NextResponse.json({ block: updatedBlock });
  } catch (error) {
    console.error(
      'Error in PUT /api/email-builder/[id]/blocks/[blockId]:',
      error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/email-builder/[id]/blocks/[blockId] - Delete block
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, blockId } = await params;

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

    let templateContent = { blocks: [] as EmailBlock[], globalStyles: {} };
    try {
      templateContent = JSON.parse(template.html_content || '{}');
    } catch {
      // Use defaults
    }

    const blockIndex = templateContent.blocks.findIndex(
      (b) => b.id === blockId
    );
    if (blockIndex === -1) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    // Remove block
    templateContent.blocks.splice(blockIndex, 1);

    // Save
    const { error: updateError } = await supabaseAdmin
      .from('templates')
      .update({
        html_content: JSON.stringify(templateContent),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error deleting block:', updateError);
      return NextResponse.json(
        { error: 'Failed to delete block' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      'Error in DELETE /api/email-builder/[id]/blocks/[blockId]:',
      error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/email-builder/[id]/blocks/[blockId] - Move block
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, blockId } = await params;
    const body = await request.json();

    const { position } = body;
    if (typeof position !== 'number') {
      return NextResponse.json(
        { error: 'Position is required' },
        { status: 400 }
      );
    }

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

    let templateContent = { blocks: [] as EmailBlock[], globalStyles: {} };
    try {
      templateContent = JSON.parse(template.html_content || '{}');
    } catch {
      // Use defaults
    }

    const blockIndex = templateContent.blocks.findIndex(
      (b) => b.id === blockId
    );
    if (blockIndex === -1) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    // Move block
    const [block] = templateContent.blocks.splice(blockIndex, 1);
    const newPosition = Math.max(
      0,
      Math.min(position, templateContent.blocks.length)
    );
    templateContent.blocks.splice(newPosition, 0, block);

    // Save
    const { error: updateError } = await supabaseAdmin
      .from('templates')
      .update({
        html_content: JSON.stringify(templateContent),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error moving block:', updateError);
      return NextResponse.json(
        { error: 'Failed to move block' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      block,
      previousPosition: blockIndex,
      newPosition,
    });
  } catch (error) {
    console.error(
      'Error in PATCH /api/email-builder/[id]/blocks/[blockId]:',
      error
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
