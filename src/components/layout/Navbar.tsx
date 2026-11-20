import React from 'react';
import { Menu, Play, Plus } from 'lucide-react';
import type { NavSection } from './Sidebar';

interface NavbarProps {
  currentSection: NavSection;
  onOpenMobileSidebar: () => void;
  onNavigate: (section: NavSection) => void;
  totalQuestions?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentSection,
  onOpenMobileSidebar,
  onNavigate,
  totalQuestions
}) => {
  const titles: Record<NavSection, string> = {
    dashboard: 'Dashboard',
    practice: 'Practice Mode',
    'question-bank': 'Question Bank',
    subjects: 'Subjects',
    chapters: 'Chapters',
    'add-question': 'Add New Question',
    'import-export': 'Import, Export & Restore',
    'wrong-questions': 'Wrong Questions Review',
    'important-questions': 'Flagged Questions',
    'practice-history': 'Practice History',
    statistics: 'Performance Statistics',
    settings: 'Settings'
  };

  return (
    <header className="lc-glass sticky top-0 z-30 border-x-0 border-t-0 px-4 sm:px-6 h-16 flex items-center shrink-0">
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 rounded-[10px] text-[var(--lc-text-secondary)] hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-base sm:text-lg font-semibold text-[var(--lc-text)] tracking-tight truncate">
            {titles[currentSection] || 'MCQ Practice'}
          </h2>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {totalQuestions !== undefined && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--lc-text-secondary)] tabular-nums pr-2 border-r border-[var(--lc-divider)]">
              <span className="font-semibold text-[var(--lc-text)]">
                {totalQuestions.toLocaleString()}
              </span>
              <span>questions</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => onNavigate('add-question')}
            className="lc-btn-secondary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Question</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('practice')}
            className="lc-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Practice</span>
          </button>
        </div>
      </div>
    </header>
  );
};
