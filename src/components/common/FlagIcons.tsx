import React from 'react';
import { Star, Flame, HelpCircle } from 'lucide-react';

interface FlagIconsProps {
  important?: boolean;
  veryImportant?: boolean;
  dontUnderstand?: boolean;
  interactive?: boolean;
  onToggleImportant?: () => void;
  onToggleVeryImportant?: () => void;
  onToggleDontUnderstand?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const FlagIcons: React.FC<FlagIconsProps> = ({
  important = false,
  veryImportant = false,
  dontUnderstand = false,
  interactive = false,
  onToggleImportant,
  onToggleVeryImportant,
  onToggleDontUnderstand,
  size = 'md'
}) => {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-4.5 h-4.5' : 'w-4 h-4';
  const buttonPadding =
    size === 'sm'
      ? 'px-2 py-1 text-xs'
      : size === 'lg'
      ? 'px-3.5 py-2 text-sm'
      : 'px-2.5 py-1.5 text-xs';

  if (!interactive) {
    return (
      <div className="flex items-center gap-2.5 flex-wrap">
        {important && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#EDB24E]"
            title="Important"
          >
            <Star className={`${iconSize} fill-[#E5A43B] text-[#E5A43B]`} />
            <span>Important</span>
          </span>
        )}
        {veryImportant && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#F28B95]"
            title="Very Important"
          >
            <Flame className={`${iconSize} fill-[#F28B95] text-[#F28B95]`} />
            <span>Very Important</span>
          </span>
        )}
        {dontUnderstand && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#96A0FA]"
            title="Don't Understand"
          >
            <HelpCircle className={`${iconSize} text-[#96A0FA]`} />
            <span>Don't Understand</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={onToggleImportant}
        className={`inline-flex items-center gap-1.5 rounded-[8px] font-medium whitespace-nowrap transition-all duration-150 border ${buttonPadding} ${
          important
            ? 'bg-[#E5A43B]/15 text-[#F6C86E] border-[#E5A43B]/45'
            : 'bg-[var(--lc-surface-subtle)] text-[var(--lc-text-secondary)] border-[var(--lc-border)] hover:border-[var(--lc-border-strong)] hover:text-[var(--lc-text)]'
        }`}
        title="Toggle Important status"
      >
        <Star className={`${iconSize} ${important ? 'fill-[#F6C86E] text-[#F6C86E]' : ''}`} />
        <span>Important</span>
      </button>

      <button
        type="button"
        onClick={onToggleVeryImportant}
        className={`inline-flex items-center gap-1.5 rounded-[8px] font-medium whitespace-nowrap transition-all duration-150 border ${buttonPadding} ${
          veryImportant
            ? 'bg-[#DC626C]/16 text-[#F59EA7] border-[#DC626C]/45'
            : 'bg-[var(--lc-surface-subtle)] text-[var(--lc-text-secondary)] border-[var(--lc-border)] hover:border-[var(--lc-border-strong)] hover:text-[var(--lc-text)]'
        }`}
        title="Toggle Very Important status"
      >
        <Flame className={`${iconSize} ${veryImportant ? 'fill-[#F59EA7] text-[#F59EA7]' : ''}`} />
        <span>Very Important</span>
      </button>

      <button
        type="button"
        onClick={onToggleDontUnderstand}
        className={`inline-flex items-center gap-1.5 rounded-[8px] font-medium whitespace-nowrap transition-all duration-150 border ${buttonPadding} ${
          dontUnderstand
            ? 'bg-[var(--lc-accent-soft)] text-[var(--lc-accent)] border-[var(--lc-accent-border)]'
            : 'bg-[var(--lc-surface-subtle)] text-[var(--lc-text-secondary)] border-[var(--lc-border)] hover:border-[var(--lc-border-strong)] hover:text-[var(--lc-text)]'
        }`}
        title="Toggle Don't Understand status"
      >
        <HelpCircle className={`${iconSize} ${dontUnderstand ? 'text-[var(--lc-accent)]' : ''}`} />
        <span>Don't Understand</span>
      </button>
    </div>
  );
};
