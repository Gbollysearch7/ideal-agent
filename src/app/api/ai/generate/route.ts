import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import {
  generateSubjectLines,
  generateEmailContent,
  improveEmailContent,
  analyzeEmailContent,
  generateABTestVariations,
} from '@/lib/ai';
import {
  checkRateLimit,
  rateLimitHeaders,
  RateLimitPresets,
} from '@/lib/rate-limit';

const generateSchema = z.object({
  action: z.enum(['subjects', 'content', 'improve', 'analyze', 'abtest']),
  // For subject generation
  topic: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'urgent', 'friendly']).optional(),
  count: z.number().min(1).max(10).optional(),
  // For content generation
  audience: z.string().optional(),
  callToAction: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  // For improvement
  content: z.string().optional(),
  improvement: z
    .enum(['clarity', 'engagement', 'persuasion', 'brevity', 'tone'])
    .optional(),
  // For A/B testing
  element: z.enum(['subject', 'cta', 'opening', 'full']).optional(),
  variations: z.number().min(1).max(5).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    // Rate limiting for AI generation
    const rateLimit = checkRateLimit(
      `ai:${user.id}`,
      RateLimitPresets.aiGeneration
    );
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error:
            'Too many AI generation requests. Please wait before trying again.',
        },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();

    const validation = generateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { action, ...params } = validation.data;

    let result: any;

    switch (action) {
      case 'subjects':
        if (!params.topic) {
          return NextResponse.json(
            { error: 'Topic is required for subject generation' },
            { status: 400 }
          );
        }
        result = await generateSubjectLines(
          params.topic,
          params.tone || 'professional',
          params.count || 5
        );
        break;

      case 'content':
        if (!params.topic) {
          return NextResponse.json(
            { error: 'Topic is required for content generation' },
            { status: 400 }
          );
        }
        result = await generateEmailContent(params.topic, {
          audience: params.audience,
          tone: params.tone,
          callToAction: params.callToAction,
          keyPoints: params.keyPoints,
        });
        break;

      case 'improve':
        if (!params.content || !params.improvement) {
          return NextResponse.json(
            { error: 'Content and improvement type are required' },
            { status: 400 }
          );
        }
        result = await improveEmailContent(params.content, params.improvement);
        break;

      case 'analyze':
        if (!params.content) {
          return NextResponse.json(
            { error: 'Content is required for analysis' },
            { status: 400 }
          );
        }
        result = await analyzeEmailContent(params.content);
        break;

      case 'abtest':
        if (!params.content || !params.element) {
          return NextResponse.json(
            {
              error: 'Content and element are required for A/B test generation',
            },
            { status: 400 }
          );
        }
        result = await generateABTestVariations(
          params.content,
          params.element,
          params.variations || 2
        );
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('AI generation error:', error);
    return NextResponse.json(
      { error: 'AI generation failed' },
      { status: 500 }
    );
  }
}
