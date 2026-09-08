import React, { useState, useEffect, useMemo } from 'react';
import { MathRenderer } from './MathRenderer';
import { ChemistryRenderer } from './ChemistryRenderer';
import { ImageLightbox } from './ImageLightbox';
import { resolveImageUrl, getCachedImageUrl } from '../../services/imageStorageService';
import { isLikelyChemicalReaction } from '../../utils/chemistryFormatter';
import type { QuestionImage, ContentBlock } from '../../types';
import { ZoomIn } from 'lucide-react';

interface RichContentRendererProps {
  content?: string;
  images?: QuestionImage[];
  contentBlocks?: ContentBlock[];
  className?: string;
  imagePosition?: 'top' | 'bottom';
  textClassName?: string;
  imageMaxHeight?: string;
}

interface ParsedToken {
  type: 'text' | 'math-inline' | 'math-block' | 'chem-inline' | 'chem-block';
  value: string;
}

/**
 * Tokenizes text containing LaTeX math ($...$, \(...\), $$...$$, \[...\])
 * and chemistry tags ([chem]...[/chem], \ce{...}).
 */
function parseMixedContent(text: string): ParsedToken[] {
  if (!text) return [];

  const tokens: ParsedToken[] = [];
  // Regex matches:
  // 1. Block math: \[\s*([\s\S]*?)\s*\] OR \$\$\s*([\s\S]*?)\s*\$\$
  // 2. Inline math: \(\s*([\s\S]*?)\s*\) OR \$(?!\$)([^\$\n]+?)\$
  // 3. Chemistry tags: \[chem\]([\s\S]*?)\[\/chem\] OR \\ce\{([\s\S]*?)\}
  const pattern = /(\\\[[\s\S]*?\\\]|\$\$[\s\S]*?\$\$|\\ce\{[\s\S]*?\}|\[chem\][\s\S]*?\[\/chem\]|\\\([\s\S]*?\\\)|\$(?!\$)[^\$\n]+?\$)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const plainText = text.substring(lastIndex, match.index);
      tokens.push({ type: 'text', value: plainText });
    }

    const matchedStr = match[0];

    if (matchedStr.startsWith('\\[') && matchedStr.endsWith('\\]')) {
      tokens.push({ type: 'math-block', value: matchedStr.slice(2, -2).trim() });
    } else if (matchedStr.startsWith('$$') && matchedStr.endsWith('$$')) {
      tokens.push({ type: 'math-block', value: matchedStr.slice(2, -2).trim() });
    } else if (matchedStr.startsWith('\\(') && matchedStr.endsWith('\\)')) {
      tokens.push({ type: 'math-inline', value: matchedStr.slice(2, -2).trim() });
    } else if (matchedStr.startsWith('$') && matchedStr.endsWith('$')) {
      tokens.push({ type: 'math-inline', value: matchedStr.slice(1, -1).trim() });
    } else if (matchedStr.startsWith('[chem]') && matchedStr.endsWith('[/chem]')) {
      tokens.push({ type: 'chem-block', value: matchedStr.slice(6, -7).trim() });
    } else if (matchedStr.startsWith('\\ce{') && matchedStr.endsWith('}')) {
      tokens.push({ type: 'chem-inline', value: matchedStr.slice(4, -1).trim() });
    } else {
      tokens.push({ type: 'text', value: matchedStr });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.substring(lastIndex) });
  }

  return tokens;
}

/**
 * Single image renderer with lightbox click
 */
