'use client';

import { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Wand2,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SubjectVariation {
  id: string;
  subject: string;
  previewText: string;
  tone: string;
  emojiUsage: boolean;
}

interface ContentVariation {
  id: string;
  name: string;
  headline: string;
  bodyText: string;
  ctaText: string;
  tone: string;
}

interface AIVariationsProps {
  currentSubject?: string;
  currentPreviewText?: string;
  currentContent?: string;
  onApplySubject?: (subject: string, previewText: string) => void;
  onApplyContent?: (
    headline: string,
    bodyText: string,
    ctaText: string
  ) => void;
}

export function AIVariations({
  currentSubject,
  currentPreviewText,
  currentContent,
  onApplySubject,
  onApplyContent,
}: AIVariationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'subjects' | 'content'>(
    'subjects'
  );

  // Subject variations state
  const [subjectTopic, setSubjectTopic] = useState('');
  const [subjectTone, setSubjectTone] = useState<
    'professional' | 'casual' | 'urgent' | 'friendly'
  >('professional');
  const [subjectCount, setSubjectCount] = useState(5);
  const [subjectVariations, setSubjectVariations] = useState<
    SubjectVariation[]
  >([]);
  const [isGeneratingSubjects, setIsGeneratingSubjects] = useState(false);
  const [copiedSubjectId, setCopiedSubjectId] = useState<string | null>(null);

  // Content variations state
  const [contentTopic, setContentTopic] = useState('');
  const [contentTone, setContentTone] = useState<
    'professional' | 'casual' | 'urgent' | 'friendly'
  >('professional');
  const [contentAudience, setContentAudience] = useState('');
  const [contentVariations, setContentVariations] = useState<
    ContentVariation[]
  >([]);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  const generateSubjectVariations = async () => {
    if (!subjectTopic.trim()) {
      toast.error('Please enter a topic for subject line generation');
      return;
    }

    setIsGeneratingSubjects(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subjects',
          topic: subjectTopic,
          tone: subjectTone,
          count: subjectCount,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate subjects');
      }

      const data = await response.json();
      const variations: SubjectVariation[] = (data.result || []).map(
        (item: { subject: string; previewText?: string }, index: number) => ({
          id: `subject_${Date.now()}_${index}`,
          subject: item.subject,
          previewText: item.previewText || generatePreviewText(item.subject),
          tone: subjectTone,
          emojiUsage: item.subject.match(/[\u{1F600}-\u{1F64F}]/gu) !== null,
        })
      );

      setSubjectVariations(variations);
      toast.success(`Generated ${variations.length} subject line variations`);
    } catch (error) {
      toast.error('Failed to generate subject lines');
      // Demo fallback
      setSubjectVariations([
        {
          id: '1',
          subject: `${subjectTopic} - Don't Miss Out!`,
          previewText: 'Limited time offer just for you',
          tone: subjectTone,
          emojiUsage: false,
        },
        {
          id: '2',
          subject: `Your Exclusive ${subjectTopic} Awaits`,
          previewText: 'Open to discover something special',
          tone: subjectTone,
          emojiUsage: false,
        },
        {
          id: '3',
          subject: `[Action Required] ${subjectTopic}`,
          previewText: 'Time-sensitive opportunity inside',
          tone: subjectTone,
          emojiUsage: false,
        },
      ]);
    } finally {
      setIsGeneratingSubjects(false);
    }
  };

  const generateContentVariations = async () => {
    if (!contentTopic.trim()) {
      toast.error('Please enter a topic for content generation');
      return;
    }

    setIsGeneratingContent(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'content',
          topic: contentTopic,
          tone: contentTone,
          audience: contentAudience || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();

      // Generate 3 variations with different approaches
      const variations: ContentVariation[] = [
        {
          id: '1',
          name: 'Direct Approach',
          headline: data.result?.headline || `Discover ${contentTopic}`,
          bodyText: data.result?.body || 'Your compelling message goes here.',
          ctaText: data.result?.cta || 'Learn More',
          tone: contentTone,
        },
        {
          id: '2',
          name: 'Story-driven',
          headline:
            data.result?.headline?.replace(/^/, 'The Story of ') ||
            `The ${contentTopic} Journey`,
          bodyText: `Imagine this: ${data.result?.body || 'A transformative experience awaits.'}`,
          ctaText: 'Start Your Journey',
          tone: contentTone,
        },
        {
          id: '3',
          name: 'Benefit-focused',
          headline: `Why ${contentTopic} Matters`,
          bodyText: `Here's what you'll get: ${data.result?.body || 'Incredible value and results.'}`,
          ctaText: 'Get Started Now',
          tone: contentTone,
        },
      ];

      setContentVariations(variations);
      toast.success('Generated 3 content variations');
    } catch (error) {
      toast.error('Failed to generate content');
      // Demo fallback
      setContentVariations([
        {
          id: '1',
          name: 'Direct Approach',
          headline: `Introducing ${contentTopic}`,
          bodyText:
            'Discover how this can transform your experience. Our solution is designed with you in mind.',
          ctaText: 'Learn More',
          tone: contentTone,
        },
        {
          id: '2',
          name: 'Story-driven',
          headline: `The ${contentTopic} Revolution`,
          bodyText:
            "Imagine a world where everything just works. That's what we're building, and you're invited.",
          ctaText: 'Join the Movement',
          tone: contentTone,
        },
        {
          id: '3',
          name: 'Benefit-focused',
          headline: `Why You Need ${contentTopic}`,
          bodyText:
            "Save time. Reduce stress. Get results. Here's everything you need to succeed.",
          ctaText: 'Get Started Free',
          tone: contentTone,
        },
      ]);
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const generatePreviewText = (subject: string): string => {
    // Generate a complementary preview text based on the subject
    const base = subject.replace(/[^\w\s]/g, '').toLowerCase();
    return `Open to learn more about ${base.substring(0, 30)}...`;
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSubjectId(id);
    setTimeout(() => setCopiedSubjectId(null), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Variations
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-violet-500" />
            AI Content Variations
          </SheetTitle>
          <SheetDescription>
            Generate multiple variations of subject lines and email content
          </SheetDescription>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'subjects' | 'content')}
          className="mt-6"
        >
          <TabsList className="w-full">
            <TabsTrigger value="subjects" className="flex-1 gap-2">
              <Mail className="h-4 w-4" />
              Subject Lines
            </TabsTrigger>
            <TabsTrigger value="content" className="flex-1 gap-2">
              <MessageSquare className="h-4 w-4" />
              Content
            </TabsTrigger>
          </TabsList>

          {/* Subject Line Variations */}
          <TabsContent value="subjects" className="mt-4 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Topic or Theme</Label>
                <Input
                  value={subjectTopic}
                  onChange={(e) => setSubjectTopic(e.target.value)}
                  placeholder="e.g., Summer sale, Product launch, Newsletter"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select
                    value={subjectTone}
                    onValueChange={(v) =>
                      setSubjectTone(v as typeof subjectTone)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Count</Label>
                  <Select
                    value={String(subjectCount)}
                    onValueChange={(v) => setSubjectCount(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 variations</SelectItem>
                      <SelectItem value="5">5 variations</SelectItem>
                      <SelectItem value="10">10 variations</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={generateSubjectVariations}
                disabled={isGeneratingSubjects}
                className="w-full gap-2"
              >
                {isGeneratingSubjects ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Variations
                  </>
                )}
              </Button>
            </div>

            {subjectVariations.length > 0 && (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-4">
                  {subjectVariations.map((variation, index) => (
                    <Card
                      key={variation.id}
                      className="cursor-pointer transition-colors hover:bg-stone-800/50"
                    >
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-start justify-between">
                          <Badge variant="outline" className="text-xs">
                            Option {index + 1}
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                copyToClipboard(variation.subject, variation.id)
                              }
                            >
                              {copiedSubjectId === variation.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                        <p className="mb-1 font-medium">{variation.subject}</p>
                        <p className="text-muted-foreground text-sm">
                          {variation.previewText}
                        </p>
                        {onApplySubject && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() => {
                              onApplySubject(
                                variation.subject,
                                variation.previewText
                              );
                              toast.success('Subject line applied');
                            }}
                          >
                            Use This Subject
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Content Variations */}
          <TabsContent value="content" className="mt-4 space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Topic or Product</Label>
                <Input
                  value={contentTopic}
                  onChange={(e) => setContentTopic(e.target.value)}
                  placeholder="e.g., New feature, Sale announcement, Event invitation"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select
                    value={contentTone}
                    onValueChange={(v) =>
                      setContentTone(v as typeof contentTone)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Input
                    value={contentAudience}
                    onChange={(e) => setContentAudience(e.target.value)}
                    placeholder="e.g., Developers, Marketers"
                  />
                </div>
              </div>

              <Button
                onClick={generateContentVariations}
                disabled={isGeneratingContent}
                className="w-full gap-2"
              >
                {isGeneratingContent ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Content Variations
                  </>
                )}
              </Button>
            </div>

            {contentVariations.length > 0 && (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3 pr-4">
                  {contentVariations.map((variation) => (
                    <Card
                      key={variation.id}
                      className="transition-colors hover:bg-stone-800/50"
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">
                          {variation.name}
                        </CardTitle>
                        <CardDescription className="text-xs capitalize">
                          {variation.tone} tone
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <Label className="text-muted-foreground text-xs">
                            Headline
                          </Label>
                          <p className="font-medium">{variation.headline}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">
                            Body
                          </Label>
                          <p className="text-sm">{variation.bodyText}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground text-xs">
                            CTA
                          </Label>
                          <Badge>{variation.ctaText}</Badge>
                        </div>
                        {onApplyContent && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={() => {
                              onApplyContent(
                                variation.headline,
                                variation.bodyText,
                                variation.ctaText
                              );
                              toast.success('Content applied');
                            }}
                          >
                            Use This Content
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
