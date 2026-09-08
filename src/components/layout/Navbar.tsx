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
    'import-questions': 'Import Questions',
    'wrong-questions': 'Wrong Questions Review',
    'important-questions': 'Flagged Questions',
    'practice-history': 'Practice History',
    statistics: 'Performance Statistics',
    settings: 'Settings & Data Export'
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {titles[currentSection] || 'MCQ Practice'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {totalQuestions !== undefined && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-400">
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">{totalQuestions}</span>
              <span>Questions</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => onNavigate('add-question')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Question</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('practice')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Practice</span>
          </button>
        </div>
      </div>
    </header>
  );
};
