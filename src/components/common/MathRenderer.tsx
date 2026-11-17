import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/contrib/mhchem';

interface MathRendererProps {
  math: string;
  displayMode?: boolean;
  className?: string;
}

function restoreControlCharsInLatex(input: string): string {
  return input
    .replace(/\f([a-zA-Z])/g, '\\f$1')
    .replace(/\t([a-zA-Z])/g, '\\t$1')
    .replace(/\r([a-zA-Z])/g, '\\r$1')
    .replace(/[\b]([a-zA-Z])/g, '\\b$1')
    .replace(/\v([a-zA-Z])/g, '\\v$1');
}

export const MathRenderer: React.FC<MathRendererProps> = React.memo(({
  math,
  displayMode = false,
  className = ''
}) => {
  const html = useMemo(() => {
    if (!math || !math.trim()) return '';

    let raw = restoreControlCharsInLatex(math.trim());
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
