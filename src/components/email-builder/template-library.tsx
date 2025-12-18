'use client';

import { useState } from 'react';
import {
  LayoutTemplate,
  ShoppingBag,
  Calendar,
  Megaphone,
  PartyPopper,
  Bell,
  Receipt,
  UserPlus,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { EmailBlock, EmailTemplate, DEFAULT_GLOBAL_STYLES } from './types';

interface TemplateOption {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  thumbnail?: string;
  blocks: EmailBlock[];
  globalStyles?: Partial<EmailTemplate['globalStyles']>;
}

// Generate unique IDs for template blocks
const genId = () =>
  `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const PRE_BUILT_TEMPLATES: TemplateOption[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    category: 'Onboarding',
    description: 'A warm welcome for new subscribers',
    icon: <UserPlus className="h-5 w-5" />,
    blocks: [
      {
        id: genId(),
        type: 'header',
        content: {
          showLogo: true,
          logoUrl: '',
          title: 'Welcome to {{companyName}}',
          subtitle: "We're thrilled to have you!",
        },
        styles: { textAlign: 'center', padding: '30px 20px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: "Hi {{firstName}},<br><br>Thank you for joining us! We're excited to have you as part of our community.<br><br>Here's what you can expect from us:",
          heading: undefined,
        },
        styles: { padding: '20px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: '✓ Exclusive offers and promotions<br>✓ Early access to new features<br>✓ Helpful tips and resources<br>✓ Community updates',
        },
        styles: { padding: '10px 20px 20px' },
      },
      {
        id: genId(),
        type: 'button',
        content: {
          text: 'Get Started',
          link: 'https://example.com/dashboard',
          variant: 'primary',
        },
        styles: { textAlign: 'center', padding: '20px' },
      },
      {
        id: genId(),
        type: 'divider',
        content: { style: 'solid', color: '#e5e7eb', thickness: '1px' },
      },
      {
        id: genId(),
        type: 'footer',
        content: {
          companyName: '{{companyName}}',
          address: '{{companyAddress}}',
          showUnsubscribe: true,
          copyrightText: '© {{year}} {{companyName}}. All rights reserved.',
        },
      },
    ],
  },
  {
    id: 'sale',
    name: 'Sale Announcement',
    category: 'Promotional',
    description: 'Announce a sale or discount',
    icon: <ShoppingBag className="h-5 w-5" />,
    blocks: [
      {
        id: genId(),
        type: 'hero',
        content: {
          title: 'SUMMER SALE',
          subtitle: 'Up to 50% off everything',
          backgroundColor: '#ef4444',
          buttonText: 'Shop Now',
          buttonLink: 'https://example.com/sale',
        },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: "Hi {{firstName}},<br><br>Our biggest sale of the season is here! Don't miss out on incredible savings across all categories.",
          heading: 'h2',
        },
        styles: { padding: '30px 20px 10px', textAlign: 'center' },
      },
      {
        id: genId(),
        type: 'spacer',
        content: { height: '20px' },
      },
      {
        id: genId(),
        type: 'product',
        content: {
          imageUrl: '',
          name: 'Featured Product',
          description: 'Best seller - limited stock',
          price: '$49.99',
          originalPrice: '$99.99',
          buttonText: 'Buy Now',
          buttonLink: 'https://example.com/product',
        },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: '⏰ Sale ends Sunday at midnight!',
        },
        styles: { textAlign: 'center', padding: '20px', fontWeight: '600' },
      },
      {
        id: genId(),
        type: 'footer',
        content: {
          companyName: '{{companyName}}',
          showUnsubscribe: true,
          copyrightText: '© {{year}} {{companyName}}',
        },
      },
    ],
    globalStyles: { primaryColor: '#ef4444' },
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    category: 'Content',
    description: 'Regular newsletter layout',
    icon: <Megaphone className="h-5 w-5" />,
    blocks: [
      {
        id: genId(),
        type: 'header',
        content: {
          showLogo: true,
          title: 'Monthly Newsletter',
          subtitle: '{{month}} Edition',
        },
        styles: {
          textAlign: 'center',
          padding: '30px 20px',
          backgroundColor: '#f9fafb',
        },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: "This Month's Highlights",
          heading: 'h2',
        },
        styles: { padding: '30px 20px 10px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        },
        styles: { padding: '10px 20px' },
      },
      {
        id: genId(),
        type: 'image',
        content: {
          src: '',
          alt: 'Featured image',
        },
        styles: { padding: '20px' },
      },
      {
        id: genId(),
        type: 'button',
        content: {
          text: 'Read More',
          link: 'https://example.com/blog',
          variant: 'outline',
        },
        styles: { textAlign: 'center', padding: '20px' },
      },
      {
        id: genId(),
        type: 'divider',
        content: { style: 'solid', color: '#e5e7eb', thickness: '1px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: 'Quick Links',
          heading: 'h3',
        },
        styles: { padding: '20px 20px 10px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: '• <a href="#">Latest Blog Posts</a><br>• <a href="#">Upcoming Events</a><br>• <a href="#">Product Updates</a>',
        },
        styles: { padding: '0 20px 20px' },
      },
      {
        id: genId(),
        type: 'social',
        content: {
          networks: [
            { platform: 'twitter', url: 'https://twitter.com' },
            { platform: 'linkedin', url: 'https://linkedin.com' },
            { platform: 'instagram', url: 'https://instagram.com' },
          ],
          iconSize: 'medium',
        },
        styles: { textAlign: 'center' },
      },
      {
        id: genId(),
        type: 'footer',
        content: {
          companyName: '{{companyName}}',
          address: '{{companyAddress}}',
          showUnsubscribe: true,
          copyrightText: '© {{year}} {{companyName}}. All rights reserved.',
        },
      },
    ],
  },
  {
    id: 'event',
    name: 'Event Invitation',
    category: 'Events',
    description: 'Invite to an event or webinar',
    icon: <Calendar className="h-5 w-5" />,
    blocks: [
      {
        id: genId(),
        type: 'header',
        content: {
          showLogo: true,
          title: "You're Invited!",
        },
        styles: { textAlign: 'center', padding: '30px 20px' },
      },
      {
        id: genId(),
        type: 'hero',
        content: {
          title: 'Annual Conference 2024',
          subtitle:
            'Join industry leaders for a day of insights and networking',
          backgroundColor: '#4f46e5',
          buttonText: 'Register Now',
          buttonLink: 'https://example.com/register',
        },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: '📅 <b>Date:</b> December 15, 2024<br>🕐 <b>Time:</b> 9:00 AM - 5:00 PM EST<br>📍 <b>Location:</b> Virtual Event',
        },
        styles: { padding: '30px 20px', backgroundColor: '#f9fafb' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: "What You'll Learn",
          heading: 'h2',
        },
        styles: { padding: '30px 20px 10px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: '• Industry trends and predictions<br>• Best practices from top experts<br>• Networking opportunities<br>• Exclusive Q&A sessions',
        },
        styles: { padding: '0 20px 20px' },
      },
      {
        id: genId(),
        type: 'button',
        content: {
          text: 'Save Your Spot',
          link: 'https://example.com/register',
          variant: 'primary',
        },
        styles: { textAlign: 'center', padding: '20px' },
      },
      {
        id: genId(),
        type: 'footer',
        content: {
          companyName: '{{companyName}}',
          showUnsubscribe: true,
          copyrightText: '© {{year}} {{companyName}}',
        },
      },
    ],
    globalStyles: { primaryColor: '#4f46e5' },
  },
  {
    id: 'announcement',
    name: 'Product Launch',
    category: 'Announcements',
    description: 'Announce a new product or feature',
    icon: <PartyPopper className="h-5 w-5" />,
    blocks: [
      {
        id: genId(),
        type: 'header',
        content: {
          showLogo: true,
          title: 'Something Big is Here',
          subtitle: 'Introducing our latest innovation',
        },
        styles: { textAlign: 'center', padding: '30px 20px' },
      },
      {
        id: genId(),
        type: 'image',
        content: {
          src: '',
          alt: 'New product',
          width: '100%',
        },
        styles: { padding: '0' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: 'Meet [Product Name]',
          heading: 'h1',
        },
        styles: { padding: '30px 20px 10px', textAlign: 'center' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: "We've been working on something special, and we're thrilled to finally share it with you. [Product Name] is designed to revolutionize the way you work.",
        },
        styles: { padding: '10px 20px 20px', textAlign: 'center' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: 'Key Features',
          heading: 'h2',
        },
        styles: { padding: '20px 20px 10px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: '✨ <b>Feature 1:</b> Description of feature<br>🚀 <b>Feature 2:</b> Description of feature<br>💡 <b>Feature 3:</b> Description of feature',
        },
        styles: { padding: '0 20px 20px' },
      },
      {
        id: genId(),
        type: 'button',
        content: {
          text: 'Try It Free',
          link: 'https://example.com/try',
          variant: 'primary',
        },
        styles: { textAlign: 'center', padding: '20px' },
      },
      {
        id: genId(),
        type: 'footer',
        content: {
          companyName: '{{companyName}}',
          showUnsubscribe: true,
          copyrightText: '© {{year}} {{companyName}}',
        },
      },
    ],
  },
  {
    id: 'reminder',
    name: 'Reminder',
    category: 'Transactional',
    description: 'Remind users about something',
    icon: <Bell className="h-5 w-5" />,
    blocks: [
      {
        id: genId(),
        type: 'header',
        content: {
          showLogo: true,
          title: 'Quick Reminder',
        },
        styles: { textAlign: 'center', padding: '20px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: 'Hi {{firstName}},<br><br>This is a friendly reminder that your [action/subscription/appointment] is coming up.',
        },
        styles: { padding: '20px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: '📅 <b>Date:</b> [Date]<br>🕐 <b>Time:</b> [Time]',
        },
        styles: {
          padding: '10px 20px 20px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          margin: '0 20px',
        },
      },
      {
        id: genId(),
        type: 'button',
        content: {
          text: 'Take Action',
          link: 'https://example.com/action',
          variant: 'primary',
        },
        styles: { textAlign: 'center', padding: '30px 20px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: 'If you have any questions, feel free to reply to this email or contact our support team.',
        },
        styles: { padding: '0 20px 20px' },
      },
      {
        id: genId(),
        type: 'footer',
        content: {
          companyName: '{{companyName}}',
          showUnsubscribe: true,
          copyrightText: '© {{year}} {{companyName}}',
        },
      },
    ],
  },
  {
    id: 'receipt',
    name: 'Order Receipt',
    category: 'Transactional',
    description: 'Order confirmation receipt',
    icon: <Receipt className="h-5 w-5" />,
    blocks: [
      {
        id: genId(),
        type: 'header',
        content: {
          showLogo: true,
          title: 'Order Confirmed! ✓',
          subtitle: 'Order #{{orderNumber}}',
        },
        styles: {
          textAlign: 'center',
          padding: '30px 20px',
          backgroundColor: '#ecfdf5',
        },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: "Hi {{firstName}},<br><br>Thank you for your order! We're preparing it now and will notify you when it ships.",
        },
        styles: { padding: '20px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: 'Order Summary',
          heading: 'h2',
        },
        styles: { padding: '20px 20px 10px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: '<table style="width:100%"><tr><td>Product Name</td><td style="text-align:right">$XX.XX</td></tr><tr><td>Shipping</td><td style="text-align:right">$X.XX</td></tr><tr><td>Tax</td><td style="text-align:right">$X.XX</td></tr><tr style="font-weight:bold"><td>Total</td><td style="text-align:right">$XX.XX</td></tr></table>',
        },
        styles: { padding: '0 20px 20px' },
      },
      {
        id: genId(),
        type: 'divider',
        content: { style: 'solid', color: '#e5e7eb', thickness: '1px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: 'Shipping Address',
          heading: 'h3',
        },
        styles: { padding: '20px 20px 10px' },
      },
      {
        id: genId(),
        type: 'text',
        content: {
          text: '{{shippingAddress}}',
        },
        styles: { padding: '0 20px 20px' },
      },
      {
        id: genId(),
        type: 'button',
        content: {
          text: 'Track Your Order',
          link: 'https://example.com/track',
          variant: 'primary',
        },
        styles: { textAlign: 'center', padding: '20px' },
      },
      {
        id: genId(),
        type: 'footer',
        content: {
          companyName: '{{companyName}}',
          address: '{{companyAddress}}',
          showUnsubscribe: false,
          copyrightText: '© {{year}} {{companyName}}. All rights reserved.',
        },
      },
    ],
  },
];

interface TemplateLibraryProps {
  onSelectTemplate: (
    blocks: EmailBlock[],
    globalStyles?: Partial<EmailTemplate['globalStyles']>
  ) => void;
}

export function TemplateLibrary({ onSelectTemplate }: TemplateLibraryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(
    new Set(PRE_BUILT_TEMPLATES.map((t) => t.category))
  );

  const filteredTemplates = PRE_BUILT_TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (template: TemplateOption) => {
    // Create fresh IDs for the blocks
    const blocksWithNewIds = template.blocks.map((block) => ({
      ...block,
      id: genId(),
    }));
    onSelectTemplate(blocksWithNewIds, template.globalStyles);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Email Templates</DialogTitle>
          <DialogDescription>
            Choose a pre-built template to get started quickly
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === null ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={
                    selectedCategory === category ? 'secondary' : 'outline'
                  }
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <ScrollArea className="h-[500px]">
            <div className="grid gap-4 pr-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className={cn(
                    'cursor-pointer rounded-lg border border-stone-800 bg-stone-900/50 p-4 transition-all',
                    'hover:border-stone-600 hover:bg-stone-800/50'
                  )}
                  onClick={() => handleSelectTemplate(template)}
                >
                  {/* Template Preview */}
                  <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-stone-800/50">
                    <div className="text-stone-500">{template.icon}</div>
                  </div>

                  {/* Template Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{template.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {template.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