const SingleQuestionImage: React.FC<{
  image: QuestionImage;
  maxHeight?: string;
}> = ({ image, maxHeight = 'max-h-72 sm:max-h-96' }) => {
  const [src, setSrc] = useState<string>(() => getCachedImageUrl(image) || image.url || '');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!src) {
      resolveImageUrl(image).then(resolved => {
        if (isMounted && resolved) setSrc(resolved);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [image, src]);

  if (!src && !image.storagePath && !image.url) return null;

  return (
    <div className="relative group my-3 inline-block max-w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-2 overflow-hidden shadow-xs">
      <div className="relative overflow-hidden rounded-lg">
        {hasError ? (
          <div className="w-64 h-36 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-xs p-4 text-center">
            <span>Unable to load diagram</span>
            <span className="text-[10px] text-zinc-500 mt-1">{image.altText || image.storagePath}</span>
          </div>
        ) : (
          <img
            src={src}
            alt={image.altText || 'Question diagram'}
            loading="lazy"
            onError={() => setHasError(true)}
            onClick={() => setIsLightboxOpen(true)}
            className={`w-auto ${maxHeight} object-contain mx-auto cursor-zoom-in transition-transform duration-200 hover:scale-[1.01]`}
          />
        )}

        {/* Hover zoom pill */}
        {!hasError && (
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            aria-label="Zoom image"
            className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-900/75 hover:bg-zinc-900 text-white text-[11px] font-medium backdrop-blur-xs shadow transition opacity-80 group-hover:opacity-100"
          >
            <ZoomIn className="w-3.5 h-3.5" />
            <span>Zoom</span>
          </button>
        )}
      </div>

      {/* Caption if provided */}
      {image.caption && (
        <p className="mt-2 text-center text-xs text-zinc-600 dark:text-zinc-400 italic">
          {image.caption}
        </p>
      )}

      {/* Lightbox */}
      <ImageLightbox
        src={src}
        alt={image.altText}
        caption={image.caption}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
      />
    </div>
  );
};

export const RichContentRenderer: React.FC<RichContentRendererProps> = ({
  content = '',
  images = [],
  contentBlocks = [],
  className = '',
  imagePosition = 'bottom',
  textClassName = '',
  imageMaxHeight
}) => {
  // Parse content into tokens
  const tokens = useMemo(() => {
    if (!content) return [];
    return parseMixedContent(content);
  }, [content]);

  // Render images gallery
  const renderImages = () => {
    if (!images || images.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-4 items-center justify-center my-2">
        {images.map((img, idx) => (
          <SingleQuestionImage key={img.id || idx} image={img} maxHeight={imageMaxHeight} />
        ))}
      </div>
    );
  };

  // If content blocks are provided, render structured blocks
  if (contentBlocks && contentBlocks.length > 0) {
    return (
      <div className={`space-y-3 ${className}`}>
        {imagePosition === 'top' && renderImages()}
        {contentBlocks.map((block, idx) => {
          if (block.type === 'text') {
            const blockTokens = parseMixedContent(block.content || '');
            return (
              <div key={idx} className={`leading-relaxed ${textClassName}`}>
                {blockTokens.map((t, tIdx) => {
                  if (t.type === 'math-block') {
                    return <MathRenderer key={tIdx} math={t.value} displayMode />;
                  }
                  if (t.type === 'math-inline') {
                    return <MathRenderer key={tIdx} math={t.value} />;
                  }
                  if (t.type === 'chem-block') {
                    return <ChemistryRenderer key={tIdx} equation={t.value} displayMode />;
                  }
                  if (t.type === 'chem-inline') {
                    return <ChemistryRenderer key={tIdx} formula={t.value} />;
                  }
                  return <span key={tIdx}>{t.value}</span>;
                })}
              </div>
            );
          }
          if (block.type === 'math') {
            return (
              <MathRenderer
                key={idx}
                math={block.content || ''}
                displayMode={block.displayMode !== false}
              />
            );
          }
          if (block.type === 'chemical') {
            return (
              <ChemistryRenderer
                key={idx}
                equation={block.content || ''}
                displayMode={block.displayMode !== false}
              />
            );
          }
          if (block.type === 'image' && block.image) {
            return (
              <div key={idx} className="flex justify-center">
                <SingleQuestionImage image={block.image} maxHeight={imageMaxHeight} />
              </div>
            );
          }
          return null;
        })}
        {imagePosition === 'bottom' && renderImages()}
      </div>
    );
  }

  // Mixed string content rendering
  return (
    <div className={`rich-content-container ${className}`}>
      {imagePosition === 'top' && renderImages()}

      {content && (
        <div className={`leading-relaxed break-words ${textClassName}`}>
          {tokens.map((token, idx) => {
            if (token.type === 'math-block') {
              return <MathRenderer key={idx} math={token.value} displayMode />;
            }
            if (token.type === 'math-inline') {
              return <MathRenderer key={idx} math={token.value} />;
            }
            if (token.type === 'chem-block') {
              return <ChemistryRenderer key={idx} equation={token.value} displayMode />;
            }
            if (token.type === 'chem-inline') {
              return <ChemistryRenderer key={idx} formula={token.value} />;
            }

            // Normal text block: check if entire plain text line represents a standalone chemical reaction
            const trimmed = token.value.trim();
            if (isLikelyChemicalReaction(trimmed) && trimmed.length < 80 && !trimmed.includes('\n')) {
              return <ChemistryRenderer key={idx} equation={trimmed} displayMode />;
            }

            // Standard text with proper newline preservation
            return (
              <span key={idx} className="whitespace-pre-wrap">
                {token.value}
              </span>
            );
          })}
        </div>
      )}

      {imagePosition === 'bottom' && renderImages()}
    </div>
  );
};
