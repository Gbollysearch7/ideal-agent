'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Loader2,
  Sparkles,
  X,
  Check,
  Image as ImageIcon,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { EmailBlock, BlockType } from './types';

interface ExtractedContent {
  headline?: string;
  subheadline?: string;
  bodyText?: string;
  callToAction?: string;
  productName?: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  features?: string[];
  colors?: string[];
  suggestedBlocks?: BlockType[];
}

interface AIImageImportProps {
  onImport: (blocks: EmailBlock[], imageUrl: string) => void;
}

export function AIImageImport({ onImport }: AIImageImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedContent, setExtractedContent] =
    useState<ExtractedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setExtractedContent(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const analyzeImage = async () => {
    if (!imageFile || !imagePreview) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imagePreview,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const data = await response.json();
      setExtractedContent(data.content);
      toast.success('Image analyzed successfully!');
    } catch {
      toast.error('Failed to analyze image. Please try again.');
      // For demo, set mock data
      setExtractedContent({
        headline: 'Summer Sale',
        subheadline: 'Up to 50% Off Everything',
        bodyText: 'Shop our biggest sale of the season. Limited time only!',
        callToAction: 'Shop Now',
        discount: '50%',
        colors: ['#ff6b6b', '#4ecdc4', '#ffffff'],
        suggestedBlocks: ['hero', 'text', 'button', 'footer'],
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateEmailFromContent = async () => {
    if (!extractedContent) return;

    setIsGenerating(true);
    try {
      // Generate blocks based on extracted content
      const blocks: EmailBlock[] = [];
      const generateId = () =>
        `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add hero block if headline exists
      if (extractedContent.headline) {
        blocks.push({
          id: generateId(),
          type: 'hero',
          content: {
            title: extractedContent.headline,
            subtitle: extractedContent.subheadline || '',
            backgroundColor: extractedContent.colors?.[0] || '#000000',
            buttonText: extractedContent.callToAction || 'Learn More',
            buttonLink: 'https://example.com',
          },
        });
      }

      // Add text block if body text exists
      if (extractedContent.bodyText) {
        blocks.push({
          id: generateId(),
          type: 'text',
          content: {
            text: extractedContent.bodyText,
          },
        });
      }

      // Add product block if product info exists
      if (extractedContent.productName || extractedContent.price) {
        blocks.push({
          id: generateId(),
          type: 'product',
          content: {
            imageUrl: imagePreview || '',
            name: extractedContent.productName || 'Product',
            description: extractedContent.features?.join('. ') || '',
            price: extractedContent.price || '',
            originalPrice: extractedContent.originalPrice,
            buttonText: extractedContent.callToAction || 'Buy Now',
            buttonLink: 'https://example.com',
          },
        });
      }

      // Add CTA button
      if (extractedContent.callToAction && !extractedContent.productName) {
        blocks.push({
          id: generateId(),
          type: 'button',
          content: {
            text: extractedContent.callToAction,
            link: 'https://example.com',
            variant: 'primary',
          },
          styles: {
            buttonColor: extractedContent.colors?.[0] || '#000000',
          },
        });
      }

      // Add footer
      blocks.push({
        id: generateId(),
        type: 'footer',
        content: {
          companyName: 'Your Company',
          address: '123 Main St, City, State 12345',
          showUnsubscribe: true,
          unsubscribeText: 'Unsubscribe',
          copyrightText: '© 2024 Your Company. All rights reserved.',
        },
      });

      onImport(blocks, imagePreview || '');
      setIsOpen(false);
      resetState();
      toast.success('Email generated from image!');
    } catch (error) {
      toast.error('Failed to generate email');
    } finally {
      setIsGenerating(false);
    }
  };

  const resetState = () => {
    setImageFile(null);
    setImagePreview(null);
    setExtractedContent(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Wand2 className="h-4 w-4" />
          Import from Image
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            AI Image Import
          </DialogTitle>
          <DialogDescription>
            Upload a promotional graphic and our AI will extract the content and
            create an email template.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 lg:grid-cols-2">
          {/* Left: Image Upload */}
          <div className="space-y-4">
            {!imagePreview ? (
              <div
                {...getRootProps()}
                className={cn(
                  'flex h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
                  isDragActive
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-stone-700 hover:border-stone-600'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="mb-4 h-10 w-10 text-stone-500" />
                <p className="mb-1 text-sm font-medium">Drop your image here</p>
                <p className="text-muted-foreground text-xs">
                  or click to browse (PNG, JPG, up to 10MB)
                </p>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Uploaded preview"
                  className="h-64 w-full rounded-lg object-cover"
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={resetState}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {imagePreview && !extractedContent && (
              <Button
                onClick={analyzeImage}
                disabled={isAnalyzing}
                className="w-full gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze Image with AI
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Right: Extracted Content */}
          <div className="space-y-4">
            {extractedContent ? (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Check className="h-4 w-4 text-green-500" />
                      Extracted Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {extractedContent.headline && (
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Headline
                        </Label>
                        <p className="font-medium">
                          {extractedContent.headline}
                        </p>
                      </div>
                    )}
                    {extractedContent.subheadline && (
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Subheadline
                        </Label>
                        <p className="text-sm">
                          {extractedContent.subheadline}
                        </p>
                      </div>
                    )}
                    {extractedContent.bodyText && (
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Body Text
                        </Label>
                        <p className="text-sm">{extractedContent.bodyText}</p>
                      </div>
                    )}
                    {extractedContent.callToAction && (
                      <div>
                        <Label className="text-muted-foreground text-xs">
                          Call to Action
                        </Label>
                        <Badge>{extractedContent.callToAction}</Badge>
                      </div>
                    )}
                    {extractedContent.price && (
                      <div className="flex gap-4">
                        <div>
                          <Label className="text-muted-foreground text-xs">
                            Price
                          </Label>
                          <p className="font-bold text-green-500">
                            {extractedContent.price}
                          </p>
                        </div>
                        {extractedContent.originalPrice && (
                          <div>
                            <Label className="text-muted-foreground text-xs">
                              Original
                            </Label>
                            <p className="text-muted-foreground line-through">
                              {extractedContent.originalPrice}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {extractedContent.colors &&
                      extractedContent.colors.length > 0 && (
                        <div>
                          <Label className="text-muted-foreground text-xs">
                            Detected Colors
                          </Label>
                          <div className="mt-1 flex gap-2">
                            {extractedContent.colors.map((color, i) => (
                              <div
                                key={i}
                                className="h-6 w-6 rounded-full border border-stone-600"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>

                <Button
                  onClick={generateEmailFromContent}
                  disabled={isGenerating}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating Email...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      Generate Email Template
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <ImageIcon className="mb-4 h-12 w-12 text-stone-600" />
                <p className="text-muted-foreground text-sm">
                  Upload an image and click &quot;Analyze&quot; to extract
                  content
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
