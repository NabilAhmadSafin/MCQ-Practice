import React, { useMemo } from 'react';
import { formatChemicalReaction, formatChemicalFormula } from '../../utils/chemistryFormatter';

interface ChemistryRendererProps {
  equation?: string;
  formula?: string;
  displayMode?: boolean;
  className?: string;
}

export const ChemistryRenderer: React.FC<ChemistryRendererProps> = React.memo(({
  equation,
  formula,
  displayMode = false,
  className = ''
}) => {
  const content = equation || formula || '';

  const formattedText = useMemo(() => {
    if (!content.trim()) return '';
    if (equation) {
      return formatChemicalReaction(content);
    }
    return formatChemicalFormula(content);
  }, [content, equation]);

  if (!formattedText) return null;

  if (displayMode) {
    return (
      <div
        className={`my-3 px-4 py-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 font-mono text-sm sm:text-base font-semibold text-emerald-950 dark:text-emerald-200 text-center tracking-wide overflow-x-auto shadow-xs ${className}`}
      >
        {formattedText}
      </div>
    );
  }

  return (
    <span
      className={`inline-block font-mono text-[0.95em] font-medium text-emerald-900 dark:text-emerald-200 tracking-normal px-1 py-0.5 rounded bg-emerald-50/50 dark:bg-emerald-950/20 ${className}`}
    >
      {formattedText}
    </span>
  );
});
