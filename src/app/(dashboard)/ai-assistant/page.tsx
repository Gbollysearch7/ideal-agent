'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Send,
  Copy,
  RefreshCw,
  Mail,
  FileText,
  Megaphone,
} from 'lucide-react';

const quickPrompts = [
  {
    icon: Mail,
    title: 'Welcome Email',
    prompt: 'Write a warm welcome email for new subscribers',
  },
  {
    icon: Megaphone,
    title: 'Product Launch',
    prompt: 'Create an exciting product launch announcement email',
  },
  {
    icon: FileText,
    title: 'Newsletter',
    prompt: 'Write a monthly newsletter with industry updates',
  },
];

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setResponse('');

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (res.ok) {
        const data = await res.json();
        setResponse(data.content || 'Generated content will appear here.');
      } else {
        setResponse('Failed to generate content. Please try again.');
      }
    } catch {
      setResponse('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (quickPrompt: string) => {
    setPrompt(quickPrompt);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-4xl font-medium tracking-tight">AI Assistant</h1>
        <p className="text-muted-foreground text-lg">
          Generate email content, subject lines, and more with AI
        </p>
      </div>

      {/* Quick Prompts */}
      <div className="grid gap-4 sm:grid-cols-3">
        {quickPrompts.map((item) => (
          <Card
            key={item.title}
            className="hover:bg-accent cursor-pointer transition-all"
            onClick={() => handleQuickPrompt(item.prompt)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="bg-foreground/5 rounded-lg p-2">
                  <item.icon className="text-foreground/70 h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium tracking-tight">{item.title}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {item.prompt}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Interface */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-medium tracking-tight">
              <Sparkles className="h-5 w-5" />
              Your Prompt
            </CardTitle>
            <CardDescription>
              Describe what you want the AI to write
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="border-input focus:ring-ring h-48 w-full resize-none rounded-lg border bg-transparent p-4 text-sm focus:ring-2 focus:outline-none"
              placeholder="E.g., Write a promotional email for our summer sale with 20% off all products..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <Button
              className="h-12 w-full"
              onClick={handleGenerate}
              disabled={isLoading || !prompt.trim()}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Generate Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-medium tracking-tight">
                  Generated Content
                </CardTitle>
                <CardDescription>
                  AI-generated content based on your prompt
                </CardDescription>
              </div>
              {response && (
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 h-48 w-full overflow-auto rounded-lg p-4">
              {response ? (
                <p className="text-sm whitespace-pre-wrap">{response}</p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Generated content will appear here...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
