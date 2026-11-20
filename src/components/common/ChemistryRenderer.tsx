import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/contrib/mhchem';
import { formatChemicalReaction, formatChemicalFormula } from '../../utils/chemistryFormatter';

interface ChemistryRendererProps {
  equation?: string;
  formula?: string;
  displayMode?: boolean;
  className?: string;
}

function normalizeChemForMhchem(rawInput: string): string {
  let expr = rawInput.trim();

  // Unwrap if caller passed \ce{...}
  if (expr.startsWith('\\ce{') && expr.endsWith('}')) {
    expr = expr.slice(4, -1).trim();
  }

  // Normalize toolbar/custom arrow shortcuts to mhchem syntax
  // e.g. "-[Δ]->" or "-[heat]->" -> "->[\Delta]" / "->[heat]"
  expr = expr.replace(/-\[([^\]]+)\]->/g, (_, cond: string) => {
    const cleanCond = cond.trim() === 'Δ' ? '\\Delta' : cond.trim();
    return `->[${cleanCond}]`;
  });

  // Replace Unicode delta inside arrow conditions: ->[Δ] -> ->[\Delta]
  expr = expr.replace(/->\[([^\]]*)\]/g, (_, cond: string) => {
    const cleanCond = cond.replace(/Δ/g, '\\Delta');
    return `->[${cleanCond}]`;
  });

  expr = expr
    .replace(/<-->|<==>/g, '<=>')
    .replace(/<->/g, '<=>')
    .replace(/⇌/g, '<=>')
    .replace(/→/g, '->')
    .replace(/←/g, '<-');

  return expr;
}

export const ChemistryRenderer: React.FC<ChemistryRendererProps> = React.memo(({
  equation,
  formula,
  displayMode = false,
  className = ''
}) => {
  const content = equation || formula || '';

  const rendered = useMemo(() => {
    if (!content.trim()) return { html: '', fallback: '' };

    const normalized = normalizeChemForMhchem(content);

    try {
      const html = katex.renderToString(`\\ce{${normalized}}`, {
        displayMode,
        throwOnError: true,
        strict: false,
        trust: true
      });
      return { html, fallback: '' };
    } catch {
      const fallback = equation
        ? formatChemicalReaction(content)
        : formatChemicalFormula(content);
      return { html: '', fallback };
    }
  }, [content, equation, displayMode]);

  if (!rendered.html && !rendered.fallback) return null;

  if (rendered.html) {
    if (displayMode) {
      return (
        <div
          className={`my-3 px-4 py-2.5 rounded-[10px] border text-[var(--lc-text)] text-center overflow-x-auto select-text ${className}`}
          style={{
            backgroundColor: 'var(--lc-success-soft)',
            borderColor: 'color-mix(in srgb, var(--lc-success) 35%, transparent)'
          }}
          dangerouslySetInnerHTML={{ __html: rendered.html }}
        />
      );
    }

    return (
      <span
        className={`inline-block select-text align-baseline mx-0.5 ${className}`}
        dangerouslySetInnerHTML={{ __html: rendered.html }}
      />
    );
  }

  if (displayMode) {
    return (
      <div
        className={`my-3 px-4 py-2.5 rounded-[10px] bg-emerald-500/12 border border-emerald-400/28 font-mono text-sm sm:text-base font-semibold text-emerald-200 text-center tracking-wide overflow-x-auto ${className}`}
      >
        {rendered.fallback}
      </div>
    );
  }

  return (
    <span
      className={`inline-block font-mono text-[0.95em] font-medium text-emerald-200 tracking-normal px-1.5 py-0.5 rounded bg-emerald-500/12 ${className}`}
    >
      {rendered.fallback}
    </span>
  );
});
