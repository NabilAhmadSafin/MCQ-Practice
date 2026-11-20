import React, { useState } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FolderTree,
  HelpCircle,
  PlusCircle,
  ArrowLeftRight,
  PlayCircle,
  History,
  XCircle,
  Star,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  type LucideIcon
} from 'lucide-react';

export type NavSection =
  | 'dashboard'
  | 'subjects'
  | 'chapters'
  | 'question-bank'
  | 'add-question'
  | 'import-export'
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

interface NavGroup {
  title: string;
  items: {
    id: NavSection;
    label: string;
    icon: LucideIcon;
    highlight?: boolean;
  }[];
}

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'mcq_sidebar_collapsed';

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  isOpenMobile,
  onCloseMobile
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage restrictions
      }
      return next;
    });
  };

  const navGroups: NavGroup[] = [
    {
      title: 'Study',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'practice', label: 'Practice Mode', icon: PlayCircle, highlight: true }
      ]
    },
    {
      title: 'Bank & Curriculum',
      items: [
        { id: 'question-bank', label: 'Question Bank', icon: HelpCircle },
        { id: 'add-question', label: 'Add Question', icon: PlusCircle },
        { id: 'subjects', label: 'Subjects', icon: BookOpen },
        { id: 'chapters', label: 'Chapters', icon: FolderTree }
      ]
    },
    {
      title: 'Review & Insights',
      items: [
        { id: 'wrong-questions', label: 'Wrong Questions', icon: XCircle },
        { id: 'important-questions', label: 'Flagged Questions', icon: Star },
        { id: 'practice-history', label: 'Practice History', icon: History },
        { id: 'statistics', label: 'Statistics', icon: BarChart3 }
      ]
    },
    {
      title: 'Data & Settings',
      items: [
        { id: 'import-export', label: 'Import, Export & Restore', icon: ArrowLeftRight },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-md md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`lc-glass fixed md:static inset-y-0 left-0 z-50 text-[var(--lc-text-secondary)] flex flex-col border-y-0 border-l-0 transition-[width,transform] duration-200 ease-in-out shrink-0 ${
          isCollapsed ? 'w-64 md:w-[72px]' : 'w-64'
        } ${isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div
          className={`flex items-center justify-between h-16 border-b border-[var(--lc-divider)] shrink-0 ${
            isCollapsed ? 'px-5 md:px-0 md:justify-center' : 'px-5'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-indigo-500 via-indigo-400 to-sky-400 flex items-center justify-center font-bold text-white text-sm shadow-[0_6px_18px_rgba(99,102,241,0.38)] border border-white/25 shrink-0">
              M
            </div>
            <div className={`min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
              <div className="text-sm font-semibold text-[var(--lc-text)] tracking-tight leading-tight truncate">
                MCQ Practice
              </div>
              <div className="text-[11px] text-[var(--lc-text-muted)] truncate">
                Study Workspace
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-[var(--lc-text-secondary)] hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grouped Navigation */}
        <nav
          className={`flex-1 overflow-y-auto py-4 ${
            isCollapsed ? 'px-3 md:px-2.5 space-y-5 md:space-y-2' : 'px-3 space-y-5'
          }`}
        >
          {navGroups.map((group, groupIndex) => (
            <div key={group.title} className="space-y-1">
              {groupIndex > 0 && isCollapsed && (
                <div
                  className="hidden md:block h-px bg-[var(--lc-divider)] mx-2 my-2"
                  aria-hidden="true"
                />
              )}
              <div
                className={`px-3 pb-1 text-[11px] font-medium text-[var(--lc-text-muted)] tracking-wide ${
                  isCollapsed ? 'md:hidden' : ''
                }`}
              >
                {group.title}
              </div>

              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = currentSection === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    title={item.label}
                    aria-label={item.label}
                    onClick={() => {
                      onSelectSection(item.id);
                      onCloseMobile();
                    }}
                    className={`group relative flex items-center py-2 rounded-[10px] text-[13px] font-medium transition-all text-left whitespace-nowrap ${
                      isCollapsed
                        ? 'w-full gap-3 px-3 md:w-11 md:h-10 md:mx-auto md:px-0 md:gap-0 md:justify-center'
                        : 'w-full gap-3 px-3'
                    } ${
                      isActive
                        ? 'bg-indigo-500/18 text-[var(--lc-text)] border border-indigo-400/32 shadow-[0_4px_14px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.14)]'
                        : item.highlight
                        ? 'text-indigo-300 hover:bg-white/[0.06] hover:text-white border border-transparent'
                        : 'text-[var(--lc-text-secondary)] hover:bg-white/[0.06] hover:text-[var(--lc-text)] border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? 'text-indigo-300'
                          : item.highlight
                          ? 'text-indigo-400'
                          : 'text-[var(--lc-text-muted)] group-hover:text-[var(--lc-text-secondary)]'
                      }`}
                    />
                    <span className={`truncate ${isCollapsed ? 'md:hidden' : ''}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Desktop Collapse/Expand Toggle & Mobile Footer */}
        <div
          className={`border-t border-[var(--lc-divider)] shrink-0 ${
            isCollapsed ? 'px-3 md:px-2.5 py-3' : 'px-3 py-3'
          }`}
        >
          <button
            type="button"
            onClick={handleToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Shorten sidebar to icons'}
            title={isCollapsed ? 'Expand sidebar' : 'Shorten sidebar to icons'}
            className={`hidden md:flex items-center rounded-[10px] text-[13px] font-medium text-[var(--lc-text-secondary)] hover:text-[var(--lc-text)] hover:bg-white/[0.06] border border-transparent hover:border-[var(--lc-border)] transition-all whitespace-nowrap ${
              isCollapsed
                ? 'w-11 h-10 mx-auto justify-center px-0'
                : 'w-full gap-3 px-3 py-2'
            }`}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="w-4 h-4 shrink-0 text-[var(--lc-text-muted)]" />
                <span className="truncate">Shorten sidebar</span>
              </>
            )}
          </button>

          <div className="md:hidden px-2 py-0.5 text-[11px] text-[var(--lc-text-muted)]">
            Local SQLite Workspace
          </div>
        </div>
      </aside>
    </>
  );
};

