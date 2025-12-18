/**
 * Email Builder Types
 * Defines the structure for email components and blocks
 */

export type BlockType =
  | 'header'
  | 'text'
  | 'image'
  | 'button'
  | 'divider'
  | 'spacer'
  | 'columns'
  | 'social'
  | 'footer'
  | 'hero'
  | 'product'
  | 'testimonial'
  | 'countdown'
  | 'video';

export interface BlockStyles {
  backgroundColor?: string;
  textColor?: string;
  padding?: string;
  margin?: string;
  borderRadius?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: string;
  width?: string;
  maxWidth?: string;
}

export interface BaseBlock {
  id: string;
  type: BlockType;
  styles?: BlockStyles;
}

export interface HeaderBlock extends BaseBlock {
  type: 'header';
  content: {
    logoUrl?: string;
    logoAlt?: string;
    title?: string;
    subtitle?: string;
    showLogo: boolean;
  };
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  content: {
    text: string;
    heading?: 'h1' | 'h2' | 'h3' | 'p';
  };
}

export interface ImageBlock extends BaseBlock {
  type: 'image';
  content: {
    src: string;
    alt: string;
    link?: string;
    width?: string;
  };
}

export interface ButtonBlock extends BaseBlock {
  type: 'button';
  content: {
    text: string;
    link: string;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  styles?: BlockStyles & {
    buttonColor?: string;
    buttonTextColor?: string;
    buttonBorderRadius?: string;
  };
}

export interface DividerBlock extends BaseBlock {
  type: 'divider';
  content: {
    style: 'solid' | 'dashed' | 'dotted';
    color?: string;
    thickness?: string;
  };
}

export interface SpacerBlock extends BaseBlock {
  type: 'spacer';
  content: {
    height: string;
  };
}

export interface ColumnsBlock extends BaseBlock {
  type: 'columns';
  content: {
    columns: Array<{
      width: string;
      blocks: EmailBlock[];
    }>;
  };
}

export interface SocialBlock extends BaseBlock {
  type: 'social';
  content: {
    networks: Array<{
      platform:
        | 'facebook'
        | 'twitter'
        | 'instagram'
        | 'linkedin'
        | 'youtube'
        | 'tiktok';
      url: string;
    }>;
    iconStyle?: 'color' | 'dark' | 'light';
    iconSize?: 'small' | 'medium' | 'large';
  };
}

export interface FooterBlock extends BaseBlock {
  type: 'footer';
  content: {
    companyName?: string;
    address?: string;
    showUnsubscribe: boolean;
    unsubscribeText?: string;
    copyrightText?: string;
  };
}

export interface HeroBlock extends BaseBlock {
  type: 'hero';
  content: {
    backgroundImage?: string;
    backgroundColor?: string;
    title: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
    overlayOpacity?: number;
  };
}

export interface ProductBlock extends BaseBlock {
  type: 'product';
  content: {
    imageUrl: string;
    name: string;
    description?: string;
    price: string;
    originalPrice?: string;
    buttonText: string;
    buttonLink: string;
  };
}

export interface TestimonialBlock extends BaseBlock {
  type: 'testimonial';
  content: {
    quote: string;
    authorName: string;
    authorTitle?: string;
    authorImage?: string;
    rating?: number;
  };
}

export interface CountdownBlock extends BaseBlock {
  type: 'countdown';
  content: {
    endDate: string;
    title?: string;
    expiredMessage?: string;
  };
}

export interface VideoBlock extends BaseBlock {
  type: 'video';
  content: {
    thumbnailUrl: string;
    videoUrl: string;
    playButtonColor?: string;
  };
}

export type EmailBlock =
  | HeaderBlock
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | ColumnsBlock
  | SocialBlock
  | FooterBlock
  | HeroBlock
  | ProductBlock
  | TestimonialBlock
  | CountdownBlock
  | VideoBlock;

export interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  previewText?: string;
  blocks: EmailBlock[];
  globalStyles: {
    backgroundColor: string;
    contentBackgroundColor: string;
    fontFamily: string;
    primaryColor: string;
    textColor: string;
    linkColor: string;
    maxWidth: string;
  };
}

export interface EmailVariation {
  id: string;
  name: string;
  subject: string;
  previewText?: string;
  blocks: EmailBlock[];
}

export const DEFAULT_GLOBAL_STYLES: EmailTemplate['globalStyles'] = {
  backgroundColor: '#f4f4f5',
  contentBackgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  primaryColor: '#000000',
  textColor: '#333333',
  linkColor: '#0066cc',
  maxWidth: '600px',
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  header: 'Header',
  text: 'Text',
  image: 'Image',
  button: 'Button',
  divider: 'Divider',
  spacer: 'Spacer',
  columns: 'Columns',
  social: 'Social Links',
  footer: 'Footer',
  hero: 'Hero Banner',
  product: 'Product Card',
  testimonial: 'Testimonial',
  countdown: 'Countdown',
  video: 'Video',
};
