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
 * Normalizes escaped newline sequences (\n, \r\n) in plain text tokens.
 */
function normalizePlainTextNewlines(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
}

/**
 * Finds the matching closing brace index '}' starting at openBraceIdx (where text[openBraceIdx] === '{').
 * Returns -1 if unbalanced.
 */
function findMatchingBrace(text: string, openBraceIdx: number): number {
  let depth = 0;
  for (let i = openBraceIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++; // skip escaped character
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Tokenizes text containing LaTeX math ($...$, \(...\), $$...$$, \[...\])
 * and chemistry tags ([chem]...[/chem], \ce{...} with nested braces).
 */
function parseMixedContent(text: string): ParsedToken[] {
  if (!text) return [];

  const tokens: ParsedToken[] = [];
  let i = 0;
  let textStart = 0;

  const pushText = (endIdx: number) => {
    if (endIdx > textStart) {
      tokens.push({
        type: 'text',
        value: normalizePlainTextNewlines(text.slice(textStart, endIdx))
      });
    }
  };

  while (i < text.length) {
    // 1. Escaped dollar sign \$ -> keep as text
    if (text[i] === '\\' && text[i + 1] === '$') {
      i += 2;
      continue;
    }

    // 2. Block math: \[ ... \]
    if (text.startsWith('\\[', i)) {
      const end = text.indexOf('\\]', i + 2);
      if (end !== -1) {
        pushText(i);
        tokens.push({ type: 'math-block', value: text.slice(i + 2, end).trim() });
        i = end + 2;
        textStart = i;
        continue;
      }
    }

    // 3. Inline math: \( ... \)
    if (text.startsWith('\\(', i)) {
      const end = text.indexOf('\\)', i + 2);
      if (end !== -1) {
        pushText(i);
        tokens.push({ type: 'math-inline', value: text.slice(i + 2, end).trim() });
        i = end + 2;
        textStart = i;
        continue;
      }
    }

    // 4. Standalone \ce{...} with balanced brace matching
    if (text.startsWith('\\ce{', i)) {
      const closeIdx = findMatchingBrace(text, i + 3);
      if (closeIdx !== -1) {
        pushText(i);
        tokens.push({ type: 'chem-inline', value: text.slice(i + 4, closeIdx).trim() });
        i = closeIdx + 1;
        textStart = i;
        continue;
      }
    }

    // 5. [chem]...[/chem]
    if (text.startsWith('[chem]', i)) {
      const end = text.indexOf('[/chem]', i + 6);
      if (end !== -1) {
        pushText(i);
        tokens.push({ type: 'chem-block', value: text.slice(i + 6, end).trim() });
        i = end + 7;
        textStart = i;
        continue;
      }
    }

    // 6. Block math: $$ ... $$
    if (text.startsWith('$$', i)) {
      const end = text.indexOf('$$', i + 2);
      if (end !== -1) {
        pushText(i);
        tokens.push({ type: 'math-block', value: text.slice(i + 2, end).trim() });
        i = end + 2;
        textStart = i;
        continue;
      }
    }

    // 7. Inline math: $ ... $ (single line, non-empty)
    if (text[i] === '$' && text[i + 1] !== '$') {
      let end = -1;
      for (let j = i + 1; j < text.length; j++) {
        if (text[j] === '\\') {
          j++;
          continue;
        }
        if (text[j] === '\n') break;
        if (text[j] === '$') {
          end = j;
          break;
        }
      }
      if (end !== -1 && end > i + 1) {
        pushText(i);
        tokens.push({ type: 'math-inline', value: text.slice(i + 1, end).trim() });
        i = end + 1;
        textStart = i;
        continue;
      }
    }

    i++;
  }

  pushText(text.length);
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

      {image.caption && (
        <p className="mt-2 text-center text-xs text-zinc-600 dark:text-zinc-400 italic">
          {image.caption}
        </p>
      )}

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
  const tokens = useMemo(() => {
    if (!content) return [];
    return parseMixedContent(content);
  }, [content]);

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
                    return <ChemistryRenderer key={tIdx} equation={t.value} />;
                  }
                  return (
                    <span key={tIdx} className="whitespace-pre-wrap">
                      {t.value}
                    </span>
                  );
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
              return <ChemistryRenderer key={idx} equation={token.value} />;
            }

            const trimmed = token.value.trim();
            if (isLikelyChemicalReaction(trimmed) && trimmed.length < 80 && !trimmed.includes('\n')) {
              return <ChemistryRenderer key={idx} equation={trimmed} displayMode />;
            }

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
