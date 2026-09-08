import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  math: string;
  displayMode?: boolean;
  className?: string;
}

export const MathRenderer: React.FC<MathRendererProps> = React.memo(({
  math,
  displayMode = false,
  className = ''
}) => {
  const html = useMemo(() => {
    if (!math || !math.trim()) return '';

    // Clean up common wrapper delimiters if present
    let raw = math.trim();
    if (raw.startsWith('\\[') && raw.endsWith('\\]')) {
      raw = raw.slice(2, -2).trim();
    } else if (raw.startsWith('\\(') && raw.endsWith('\\)')) {
      raw = raw.slice(2, -2).trim();
    } else if (raw.startsWith('$$') && raw.endsWith('$$')) {
      raw = raw.slice(2, -2).trim();
    } else if (raw.startsWith('$') && raw.endsWith('$')) {
      raw = raw.slice(1, -1).trim();
    }

    try {
      return katex.renderToString(raw, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: true
      });
    } catch (err) {
      console.warn('KaTeX rendering error for expression:', raw, err);
      // Fallback: show raw string escaped
      return `<span class="katex-fallback font-mono text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-1 py-0.5 rounded">${raw}</span>`;
    }
  }, [math, displayMode]);

  if (!html) return null;

  if (displayMode) {
    return (
      <div
        className={`my-3 overflow-x-auto py-1 px-2 text-center select-text ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`inline-block select-text align-baseline mx-0.5 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
