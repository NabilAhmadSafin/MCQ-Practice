import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FolderTree,
  HelpCircle,
  PlusCircle,
  FileCode2,
  PlayCircle,
  History,
  XCircle,
  Star,
  BarChart3,
  Settings,
  X
} from 'lucide-react';

export type NavSection =
  | 'dashboard'
  | 'subjects'
  | 'chapters'
  | 'question-bank'
  | 'add-question'
  | 'import-questions'
  | 'practice'
  | 'practice-history'
  | 'wrong-questions'
  | 'important-questions'
  | 'statistics'
  | 'settings';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  isOpenMobile,
  onCloseMobile
}) => {
  const navItems = [
    { id: 'dashboard' as NavSection, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'practice' as NavSection, label: 'Practice Mode', icon: PlayCircle, highlight: true },
    { id: 'question-bank' as NavSection, label: 'Question Bank', icon: HelpCircle },
    { id: 'subjects' as NavSection, label: 'Subjects', icon: BookOpen },
    { id: 'chapters' as NavSection, label: 'Chapters', icon: FolderTree },
    { id: 'add-question' as NavSection, label: 'Add Question', icon: PlusCircle },
    { id: 'import-questions' as NavSection, label: 'Import (Code & Word)', icon: FileCode2 },
    { id: 'wrong-questions' as NavSection, label: 'Wrong Questions', icon: XCircle },
    { id: 'important-questions' as NavSection, label: 'Flagged Questions', icon: Star },
    { id: 'practice-history' as NavSection, label: 'Practice History', icon: History },
    { id: 'statistics' as NavSection, label: 'Statistics', icon: BarChart3 },
    { id: 'settings' as NavSection, label: 'Settings & Export', icon: Settings }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-zinc-900 text-zinc-300 flex flex-col border-r border-zinc-800 transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-xs">
              M
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-tight leading-none">
                MCQ Practice
              </h1>
              <span className="text-[11px] text-zinc-400 font-mono">Personal Engine</span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1 text-zinc-400 hover:text-white rounded-md"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : item.highlight
                    ? 'text-indigo-400 hover:bg-zinc-800/80 hover:text-indigo-300'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-indigo-400' : 'text-zinc-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-zinc-800 text-xs text-zinc-400">
          <div className="px-2 py-1.5 rounded-md bg-zinc-800/50 flex items-center justify-between">
            <span>Client IndexedDB</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Active"></span>
          </div>
        </div>
      </aside>
    </>
  );
};
