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
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  const buttonPadding = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-1 text-xs';

  if (!interactive) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {important && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60"
            title="Important"
          >
            <Star className={`${iconSize} fill-amber-500 text-amber-500`} />
            <span>Important</span>
          </span>
        )}
        {veryImportant && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60"
            title="Very Important"
          >
            <Flame className={`${iconSize} fill-rose-500 text-rose-500`} />
            <span>Very Important</span>
          </span>
        )}
        {dontUnderstand && (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60"
            title="Don't Understand"
          >
            <HelpCircle className={`${iconSize} text-purple-600 dark:text-purple-400`} />
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
        className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all ${buttonPadding} ${
          important
            ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700 shadow-xs'
            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
        }`}
        title="Toggle Important status"
      >
        <Star className={`${iconSize} ${important ? 'fill-amber-500 text-amber-500' : ''}`} />
        <span>Important</span>
      </button>

      <button
        type="button"
        onClick={onToggleVeryImportant}
        className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all ${buttonPadding} ${
          veryImportant
            ? 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700 shadow-xs'
            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
        }`}
        title="Toggle Very Important status"
      >
        <Flame className={`${iconSize} ${veryImportant ? 'fill-rose-500 text-rose-500' : ''}`} />
        <span>Very Important</span>
      </button>

      <button
        type="button"
        onClick={onToggleDontUnderstand}
        className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all ${buttonPadding} ${
          dontUnderstand
            ? 'bg-purple-100 text-purple-900 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-700 shadow-xs'
            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
        }`}
        title="Toggle Don't Understand status"
      >
        <HelpCircle className={`${iconSize} ${dontUnderstand ? 'text-purple-600 dark:text-purple-300' : ''}`} />
        <span>Don't Understand</span>
      </button>
    </div>
  );
};
