import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '@/lib/auth';
import {
  checkRateLimit,
  rateLimitHeaders,
  RateLimitPresets,
} from '@/lib/rate-limit';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Rate limiting
    const rateLimit = checkRateLimit(
      `ai-image:${user.id}`,
      RateLimitPresets.aiGeneration
    );
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    // Extract base64 data from data URL
    const base64Match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json(
        { error: 'Invalid image format' },
        { status: 400 }
      );
    }

    const mediaType = `image/${base64Match[1]}` as
      | 'image/jpeg'
      | 'image/png'
      | 'image/gif'
      | 'image/webp';
    const base64Data = base64Match[2];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Analyze this promotional image and extract the following information in JSON format:

{
  "headline": "Main headline or title text",
  "subheadline": "Secondary headline or tagline",
  "bodyText": "Any body text or description",
  "callToAction": "CTA button text if visible",
  "productName": "Product name if this is a product promotion",
  "price": "Price if visible (include currency symbol)",
  "originalPrice": "Original/strikethrough price if visible",
  "discount": "Discount percentage if visible",
  "features": ["List", "of", "product features", "if visible"],
  "colors": ["#hex1", "#hex2", "#hex3"] // Main colors used in the design (max 5)
}

Only include fields that you can clearly identify from the image. Return valid JSON only.`,
            },
          ],
        },
      ],
    });

    // Extract the text content
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'Failed to analyze image' },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let content;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      // If parsing fails, return a basic structure
      content = {
        headline: 'Promotional Content',
        bodyText: textContent.text.substring(0, 200),
      };
    }

    return NextResponse.json({ content });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Image analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    );
  }
}
