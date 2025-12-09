import Anthropic from '@anthropic-ai/sdk';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AIGenerationOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * Generate email subject lines
 */
export async function generateSubjectLines(
  topic: string,
  tone: 'professional' | 'casual' | 'urgent' | 'friendly' = 'professional',
  count: number = 5
): Promise<string[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [
      {
        role: 'user',
        content: `Generate ${count} email subject lines for the following topic. The tone should be ${tone}.

Topic: ${topic}

Requirements:
- Keep each subject line under 60 characters
- Make them attention-grabbing and compelling
- Avoid spam trigger words
- Use action verbs when appropriate

Return only the subject lines, one per line, numbered 1-${count}.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  // Parse the numbered list
  const lines = content.text
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter((line) => line.length > 0);

  return lines.slice(0, count);
}

/**
 * Generate email content
 */
export async function generateEmailContent(
  topic: string,
  details: {
    audience?: string;
    tone?: string;
    callToAction?: string;
    keyPoints?: string[];
  },
  options: AIGenerationOptions = {}
): Promise<{ subject: string; html: string; text: string }> {
  const { audience, tone = 'professional', callToAction, keyPoints } = details;
  const { maxTokens = 2000, temperature = 0.7 } = options;

  const prompt = `Generate an email for the following:

Topic: ${topic}
${audience ? `Target Audience: ${audience}` : ''}
Tone: ${tone}
${callToAction ? `Call to Action: ${callToAction}` : ''}
${keyPoints && keyPoints.length > 0 ? `Key Points to Include:\n${keyPoints.map((p) => `- ${p}`).join('\n')}` : ''}

Return the email in the following JSON format:
{
  "subject": "The email subject line",
  "html": "The HTML email content with proper formatting (use <p>, <h2>, <ul>, <li>, <a> tags)",
  "text": "The plain text version of the email"
}

Requirements:
- Keep the subject under 60 characters
- Use a clear structure with introduction, body, and conclusion
- Include a clear call-to-action
- Make it engaging and on-brand
- Include {{firstName}} personalization where appropriate
- Include an unsubscribe placeholder: {{unsubscribeUrl}}`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    temperature,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  // Parse the JSON response
  try {
    // Extract JSON from the response (it might be wrapped in markdown code blocks)
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Failed to parse AI response:', content.text);
    throw new Error('Failed to parse AI response');
  }
}

/**
 * Improve existing email content
 */
export async function improveEmailContent(
  currentContent: string,
  improvement: 'clarity' | 'engagement' | 'persuasion' | 'brevity' | 'tone',
  options: AIGenerationOptions = {}
): Promise<string> {
  const { maxTokens = 2000, temperature = 0.7 } = options;

  const improvementInstructions: Record<string, string> = {
    clarity: 'Make the email clearer and easier to understand',
    engagement: 'Make the email more engaging and interesting to read',
    persuasion: 'Make the email more persuasive and compelling',
    brevity: 'Make the email more concise while keeping the key message',
    tone: 'Make the tone more professional and polished',
  };

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    temperature,
    messages: [
      {
        role: 'user',
        content: `Improve the following email content. Focus on: ${improvementInstructions[improvement]}

Current Email:
${currentContent}

Return only the improved HTML email content. Preserve any template variables like {{firstName}} and {{unsubscribeUrl}}.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return content.text;
}

/**
 * Analyze email content for improvements
 */
export async function analyzeEmailContent(content: string): Promise<{
  score: number;
  suggestions: string[];
  spamRisk: 'low' | 'medium' | 'high';
  readabilityLevel: string;
}> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: `Analyze the following email content and provide feedback:

${content}

Return your analysis in the following JSON format:
{
  "score": <number from 1-100 representing overall email quality>,
  "suggestions": [<list of specific improvement suggestions>],
  "spamRisk": "<low|medium|high>",
  "readabilityLevel": "<grade level or description>"
}`,
      },
    ],
  });

  const responseContent = response.content[0];
  if (responseContent.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  try {
    const jsonMatch = responseContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Failed to parse AI response:', responseContent.text);
    throw new Error('Failed to parse AI response');
  }
}

/**
 * Generate A/B test variations
 */
export async function generateABTestVariations(
  originalContent: string,
  element: 'subject' | 'cta' | 'opening' | 'full',
  variations: number = 2
): Promise<string[]> {
  const elementInstructions: Record<string, string> = {
    subject: 'Generate alternative subject lines',
    cta: 'Generate alternative call-to-action text and buttons',
    opening: 'Generate alternative opening paragraphs',
    full: 'Generate alternative versions of the entire email',
  };

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `${elementInstructions[element]} for A/B testing.

Original:
${originalContent}

Generate ${variations} alternative versions. Keep the same overall message but try different approaches.

Return as a JSON array of strings:
["variation 1", "variation 2", ...]`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  try {
    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Failed to parse AI response:', content.text);
    throw new Error('Failed to parse AI response');
  }
}
