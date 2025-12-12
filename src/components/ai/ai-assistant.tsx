'use client';

import { useState, useMemo } from 'react';
import DOMPurify from 'dompurify';
import {
  Bot,
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Lightbulb,
  FileText,
  Target,
  BarChart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface AIAssistantProps {
  onInsertSubject?: (subject: string) => void;
  onInsertContent?: (content: {
    subject: string;
    html: string;
    text: string;
  }) => void;
  initialContent?: string;
}

export function AIAssistant({
  onInsertSubject,
  onInsertContent,
  initialContent,
}: AIAssistantProps) {
  const [activeTab, setActiveTab] = useState('subjects');
  const [loading, setLoading] = useState(false);

  // Subject generation state
  const [subjectTopic, setSubjectTopic] = useState('');
  const [subjectTone, setSubjectTone] = useState<string>('professional');
  const [generatedSubjects, setGeneratedSubjects] = useState<string[]>([]);
  const [copiedSubject, setCopiedSubject] = useState<number | null>(null);

  // Content generation state
  const [contentTopic, setContentTopic] = useState('');
  const [contentTone, setContentTone] = useState<string>('professional');
  const [audience, setAudience] = useState('');
  const [callToAction, setCta] = useState('');
  const [generatedContent, setGeneratedContent] = useState<{
    subject: string;
    html: string;
    text: string;
  } | null>(null);

  // Analysis state
  const [contentToAnalyze, setContentToAnalyze] = useState(
    initialContent || ''
  );
  const [analysis, setAnalysis] = useState<{
    score: number;
    suggestions: string[];
    spamRisk: string;
    readabilityLevel: string;
  } | null>(null);

  const generateSubjects = async () => {
    if (!subjectTopic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'subjects',
          topic: subjectTopic,
          tone: subjectTone,
          count: 5,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate subjects');

      const data = await response.json();
      setGeneratedSubjects(data.result);
    } catch (error) {
      toast.error('Failed to generate subject lines');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async () => {
    if (!contentTopic.trim()) {
      toast.error('Please enter a topic');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'content',
          topic: contentTopic,
          tone: contentTone,
          audience: audience || undefined,
          callToAction: callToAction || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate content');

      const data = await response.json();
      setGeneratedContent(data.result);
    } catch (error) {
      toast.error('Failed to generate email content');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeContent = async () => {
    if (!contentToAnalyze.trim()) {
      toast.error('Please enter content to analyze');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          content: contentToAnalyze,
        }),
      });

      if (!response.ok) throw new Error('Failed to analyze content');

      const data = await response.json();
      setAnalysis(data.result);
    } catch (error) {
      toast.error('Failed to analyze content');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedSubject(index);
    setTimeout(() => setCopiedSubject(null), 2000);
    toast.success('Copied to clipboard');
  };

  // Sanitize HTML content to prevent XSS attacks
  const sanitizedHtml = useMemo(() => {
    if (!generatedContent?.html) return '';
    return DOMPurify.sanitize(generatedContent.html, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'em',
        'u',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'a',
        'span',
        'div',
        'img',
        'table',
        'tr',
        'td',
        'th',
        'thead',
        'tbody',
      ],
      ALLOWED_ATTR: [
        'href',
        'src',
        'alt',
        'title',
        'class',
        'style',
        'target',
        'rel',
      ],
      ALLOW_DATA_ATTR: false,
    });
  }, [generatedContent?.html]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-lg">AI Assistant</CardTitle>
            <CardDescription>
              Get help writing and optimizing your emails
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="subjects">
              <Lightbulb className="mr-2 h-4 w-4" />
              Subjects
            </TabsTrigger>
            <TabsTrigger value="content">
              <FileText className="mr-2 h-4 w-4" />
              Content
            </TabsTrigger>
            <TabsTrigger value="analyze">
              <BarChart className="mr-2 h-4 w-4" />
              Analyze
            </TabsTrigger>
          </TabsList>

          {/* Subject Generation Tab */}
          <TabsContent value="subjects" className="space-y-4">
            <div className="space-y-3">
              <Input
                placeholder="Enter your email topic (e.g., Product launch announcement)"
                value={subjectTopic}
                onChange={(e) => setSubjectTopic(e.target.value)}
              />
              <div className="flex gap-2">
                <Select value={subjectTone} onValueChange={setSubjectTone}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={generateSubjects}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Subjects
                </Button>
              </div>
            </div>

            {generatedSubjects.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Generated Subject Lines:</p>
                {generatedSubjects.map((subject, index) => (
                  <div
                    key={index}
                    className="hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm">{subject}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(subject, index)}
                      >
                        {copiedSubject === index ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      {onInsertSubject && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onInsertSubject(subject)}
                        >
                          <Target className="mr-1 h-4 w-4" />
                          Use
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateSubjects}
                  disabled={loading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Content Generation Tab */}
          <TabsContent value="content" className="space-y-4">
            <div className="space-y-3">
              <Input
                placeholder="Email topic (e.g., Welcome new subscribers)"
                value={contentTopic}
                onChange={(e) => setContentTopic(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Target audience (optional)"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                />
                <Input
                  placeholder="Call to action (optional)"
                  value={callToAction}
                  onChange={(e) => setCta(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={contentTone} onValueChange={setContentTone}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={generateContent}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Email
                </Button>
              </div>
            </div>

            {generatedContent && (
              <div className="space-y-3">
                <div className="rounded-lg border p-3">
                  <p className="mb-1 text-sm font-medium">Subject:</p>
                  <p className="text-sm">{generatedContent.subject}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="mb-1 text-sm font-medium">Preview:</p>
                  <div
                    className="prose prose-sm max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateContent}
                    disabled={loading}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                  {onInsertContent && (
                    <Button
                      size="sm"
                      onClick={() => onInsertContent(generatedContent)}
                    >
                      <Target className="mr-2 h-4 w-4" />
                      Use This Email
                    </Button>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analyze" className="space-y-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Paste your email content here to analyze..."
                value={contentToAnalyze}
                onChange={(e) => setContentToAnalyze(e.target.value)}
                rows={6}
              />
              <Button
                onClick={analyzeContent}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <BarChart className="mr-2 h-4 w-4" />
                )}
                Analyze Content
              </Button>
            </div>

            {analysis && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Quality Score</p>
                    <p className="text-3xl font-bold">{analysis.score}/100</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Spam Risk</p>
                    <Badge
                      variant={
                        analysis.spamRisk === 'low'
                          ? 'default'
                          : analysis.spamRisk === 'medium'
                            ? 'secondary'
                            : 'destructive'
                      }
                    >
                      {analysis.spamRisk}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium">Readability</p>
                  <p className="text-muted-foreground text-sm">
                    {analysis.readabilityLevel}
                  </p>
                </div>
                {analysis.suggestions.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Suggestions</p>
                    <ul className="space-y-1">
                      {analysis.suggestions.map((suggestion, index) => (
                        <li
                          key={index}
                          className="text-muted-foreground flex items-start gap-2 text-sm"
                        >
                          <span className="text-primary">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
