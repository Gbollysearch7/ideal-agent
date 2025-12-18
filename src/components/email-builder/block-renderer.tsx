'use client';

import { EmailBlock, EmailTemplate } from './types';

interface BlockRendererProps {
  block: EmailBlock;
  globalStyles: EmailTemplate['globalStyles'];
  isPreview?: boolean;
}

export function BlockRenderer({
  block,
  globalStyles,
  isPreview = false,
}: BlockRendererProps) {
  const baseStyles = {
    fontFamily: globalStyles.fontFamily,
    color: globalStyles.textColor,
  };

  switch (block.type) {
    case 'header':
      return (
        <table
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={{
            ...baseStyles,
            backgroundColor: block.styles?.backgroundColor || 'transparent',
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  padding: block.styles?.padding || '20px',
                  textAlign:
                    (block.styles?.textAlign as 'left' | 'center' | 'right') ||
                    'center',
                }}
              >
                {block.content.showLogo && block.content.logoUrl && (
                  <img
                    src={block.content.logoUrl}
                    alt={block.content.logoAlt || 'Logo'}
                    style={{ maxHeight: '60px', marginBottom: '10px' }}
                  />
                )}
                {block.content.title && (
                  <h1
                    style={{
                      margin: '0 0 5px',
                      fontSize: '24px',
                      fontWeight: '600',
                      color: block.styles?.textColor || globalStyles.textColor,
                    }}
                  >
                    {block.content.title}
                  </h1>
                )}
                {block.content.subtitle && (
                  <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                    {block.content.subtitle}
                  </p>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      );

    case 'text':
      const TextTag = block.content.heading || 'p';
      const textStyles: React.CSSProperties = {
        margin: 0,
        padding: block.styles?.padding || '10px 20px',
        fontSize:
          block.styles?.fontSize ||
          (block.content.heading === 'h1'
            ? '28px'
            : block.content.heading === 'h2'
              ? '22px'
              : block.content.heading === 'h3'
                ? '18px'
                : '16px'),
        fontWeight:
          block.styles?.fontWeight || (block.content.heading ? '600' : '400'),
        lineHeight: block.styles?.lineHeight || '1.6',
        textAlign: block.styles?.textAlign || 'left',
        color: block.styles?.textColor || globalStyles.textColor,
        backgroundColor: block.styles?.backgroundColor || 'transparent',
      };
      return (
        <TextTag
          style={textStyles}
          dangerouslySetInnerHTML={{ __html: block.content.text }}
        />
      );

    case 'image':
      const imageElement = (
        <img
          src={
            block.content.src ||
            'https://placehold.co/600x300/e5e7eb/9ca3af?text=Add+Image'
          }
          alt={block.content.alt || 'Email image'}
          style={{
            maxWidth: '100%',
            width: block.content.width || '100%',
            height: 'auto',
            display: 'block',
            margin: '0 auto',
            borderRadius: block.styles?.borderRadius || '0',
          }}
        />
      );
      return (
        <div
          style={{
            padding: block.styles?.padding || '10px 20px',
            textAlign: block.styles?.textAlign || 'center',
          }}
        >
          {block.content.link && !isPreview ? (
            <a
              href={block.content.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {imageElement}
            </a>
          ) : (
            imageElement
          )}
        </div>
      );

    case 'button':
      const buttonStyles: React.CSSProperties = {
        display: 'inline-block',
        padding: '14px 32px',
        fontSize: '16px',
        fontWeight: '600',
        textDecoration: 'none',
        borderRadius: block.styles?.buttonBorderRadius || '6px',
        backgroundColor:
          block.content.variant === 'outline'
            ? 'transparent'
            : block.styles?.buttonColor || globalStyles.primaryColor,
        color:
          block.content.variant === 'outline'
            ? block.styles?.buttonColor || globalStyles.primaryColor
            : block.styles?.buttonTextColor || '#ffffff',
        border:
          block.content.variant === 'outline'
            ? `2px solid ${block.styles?.buttonColor || globalStyles.primaryColor}`
            : 'none',
      };
      return (
        <div
          style={{
            padding: block.styles?.padding || '20px',
            textAlign: block.styles?.textAlign || 'center',
          }}
        >
          <a href={isPreview ? '#' : block.content.link} style={buttonStyles}>
            {block.content.text}
          </a>
        </div>
      );

    case 'divider':
      return (
        <div style={{ padding: block.styles?.padding || '20px' }}>
          <hr
            style={{
              border: 'none',
              borderTop: `${block.content.thickness || '1px'} ${block.content.style} ${block.content.color || '#e5e7eb'}`,
              margin: 0,
            }}
          />
        </div>
      );

    case 'spacer':
      return <div style={{ height: block.content.height }} />;

    case 'columns':
      return (
        <table width="100%" cellPadding="0" cellSpacing="0">
          <tbody>
            <tr>
              {block.content.columns.map((column, index) => (
                <td
                  key={index}
                  style={{
                    width: column.width,
                    verticalAlign: 'top',
                    padding: '0 10px',
                  }}
                >
                  {column.blocks.map((childBlock) => (
                    <BlockRenderer
                      key={childBlock.id}
                      block={childBlock}
                      globalStyles={globalStyles}
                      isPreview={isPreview}
                    />
                  ))}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      );

    case 'social':
      const iconSizes = { small: 24, medium: 32, large: 40 };
      const iconSize = iconSizes[block.content.iconSize || 'medium'];
      const socialIcons: Record<string, string> = {
        facebook: 'https://cdn-icons-png.flaticon.com/512/733/733547.png',
        twitter: 'https://cdn-icons-png.flaticon.com/512/733/733579.png',
        instagram: 'https://cdn-icons-png.flaticon.com/512/733/733558.png',
        linkedin: 'https://cdn-icons-png.flaticon.com/512/733/733561.png',
        youtube: 'https://cdn-icons-png.flaticon.com/512/733/733646.png',
        tiktok: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png',
      };
      return (
        <div
          style={{
            padding: block.styles?.padding || '20px',
            textAlign: block.styles?.textAlign || 'center',
          }}
        >
          {block.content.networks.map((network, index) => (
            <a
              key={index}
              href={isPreview ? '#' : network.url}
              style={{ display: 'inline-block', margin: '0 8px' }}
            >
              <img
                src={socialIcons[network.platform]}
                alt={network.platform}
                width={iconSize}
                height={iconSize}
                style={{ display: 'block' }}
              />
            </a>
          ))}
        </div>
      );

    case 'footer':
      return (
        <table
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={{
            backgroundColor: block.styles?.backgroundColor || '#f4f4f5',
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  padding: block.styles?.padding || '30px 20px',
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#666',
                }}
              >
                {block.content.companyName && (
                  <p style={{ margin: '0 0 5px', fontWeight: '600' }}>
                    {block.content.companyName}
                  </p>
                )}
                {block.content.address && (
                  <p style={{ margin: '0 0 15px' }}>{block.content.address}</p>
                )}
                {block.content.showUnsubscribe && (
                  <p style={{ margin: '0 0 10px' }}>
                    <a
                      href={isPreview ? '#' : '{{unsubscribeUrl}}'}
                      style={{ color: globalStyles.linkColor }}
                    >
                      {block.content.unsubscribeText || 'Unsubscribe'}
                    </a>
                  </p>
                )}
                {block.content.copyrightText && (
                  <p style={{ margin: 0 }}>{block.content.copyrightText}</p>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      );

    case 'hero':
      return (
        <table width="100%" cellPadding="0" cellSpacing="0">
          <tbody>
            <tr>
              <td
                style={{
                  backgroundImage: block.content.backgroundImage
                    ? `url(${block.content.backgroundImage})`
                    : undefined,
                  backgroundColor:
                    block.content.backgroundColor || globalStyles.primaryColor,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  padding: '60px 40px',
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                {block.content.overlayOpacity &&
                  block.content.overlayOpacity > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: `rgba(0,0,0,${block.content.overlayOpacity})`,
                      }}
                    />
                  )}
                <h1
                  style={{
                    margin: '0 0 15px',
                    fontSize: '36px',
                    fontWeight: '700',
                    color: '#ffffff',
                    position: 'relative',
                  }}
                >
                  {block.content.title}
                </h1>
                {block.content.subtitle && (
                  <p
                    style={{
                      margin: '0 0 25px',
                      fontSize: '18px',
                      color: 'rgba(255,255,255,0.9)',
                      position: 'relative',
                    }}
                  >
                    {block.content.subtitle}
                  </p>
                )}
                {block.content.buttonText && (
                  <a
                    href={isPreview ? '#' : block.content.buttonLink}
                    style={{
                      display: 'inline-block',
                      padding: '14px 32px',
                      backgroundColor: '#ffffff',
                      color:
                        block.content.backgroundColor ||
                        globalStyles.primaryColor,
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                      position: 'relative',
                    }}
                  >
                    {block.content.buttonText}
                  </a>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      );

    case 'product':
      return (
        <table
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={{
            backgroundColor: block.styles?.backgroundColor || '#ffffff',
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: block.styles?.padding || '20px' }}>
                <img
                  src={
                    block.content.imageUrl ||
                    'https://placehold.co/300x300/e5e7eb/9ca3af?text=Product'
                  }
                  alt={block.content.name}
                  style={{
                    width: '100%',
                    maxWidth: '300px',
                    display: 'block',
                    margin: '0 auto 15px',
                    borderRadius: '8px',
                  }}
                />
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: '18px',
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  {block.content.name}
                </h3>
                {block.content.description && (
                  <p
                    style={{
                      margin: '0 0 12px',
                      fontSize: '14px',
                      color: '#666',
                      textAlign: 'center',
                    }}
                  >
                    {block.content.description}
                  </p>
                )}
                <p style={{ margin: '0 0 15px', textAlign: 'center' }}>
                  <span
                    style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: globalStyles.primaryColor,
                    }}
                  >
                    {block.content.price}
                  </span>
                  {block.content.originalPrice && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '14px',
                        textDecoration: 'line-through',
                        color: '#999',
                      }}
                    >
                      {block.content.originalPrice}
                    </span>
                  )}
                </p>
                <div style={{ textAlign: 'center' }}>
                  <a
                    href={isPreview ? '#' : block.content.buttonLink}
                    style={{
                      display: 'inline-block',
                      padding: '12px 24px',
                      backgroundColor: globalStyles.primaryColor,
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontWeight: '600',
                    }}
                  >
                    {block.content.buttonText}
                  </a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      );

    case 'testimonial':
      return (
        <table
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={{
            backgroundColor: block.styles?.backgroundColor || '#f9fafb',
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  padding: block.styles?.padding || '30px 20px',
                  textAlign: 'center',
                }}
              >
                {block.content.rating && (
                  <div style={{ marginBottom: '15px' }}>
                    {'★'.repeat(block.content.rating)}
                    {'☆'.repeat(5 - block.content.rating)}
                  </div>
                )}
                <p
                  style={{
                    margin: '0 0 20px',
                    fontSize: '18px',
                    fontStyle: 'italic',
                    lineHeight: '1.6',
                    color: globalStyles.textColor,
                  }}
                >
                  &ldquo;{block.content.quote}&rdquo;
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                  }}
                >
                  {block.content.authorImage && (
                    <img
                      src={block.content.authorImage}
                      alt={block.content.authorName}
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                      }}
                    />
                  )}
                  <div>
                    <p style={{ margin: 0, fontWeight: '600' }}>
                      {block.content.authorName}
                    </p>
                    {block.content.authorTitle && (
                      <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                        {block.content.authorTitle}
                      </p>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      );

    case 'video':
      return (
        <div
          style={{
            padding: block.styles?.padding || '20px',
            textAlign: 'center',
          }}
        >
          <a
            href={isPreview ? '#' : block.content.videoUrl}
            style={{ display: 'block', position: 'relative' }}
          >
            <img
              src={
                block.content.thumbnailUrl ||
                'https://placehold.co/600x340/e5e7eb/9ca3af?text=Video'
              }
              alt="Video thumbnail"
              style={{
                width: '100%',
                maxWidth: '600px',
                display: 'block',
                margin: '0 auto',
                borderRadius: '8px',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '64px',
                height: '64px',
                backgroundColor:
                  block.content.playButtonColor || 'rgba(0,0,0,0.7)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  marginLeft: '4px',
                  borderStyle: 'solid',
                  borderWidth: '12px 0 12px 20px',
                  borderColor: 'transparent transparent transparent #ffffff',
                }}
              />
            </div>
          </a>
        </div>
      );

    default:
      return null;
  }
}
