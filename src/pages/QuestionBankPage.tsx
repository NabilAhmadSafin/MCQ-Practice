import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Edit,
  Play,
  RotateCcw,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Bookmark,
  Flame,
  HelpCircle,
  X,
  Layers,
  FolderOpen
} from 'lucide-react';
import {
  getQuestionsPaginated,
  deleteQuestion,
  deleteQuestions,
  bulkUpdateQuestions,
  toggleQuestionFlag,
  getAllUniqueSourceNames
} from '../services/questionService';
import { getAllSubjects, getChaptersBySubject, getAllChapters } from '../services/subjectService';
import { getQuestionStatsMap } from '../services/attemptService';
import { getCommonInfoById } from '../services/commonInfoService';
import { toRomanNumeral } from '../utils/romanNumerals';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { FlagIcons } from '../components/common/FlagIcons';
import { RichContentRenderer } from '../components/common/RichContentRenderer';
import { ImageLightbox } from '../components/common/ImageLightbox';
import type { Question, QuestionFilter, Subject, Chapter, QuestionStats, QuestionType, CommonInformation } from '../types';
import { GUIDE_OPTIONS, QUESTION_TYPE_LABELS } from '../types';
import { AddQuestionPage } from './AddQuestionPage';
import type { NavSection } from '../components/layout/Sidebar';

interface QuestionBankPageProps {
  onNavigate: (page: NavSection, params?: any) => void;
  onEditQuestion?: (questionId: string) => void;
  onStartPracticeWithFilter?: (filterParams: any) => void;
  initialFilter?: Partial<QuestionFilter>;
}

const SOURCE_TYPE_OPTIONS = ['Board', 'School'] as const;
const STATUS_OPTIONS = [
  { id: 'unattempted', label: 'Unattempted' },
  { id: 'wrong', label: 'Struggling / Wrong' },
  { id: 'attempted', label: 'Attempted' }
] as const;

export const QuestionBankPage: React.FC<QuestionBankPageProps> = ({
  onNavigate,
  onEditQuestion,
  onStartPracticeWithFilter,
  initialFilter
}) => {
  // Data state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Metadata
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [allChaptersMap, setAllChaptersMap] = useState<Map<string, Chapter>>(new Map());
  const [allSubjectsMap, setAllSubjectsMap] = useState<Map<string, Subject>>(new Map());
  const [availableSourceNames, setAvailableSourceNames] = useState<string[]>([]);

  // Search & Filters State
  const [filter, setFilter] = useState<QuestionFilter>({
    subjectId: initialFilter?.subjectId || '',
    chapterId: initialFilter?.chapterId || '',
    questionTypes: initialFilter?.questionTypes || (initialFilter?.questionType && initialFilter.questionType !== 'ALL' ? [initialFilter.questionType] : []),
    sourceTypes: initialFilter?.sourceTypes || [],
    guides: initialFilter?.guides || [],
    sourceName: initialFilter?.sourceName || '',
    flags: initialFilter?.flags || [],
    attemptStatuses: initialFilter?.attemptStatuses || [],
    searchQuery: initialFilter?.searchQuery || '',
    sortBy: 'createdAtDesc'
  });

  const [searchInput, setSearchInput] = useState(filter.searchQuery || '');
  const [showFilters, setShowFilters] = useState(false);
  const [commonInfoMap, setCommonInfoMap] = useState<Record<string, CommonInformation>>({});
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  // Selection & Bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modals & confirmation
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<Question | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkActionModal, setBulkActionModal] = useState<'subject' | 'flags' | 'source' | null>(null);
  const [bulkInputValue, setBulkInputValue] = useState<any>({});

  // Question Attempt Stats
  const [statsMap, setStatsMap] = useState<Map<string, QuestionStats>>(new Map());

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilter(prev => ({ ...prev, searchQuery: searchInput }));
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Load static metadata
  useEffect(() => {
    const loadMeta = async () => {
      const [subjs, chaps, srcNames] = await Promise.all([
        getAllSubjects(),
        getAllChapters(),
        getAllUniqueSourceNames()
      ]);
      setSubjects(subjs);
      setAllSubjectsMap(new Map(subjs.map(s => [s.id, s])));
      setAllChaptersMap(new Map(chaps.map(c => [c.id, c])));
      setAvailableSourceNames(srcNames);
    };
    loadMeta();
  }, []);

  // Update chapters dropdown when subject changes
  useEffect(() => {
    if (filter.subjectId) {
      getChaptersBySubject(filter.subjectId).then(setChapters);
    } else {
      setChapters([]);
    }
  }, [filter.subjectId]);

  // Fetch Questions
  const loadQuestions = async () => {
    setLoading(true);
    try {
      const [res, stats] = await Promise.all([
        getQuestionsPaginated(filter, currentPage, pageSize),
        getQuestionStatsMap()
      ]);

      setQuestions(res.items);
      setTotalQuestions(res.total);
      setTotalPages(res.totalPages);
      setStatsMap(stats);

      // Preload common information records for any questions in this page
      const infoIds = Array.from(
        new Set(res.items.map(q => q.commonInfoId).filter(Boolean))
      ) as string[];
      if (infoIds.length > 0) {
        Promise.all(infoIds.map(id => getCommonInfoById(id))).then(infos => {
          const map: Record<string, CommonInformation> = {};
          infos.forEach(info => {
            if (info) map[info.id] = info;
          });
          setCommonInfoMap(prev => ({ ...prev, ...map }));
        });
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [filter, currentPage]);

  // Handle Multi-Select helpers
  const toggleQuestionTypeFilter = (type: QuestionType) => {
    setFilter(prev => {
      const current = prev.questionTypes || [];
      const next = current.includes(type)
        ? current.filter(t => t !== type)
        : [...current, type];
      return { ...prev, questionTypes: next };
    });
    setCurrentPage(1);
  };

  const toggleSourceTypeFilter = (type: string) => {
    setFilter(prev => {
      const current = prev.sourceTypes || [];
      const next = current.includes(type)
        ? current.filter(t => t !== type)
        : [...current, type];
      return { ...prev, sourceTypes: next };
    });
    setCurrentPage(1);
  };

  const toggleGuideFilter = (guide: string) => {
    setFilter(prev => {
      const current = prev.guides || [];
      const next = current.includes(guide)
        ? current.filter(g => g !== guide)
        : [...current, guide];

      // When a single specific guide is selected, automatically sort by entry number
      let nextSortBy = prev.sortBy;
      if (next.length === 1) {
        nextSortBy = 'entryNoAsc';
      } else if (current.length === 1 && next.length !== 1 && (prev.sortBy === 'entryNoAsc' || prev.sortBy === 'entryNoDesc')) {
        nextSortBy = 'createdAtDesc';
      }

      return { ...prev, guides: next, sortBy: nextSortBy };
    });
    setCurrentPage(1);
  };

  const toggleStatusFilter = (status: 'attempted' | 'unattempted' | 'wrong') => {
    setFilter(prev => {
      const current = prev.attemptStatuses || [];
      const next = current.includes(status)
        ? current.filter(s => s !== status)
        : [...current, status];
      return { ...prev, attemptStatuses: next };
    });
    setCurrentPage(1);
  };

  const toggleFlagFilter = (flag: 'important' | 'veryImportant' | 'dontUnderstand') => {
    setFilter(prev => {
      const current = prev.flags || [];
      const next = current.includes(flag)
        ? current.filter(f => f !== flag)
        : [...current, flag];
      return { ...prev, flags: next };
    });
    setCurrentPage(1);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilter({
      subjectId: '',
      chapterId: '',
      questionTypes: [],
      sourceTypes: [],
      guides: [],
      sourceName: '',
      flags: [],
      attemptStatuses: [],
      searchQuery: '',
      sortBy: 'createdAtDesc'
    });
    setSearchInput('');
    setCurrentPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      filter.subjectId ||
        filter.chapterId ||
        (filter.questionTypes && filter.questionTypes.length > 0) ||
        (filter.sourceTypes && filter.sourceTypes.length > 0) ||
        (filter.guides && filter.guides.length > 0) ||
        filter.sourceName ||
        (filter.flags && filter.flags.length > 0) ||
        (filter.attemptStatuses && filter.attemptStatuses.length > 0) ||
        filter.searchQuery
    );
  }, [filter]);

  const hasSpecificGuide = Boolean(filter.guides && filter.guides.length === 1);
  const specificGuideName = hasSpecificGuide ? filter.guides![0] : null;

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === questions.length && questions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map(q => q.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Flag toggle
  const handleFlagClick = async (
    qId: string,
    flag: 'important' | 'veryImportant' | 'dontUnderstand'
  ) => {
    try {
      const nextVal = await toggleQuestionFlag(qId, flag);
      setQuestions(prev =>
        prev.map(q => (q.id === qId ? { ...q, [flag]: nextVal } : q))
      );
    } catch (err) {
      console.error('Failed to toggle flag:', err);
    }
  };

  // Single delete
  const handleSingleDeleteConfirm = async () => {
    if (!singleDeleteTarget) return;
    try {
      await deleteQuestion(singleDeleteTarget.id);
      setSingleDeleteTarget(null);
      loadQuestions();
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  // Bulk delete
  const handleBulkDeleteConfirm = async () => {
    try {
      await deleteQuestions(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsBulkDeleteModalOpen(false);
      loadQuestions();
    } catch (err) {
      console.error('Failed to bulk delete:', err);
    }
  };

  // Execute bulk action
  const handleExecuteBulkAction = async (actionType: any, actionValue?: any) => {
    try {
      await bulkUpdateQuestions(Array.from(selectedIds), {
        type: actionType,
        value: actionValue
      });
      setSelectedIds(new Set());
      setBulkActionModal(null);
      loadQuestions();
    } catch (err) {
      console.error('Failed bulk update:', err);
    }
  };

  if (editingQuestionId) {
    return (
      <div className="p-5 sm:p-7 lg:p-8 max-w-7xl mx-auto">
        <AddQuestionPage
          editId={editingQuestionId}
          onNavigate={(page, params) => {
            if (page === 'question-bank') {
              setEditingQuestionId(null);
              loadQuestions();
            } else {
              setEditingQuestionId(null);
              onNavigate(page, params);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-7 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--lc-text)] flex items-baseline gap-2.5">
            <span>Question Bank</span>
            <span className="text-sm font-medium text-indigo-300 tabular-nums">
              {totalQuestions} total
            </span>
          </h1>
          <p className="text-[13px] text-[var(--lc-text-secondary)] mt-1">
            Browse, multi-filter, search, and manage your personal question repository.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onStartPracticeWithFilter && (
            <button
              id="practice-these-btn"
              onClick={() => onStartPracticeWithFilter(filter)}
              className="lc-btn-primary flex items-center gap-2 px-4 py-2 text-xs tabular-nums"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Practice Filtered ({totalQuestions})</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="lc-card p-4 sm:p-5 space-y-4">
        {/* Quick Subject Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-medium text-[var(--lc-text-muted)] shrink-0">
            Subject:
          </span>
          <button
            type="button"
            onClick={() => {
              setFilter(prev => ({ ...prev, subjectId: '', chapterId: '' }));
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold shrink-0 transition whitespace-nowrap border ${
              !filter.subjectId
                ? 'bg-indigo-500/22 text-[var(--lc-text)] border-indigo-400/35'
                : 'bg-white/[0.04] text-[var(--lc-text-secondary)] hover:text-[var(--lc-text)] border-[var(--lc-border)]'
            }`}
          >
            All Subjects
          </button>
          {subjects.map(s => {
            const active = filter.subjectId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setFilter(prev => ({ ...prev, subjectId: s.id, chapterId: '' }));
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold shrink-0 transition whitespace-nowrap border ${
                  active
                    ? 'bg-indigo-500/22 text-[var(--lc-text)] border-indigo-400/35'
                    : 'bg-white/[0.04] text-[var(--lc-text-secondary)] hover:text-[var(--lc-text)] border-[var(--lc-border)]'
                }`}
              >
                {s.name}
              </button>
            );
          })}
        </div>

        {/* Top search & toggle row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[var(--lc-text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="bank-search-input"
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search in question text, options, explanation, or source name..."
              className="lc-input w-full text-xs pl-9 pr-8 py-2"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--lc-text-muted)] hover:text-[var(--lc-text)] text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              id="toggle-filters-btn"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-[10px] border transition whitespace-nowrap ${
                showFilters || hasActiveFilters
                  ? 'border-[var(--lc-accent-border)] bg-[var(--lc-accent-soft)] text-[var(--lc-accent)]'
                  : 'border-[var(--lc-border)] bg-[var(--lc-surface)] text-[var(--lc-text-secondary)] hover:text-[var(--lc-text)]'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>

            {hasActiveFilters && (
              <button
                id="clear-filters-btn"
                onClick={handleClearFilters}
                className="lc-btn-ghost flex items-center gap-1 px-3 py-2 text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            <select
              id="sort-by-select"
              value={filter.sortBy || (hasSpecificGuide ? 'entryNoAsc' : 'createdAtDesc')}
              onChange={e =>
                setFilter(prev => ({ ...prev, sortBy: e.target.value as any }))
              }
              className={`lc-select text-xs py-2 px-2.5 font-medium ${
                filter.sortBy === 'entryNoAsc' || filter.sortBy === 'entryNoDesc'
                  ? 'border-[var(--lc-accent-border)] text-[var(--lc-accent)]'
                  : ''
              }`}
            >
              {hasSpecificGuide && (
                <>
                  <option value="entryNoAsc">
                    {specificGuideName} Entry # (Low → High)
                  </option>
                  <option value="entryNoDesc">
                    {specificGuideName} Entry # (High → Low)
                  </option>
                </>
              )}
              <option value="createdAtDesc">Newest First</option>
              <option value="createdAtAsc">Oldest First</option>
              <option value="question">Alphabetical (A-Z)</option>
              {!hasSpecificGuide && (
                <>
                  <option value="entryNoAsc">Guide Entry # (Ascending)</option>
                  <option value="entryNoDesc">Guide Entry # (Descending)</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* EXPANDABLE MULTI-OPTION FILTER PANEL */}
        {showFilters && (
          <div className="pt-4 border-t border-[var(--lc-divider)] space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--lc-text-secondary)] mb-1.5">
                  Subject
                </label>
                <select
                  id="filter-subject-select"
                  value={filter.subjectId || ''}
                  onChange={e => {
                    setFilter(prev => ({
                      ...prev,
                      subjectId: e.target.value,
                      chapterId: ''
                    }));
                    setCurrentPage(1);
                  }}
                  className="lc-select w-full text-xs p-2"
                >
                  <option value="">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--lc-text-secondary)] mb-1.5">
                  Chapter
                </label>
                <select
                  id="filter-chapter-select"
                  value={filter.chapterId || ''}
                  onChange={e => {
                    setFilter(prev => ({ ...prev, chapterId: e.target.value }));
                    setCurrentPage(1);
                  }}
                  disabled={!filter.subjectId || chapters.length === 0}
                  className="lc-select w-full text-xs p-2 disabled:opacity-50"
                >
                  <option value="">All Chapters</option>
                  {chapters.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--lc-text-secondary)] mb-1.5">
                  Search source name
                </label>
                <input
                  type="text"
                  list="bankSourceNameList"
                  value={filter.sourceName || ''}
                  onChange={e => {
                    setFilter(prev => ({ ...prev, sourceName: e.target.value }));
                    setCurrentPage(1);
                  }}
                  placeholder="e.g. Dhaka Board or Notre Dame"
                  className="lc-input w-full text-xs p-2"
                />
                <datalist id="bankSourceNameList">
                  {availableSourceNames.map(s => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Question Type Filter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--lc-text-secondary)]">
                  Question type / প্রশ্নের ধরন (multi-select)
                </label>
                {(filter.questionTypes && filter.questionTypes.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setFilter(prev => ({ ...prev, questionTypes: [] }))}
                    className="text-[11px] font-medium text-[var(--lc-accent)] hover:underline"
                  >
                    Clear question types
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { type: 'STANDARD' as QuestionType, label: 'Standard MCQ' },
                  { type: 'MULTIPLE_STATEMENT' as QuestionType, label: 'বহুপদী সমাপ্তিসূচক' },
                  { type: 'COMMON_STEM' as QuestionType, label: 'অভিন্ন তথ্যভিত্তিক' }
                ].map(t => {
                  const isChecked = (filter.questionTypes || []).includes(t.type);
                  return (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => toggleQuestionTypeFilter(t.type)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold border transition whitespace-nowrap ${
                        isChecked
                          ? 'bg-[var(--lc-accent)] text-white border-[var(--lc-accent)]'
                          : 'bg-white/[0.04] text-[var(--lc-text-secondary)] border-[var(--lc-border)] hover:text-[var(--lc-text)]'
                      }`}
                    >
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Source Type Filter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--lc-text-secondary)]">
                  Source type (multi-select)
                </label>
                {(filter.sourceTypes && filter.sourceTypes.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setFilter(prev => ({ ...prev, sourceTypes: [] }))}
                    className="text-[11px] font-medium text-[var(--lc-accent)] hover:underline"
                  >
                    Clear source types
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {SOURCE_TYPE_OPTIONS.map(st => {
                  const isChecked = (filter.sourceTypes || []).includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => toggleSourceTypeFilter(st)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold border transition whitespace-nowrap ${
                        isChecked
                          ? 'bg-[var(--lc-accent)] text-white border-[var(--lc-accent)]'
                          : 'bg-white/[0.04] text-[var(--lc-text-secondary)] border-[var(--lc-border)] hover:text-[var(--lc-text)]'
                      }`}
                    >
                      <span>{st}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Guide Filter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--lc-text-secondary)]">
                  Guide (multi-select)
                </label>
                {(filter.guides && filter.guides.length > 0) && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilter(prev => ({
                        ...prev,
                        guides: [],
                        sortBy:
                          prev.sortBy === 'entryNoAsc' || prev.sortBy === 'entryNoDesc'
                            ? 'createdAtDesc'
                            : prev.sortBy
                      }))
                    }
                    className="text-[11px] font-medium text-[var(--lc-accent)] hover:underline"
                  >
                    Clear guides
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {GUIDE_OPTIONS.map(g => {
                  const isChecked = (filter.guides || []).includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGuideFilter(g)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold border transition whitespace-nowrap ${
                        isChecked
                          ? 'bg-[var(--lc-accent)] text-white border-[var(--lc-accent)]'
                          : 'bg-white/[0.04] text-[var(--lc-text-secondary)] border-[var(--lc-border)] hover:text-[var(--lc-text)]'
                      }`}
                    >
                      <span>{g}</span>
                    </button>
                  );
                })}
              </div>

              {hasSpecificGuide && (
                <div className="mt-2.5 flex items-center justify-between gap-2 px-3 py-2 rounded-[10px] bg-[var(--lc-accent-soft)] border border-[var(--lc-accent-border)] text-xs text-[var(--lc-text)]">
                  <span>
                    Questions sorted by <strong className="font-semibold text-indigo-300">{specificGuideName}</strong> Entry No.
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFilter(prev => ({
                        ...prev,
                        sortBy: prev.sortBy === 'entryNoDesc' ? 'entryNoAsc' : 'entryNoDesc'
                      }))
                    }
                    className="text-xs font-semibold text-indigo-300 hover:underline tabular-nums"
                  >
                    {filter.sortBy === 'entryNoDesc' ? 'Sort 1 → 999' : 'Sort 999 → 1'}
                  </button>
                </div>
              )}
            </div>

            {/* Practice Status Filter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--lc-text-secondary)]">
                  Practice status (multi-select)
                </label>
                {(filter.attemptStatuses && filter.attemptStatuses.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setFilter(prev => ({ ...prev, attemptStatuses: [] }))}
                    className="text-[11px] text-[var(--lc-accent)] hover:underline"
                  >
                    Clear status
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {STATUS_OPTIONS.map(opt => {
                  const isChecked = (filter.attemptStatuses || []).includes(opt.id as any);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleStatusFilter(opt.id as any)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold border transition whitespace-nowrap ${
                        isChecked
                          ? 'bg-[var(--lc-accent)] text-white border-[var(--lc-accent)]'
                          : 'bg-white/[0.04] text-[var(--lc-text-secondary)] border-[var(--lc-border)] hover:text-[var(--lc-text)]'
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Flags Filter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--lc-text-secondary)]">
                  Flags (multi-select)
                </label>
                {(filter.flags && filter.flags.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setFilter(prev => ({ ...prev, flags: [] }))}
                    className="text-[11px] text-[var(--lc-accent)] hover:underline"
                  >
                    Clear flags
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: 'important', label: 'Important', icon: Bookmark, activeClass: 'bg-[var(--lc-warning-soft)] text-[var(--lc-warning)] border-[var(--lc-warning)]/40' },
                  { id: 'veryImportant', label: 'Very Important', icon: Flame, activeClass: 'bg-[var(--lc-error-soft)] text-[var(--lc-error)] border-[var(--lc-error)]/40' },
                  { id: 'dontUnderstand', label: "Don't Understand", icon: HelpCircle, activeClass: 'bg-[var(--lc-accent-soft)] text-indigo-300 border-[var(--lc-accent-border)]' }
                ].map(flagItem => {
                  const isChecked = (filter.flags || []).includes(flagItem.id as any);
                  const Icon = flagItem.icon;
                  return (
                    <button
                      key={flagItem.id}
                      type="button"
                      onClick={() => toggleFlagFilter(flagItem.id as any)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-xs font-semibold border transition whitespace-nowrap ${
                        isChecked
                          ? flagItem.activeClass
                          : 'bg-white/[0.04] text-[var(--lc-text-secondary)] border-[var(--lc-border)] hover:text-[var(--lc-text)]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{flagItem.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Tags Bar (8px controls) */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-[var(--lc-border)] text-xs">
            <span className="text-[var(--lc-text-muted)] text-[11px] font-medium">Active:</span>

            {filter.subjectId && (
              <span className="lc-badge inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--lc-surface-subtle)] border border-[var(--lc-border)] text-[var(--lc-text)]">
                Subject: {allSubjectsMap.get(filter.subjectId)?.name || 'Selected'}
                <button
                  onClick={() => setFilter(prev => ({ ...prev, subjectId: '', chapterId: '' }))}
                  className="hover:text-[var(--lc-error)] ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filter.chapterId && (
              <span className="lc-badge inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--lc-surface-subtle)] border border-[var(--lc-border)] text-[var(--lc-text)]">
                Chapter: {allChaptersMap.get(filter.chapterId)?.name || 'Selected'}
                <button
                  onClick={() => setFilter(prev => ({ ...prev, chapterId: '' }))}
                  className="hover:text-[var(--lc-error)] ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filter.sourceTypes?.map(st => (
              <span
                key={st}
                className="lc-badge inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--lc-accent-soft)] text-[var(--lc-accent)]"
              >
                Type: {st}
                <button onClick={() => toggleSourceTypeFilter(st)} className="hover:text-[var(--lc-error)] ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filter.guides?.map(g => (
              <span
                key={g}
                className="lc-badge inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--lc-accent-soft)] text-[var(--lc-accent)]"
              >
                Guide: {g}
                <button onClick={() => toggleGuideFilter(g)} className="hover:text-[var(--lc-error)] ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filter.attemptStatuses?.map(st => (
              <span
                key={st}
                className="lc-badge inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--lc-surface-subtle)] border border-[var(--lc-border)] text-[var(--lc-text)]"
              >
                Status: {st}
                <button onClick={() => toggleStatusFilter(st)} className="hover:text-[var(--lc-error)] ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filter.flags?.map(f => (
              <span
                key={f}
                className="lc-badge inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--lc-warning-soft)] text-[var(--lc-warning)]"
              >
                Flag: {f}
                <button onClick={() => toggleFlagFilter(f)} className="hover:text-[var(--lc-error)] ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filter.sourceName && (
              <span className="lc-badge inline-flex items-center gap-1 px-2.5 py-0.5 bg-[var(--lc-surface-subtle)] border border-[var(--lc-border)] text-[var(--lc-text)]">
                Source: &quot;{filter.sourceName}&quot;
                <button
                  onClick={() => setFilter(prev => ({ ...prev, sourceName: '' }))}
                  className="hover:text-[var(--lc-error)] ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Floating Frosted Bulk Action Dock */}
      {selectedIds.size > 0 && (
        <div className="lc-glass rounded-[14px] px-4 py-3 flex flex-wrap items-center justify-between gap-3 animate-fadeIn sticky top-18 z-20">
          <div className="flex items-center gap-3">
            <span className="lc-badge text-xs px-2.5 py-1 bg-[var(--lc-accent)] text-white tabular-nums">
              {selectedIds.size} Selected
            </span>
            <span className="text-xs text-[var(--lc-text-secondary)] hidden sm:inline">
              Bulk actions for selected questions:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExecuteBulkAction('set_important')}
              className="lc-btn-secondary px-2.5 py-1.5 text-xs"
            >
              Mark Important
            </button>
            <button
              type="button"
              onClick={() => handleExecuteBulkAction('set_veryImportant')}
              className="lc-btn-secondary px-2.5 py-1.5 text-xs"
            >
              Mark Very Important
            </button>
            <button
              type="button"
              onClick={() => handleExecuteBulkAction('set_dontUnderstand')}
              className="lc-btn-secondary px-2.5 py-1.5 text-xs"
            >
              Mark Don&apos;t Understand
            </button>
            <button
              type="button"
              onClick={() => setBulkActionModal('subject')}
              className="lc-btn-secondary px-2.5 py-1.5 text-xs"
            >
              Move Subject / Chapter
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="lc-btn-danger px-3 py-1.5 text-xs"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Questions Table / List View */}
      <div className="lc-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-[var(--lc-text-secondary)]">
            <div className="inline-block w-6 h-6 border-2 border-[var(--lc-accent)] border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-[14px] bg-[var(--lc-surface-subtle)] border border-[var(--lc-border)] flex items-center justify-center mx-auto text-[var(--lc-text-muted)]">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-[var(--lc-text)] text-base">
              No questions found
            </h3>
            <p className="text-xs text-[var(--lc-text-secondary)] max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No questions matched your search or filter combination. Try resetting filters.'
                : 'Your question bank is empty. Import questions via Code or JSON.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={handleClearFilters}
                className="lc-btn-secondary px-4 py-2 text-xs"
              >
                Clear all filters
              </button>
            ) : (
              <button
                onClick={() => onNavigate('import-export', { tab: 'code' })}
                className="lc-btn-primary px-4 py-2 text-xs"
              >
                Import Questions
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--lc-divider)] bg-white/[0.025] text-xs font-medium text-[var(--lc-text-secondary)]">
                  <th className="py-3 px-4 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-[var(--lc-text-muted)] hover:text-[var(--lc-text)]"
                    >
                      {selectedIds.size === questions.length && questions.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[var(--lc-accent)]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Question prompt</th>
                  <th className="py-3 px-4 w-36">Subject / Chapter</th>
                  <th className="py-3 px-4 w-16 text-center">Answer</th>
                  <th className="py-3 px-4 w-48">
                    {hasSpecificGuide ? (
                      <span className="text-indigo-300 font-semibold inline-flex items-center gap-1 tabular-nums">
                        Sources ({specificGuideName} #{filter.sortBy === 'entryNoDesc' ? '↓' : '↑'})
                      </span>
                    ) : (
                      'Sources'
                    )}
                  </th>
                  <th className="py-3 px-4 w-28">Flags</th>
                  <th className="py-3 px-4 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--lc-border)] text-sm">
                {questions.map(q => {
                  const isSelected = selectedIds.has(q.id);
                  const isExpanded = expandedId === q.id;
                  const subjectName = allSubjectsMap.get(q.subjectId)?.name || 'Subject';
                  const chapterName = allChaptersMap.get(q.chapterId)?.name || 'Chapter';
                  const stat = statsMap.get(q.id);

                  const rawSources =
                    q.sources && q.sources.length > 0
                      ? q.sources
                      : [{ type: q.sourceType || 'Board', name: q.sourceName || '' }];

                  const questionSources = [...rawSources].sort((a, b) => {
                    const aMatch =
                      hasSpecificGuide &&
                      a.type?.toLowerCase() === 'guide' &&
                      a.name?.toLowerCase().trim() === specificGuideName?.toLowerCase().trim();
                    const bMatch =
                      hasSpecificGuide &&
                      b.type?.toLowerCase() === 'guide' &&
                      b.name?.toLowerCase().trim() === specificGuideName?.toLowerCase().trim();
                    if (aMatch && !bMatch) return -1;
                    if (!aMatch && bMatch) return 1;
                    return 0;
                  });

                  return (
                    <React.Fragment key={q.id}>
                      <tr
                        className={`hover:bg-[var(--lc-surface-subtle)] transition-colors ${
                          isSelected ? 'bg-[var(--lc-accent-soft)]' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(q.id)}
                            className="text-[var(--lc-text-muted)] hover:text-[var(--lc-text)]"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[var(--lc-accent)]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          <div
                            onClick={() => setExpandedId(isExpanded ? null : q.id)}
                            className="cursor-pointer group"
                          >
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap text-[11px] text-[var(--lc-text-muted)]">
                              <span className="font-medium text-indigo-300">
                                {QUESTION_TYPE_LABELS[q.questionType || 'STANDARD']}
                              </span>
                              {q.commonInfoId && commonInfoMap[q.commonInfoId]?.title && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-[var(--lc-text-secondary)] font-medium truncate max-w-xs">
                                    {commonInfoMap[q.commonInfoId].title}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="font-medium text-[var(--lc-text)] line-clamp-2 group-hover:text-indigo-300 transition-colors">
                              {q.question}
                            </div>
                            {stat && stat.totalAttempts > 0 && (
                              <div className="text-[11px] text-[var(--lc-text-muted)] mt-1 flex items-center gap-2 tabular-nums">
                                <span>{stat.totalAttempts} attempts</span>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={
                                    stat.accuracy >= 70
                                      ? 'text-emerald-400 font-semibold'
                                      : 'text-rose-400 font-semibold'
                                  }
                                >
                                  {stat.accuracy}% correct
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-semibold text-[var(--lc-text)] truncate">
                            {subjectName}
                          </div>
                          <div className="text-[var(--lc-text-secondary)] truncate mt-0.5">{chapterName}</div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-[8px] bg-white/[0.05] border border-[var(--lc-border)] text-[var(--lc-text)] text-xs font-semibold tabular-nums">
                            {q.correctAnswer}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <div className="space-y-0.5 max-w-[210px]">
                            {questionSources.map((s, sIdx) => {
                              const isGuide = s.type?.toLowerCase() === 'guide';
                              const isMatchingGuide =
                                hasSpecificGuide &&
                                isGuide &&
                                s.name?.toLowerCase().trim() === specificGuideName?.toLowerCase().trim();

                              return (
                                <div
                                  key={sIdx}
                                  className={`truncate text-[11px] ${
                                    isMatchingGuide
                                      ? 'text-indigo-300 font-medium'
                                      : 'text-[var(--lc-text-secondary)]'
                                  }`}
                                  title={`${s.type}: ${s.name}${s.entryNo ? ` (Entry #${s.entryNo})` : ''}`}
                                >
                                  <span className="text-[var(--lc-text-muted)]">{s.type}:</span>{' '}
                                  <span>{s.name}</span>
                                  {isGuide && s.entryNo && (
                                    <span className="ml-1 font-mono text-[10px] font-semibold text-indigo-300">
                                      #{s.entryNo}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleFlagClick(q.id, 'important')}
                              className={`p-1.5 rounded-[8px] hover:bg-[var(--lc-surface-subtle)] transition ${
                                q.important ? 'text-[var(--lc-warning)]' : 'text-[var(--lc-text-muted)]'
                              }`}
                              title={q.important ? 'Important (Click to toggle)' : 'Mark Important'}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${q.important ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFlagClick(q.id, 'veryImportant')}
                              className={`p-1.5 rounded-[8px] hover:bg-[var(--lc-surface-subtle)] transition ${
                                q.veryImportant ? 'text-[var(--lc-error)]' : 'text-[var(--lc-text-muted)]'
                              }`}
                              title={q.veryImportant ? 'Very Important (Click to toggle)' : 'Mark Very Important'}
                            >
                              <Flame className={`w-3.5 h-3.5 ${q.veryImportant ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFlagClick(q.id, 'dontUnderstand')}
                              className={`p-1.5 rounded-[8px] hover:bg-[var(--lc-surface-subtle)] transition ${
                                q.dontUnderstand ? 'text-[var(--lc-accent)]' : 'text-[var(--lc-text-muted)]'
                              }`}
                              title={q.dontUnderstand ? "Don't Understand (Click to toggle)" : "Mark Don't Understand"}
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (onEditQuestion) onEditQuestion(q.id);
                                else setEditingQuestionId(q.id);
                              }}
                              className="p-1.5 text-[var(--lc-text-muted)] hover:text-[var(--lc-text)] hover:bg-[var(--lc-surface-subtle)] rounded-[8px] transition"
                              title="Edit Question"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSingleDeleteTarget(q)}
                              className="p-1.5 text-[var(--lc-text-muted)] hover:text-[var(--lc-error)] hover:bg-[var(--lc-error-soft)] rounded-[8px] transition"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : q.id)}
                              className="p-1.5 text-[var(--lc-text-muted)] hover:text-[var(--lc-accent)] hover:bg-[var(--lc-surface-subtle)] rounded-[8px] transition"
                              title="Preview Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-white/[0.025] border-b border-[var(--lc-divider)]">
                          <td colSpan={7} className="p-5 sm:p-6 space-y-4">
                            <div className="space-y-1.5">
                              <span className="text-xs font-medium text-indigo-300 block">
                                Question prompt
                              </span>
                              <RichContentRenderer
                                content={q.question}
                                contentBlocks={q.contentBlocks}
                                images={q.images}
                                className="text-sm text-[var(--lc-text)] font-medium leading-relaxed"
                              />
                            </div>

                            {q.commonInfoId && commonInfoMap[q.commonInfoId] && (
                              <div className="p-3.5 rounded-[12px] bg-[var(--lc-accent-soft)] border border-[var(--lc-accent-border)] text-xs space-y-1.5">
                                <div className="font-semibold text-indigo-300">
                                  উদ্দীপক / অনুচ্ছেদ: {commonInfoMap[q.commonInfoId].title || 'অভিন্ন তথ্যভিত্তিক'}
                                </div>
                                <RichContentRenderer
                                  content={commonInfoMap[q.commonInfoId].content}
                                  contentBlocks={commonInfoMap[q.commonInfoId].contentBlocks}
                                  images={commonInfoMap[q.commonInfoId].images}
                                  className="text-[var(--lc-text)] leading-relaxed"
                                />
                              </div>
                            )}

                            {q.statements && q.statements.length > 0 && (
                              <div className="p-3.5 rounded-[12px] bg-white/[0.03] border border-[var(--lc-border)] text-xs space-y-1.5">
                                <div className="font-semibold text-[var(--lc-text)]">
                                  বক্তব্যসমূহ (Statements):
                                </div>
                                <div className="space-y-1 pl-1">
                                  {q.statements.map((stmt, sIdx) => (
                                    <div key={sIdx} className="flex items-start gap-2">
                                      <span className="font-mono font-semibold text-[11px] text-[var(--lc-text-muted)] shrink-0">
                                        {toRomanNumeral(sIdx + 1)}.
                                      </span>
                                      <div className="flex-1 text-[var(--lc-text)]">
                                        <RichContentRenderer content={stmt} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(['A', 'B', 'C', 'D'] as const).map(k => {
                                const optImg = q.optionImages?.[k];
                                return (
                                  <div
                                    key={k}
                                    className={`p-2.5 rounded-[10px] border text-xs flex items-start gap-2 ${
                                      q.correctAnswer === k
                                        ? 'border-emerald-400/40 bg-emerald-500/12 text-[var(--lc-text)] font-medium'
                                        : 'border-[var(--lc-border)] bg-white/[0.03] text-[var(--lc-text-secondary)]'
                                    }`}
                                  >
                                    <span className="w-5 h-5 rounded-[6px] bg-white/[0.05] border border-[var(--lc-border)] flex items-center justify-center text-[10px] font-semibold shrink-0">
                                      {k}
                                    </span>
                                    <div className="flex-1">
                                      <RichContentRenderer content={q.options[k] || '—'} />
                                      {optImg && (
                                        <div className="mt-1">
                                          <ImageLightbox
                                            image={optImg}
                                            alt={`Option ${k} diagram`}
                                            className="max-h-16 object-contain rounded-[6px]"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {(q.explanation || (q.explanationImages && q.explanationImages.length > 0)) && (
                              <div className="pt-3 border-t border-[var(--lc-divider)] text-xs space-y-1">
                                <span className="font-semibold text-[var(--lc-text)]">
                                  Explanation / Derivation:
                                </span>
                                <div className="text-[var(--lc-text-secondary)] mt-1">
                                  <RichContentRenderer
                                    content={q.explanation || ''}
                                    images={q.explanationImages}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="text-xs flex items-center gap-2 flex-wrap text-[var(--lc-text-muted)]">
                              <span className="font-medium text-[var(--lc-text-secondary)]">Sources:</span>
                              {questionSources.map((s, idx) => (
                                <React.Fragment key={idx}>
                                  {idx > 0 && <span aria-hidden="true">·</span>}
                                  <span>
                                    {s.type}: {s.name}{s.entryNo ? ` (#${s.entryNo})` : ''}
                                  </span>
                                </React.Fragment>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && totalQuestions > 0 && (
          <div className="p-4 border-t border-[var(--lc-border)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--lc-text-secondary)] tabular-nums">
            <div>
              Showing{' '}
              <span className="font-semibold text-[var(--lc-text)]">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-[var(--lc-text)]">
                {Math.min(currentPage * pageSize, totalQuestions)}
              </span>{' '}
              of <span className="font-semibold text-[var(--lc-text)]">{totalQuestions}</span> questions
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="lc-btn-secondary p-1.5 rounded-[8px] disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-medium text-[var(--lc-text)]">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="lc-btn-secondary p-1.5 rounded-[8px] disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Single Delete Modal */}
      <ConfirmModal
        isOpen={Boolean(singleDeleteTarget)}
        title="Delete Question"
        message={`Are you sure you want to delete this question?\n\n"${singleDeleteTarget?.question.slice(0, 100)}..."\n\nAll historical attempts on this question will also be removed.`}
        confirmText="Delete"
        onConfirm={handleSingleDeleteConfirm}
        onCancel={() => setSingleDeleteTarget(null)}
      />

      {/* Bulk Delete Modal */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title="Delete Multiple Questions"
        message={`You are about to delete ${selectedIds.size} questions.\n\nThis action cannot be undone.`}
        confirmText={`Delete ${selectedIds.size} Questions`}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
      />

      {/* Bulk Move Subject/Chapter Modal */}
      {bulkActionModal === 'subject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[4px]">
          <div className="lc-modal p-5 max-w-sm w-full space-y-4 animate-lc-modal">
            <h3 className="font-semibold text-[var(--lc-text)] text-base">
              Move {selectedIds.size} Questions
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--lc-text-secondary)]">Target Subject</label>
                <select
                  value={bulkInputValue.subjectId || ''}
                  onChange={e => setBulkInputValue({ subjectId: e.target.value, chapterId: '' })}
                  className="lc-select w-full mt-1 p-2 text-xs"
                >
                  <option value="">Select subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {bulkInputValue.subjectId && (
                <div>
                  <label className="text-xs font-semibold text-[var(--lc-text-secondary)]">Target Chapter</label>
                  <select
                    value={bulkInputValue.chapterId || ''}
                    onChange={e => setBulkInputValue({ ...bulkInputValue, chapterId: e.target.value })}
                    className="lc-select w-full mt-1 p-2 text-xs"
                  >
                    <option value="">Select chapter</option>
                    {Array.from(allChaptersMap.values())
                      .filter((c: Chapter) => c.subjectId === bulkInputValue.subjectId)
                      .map((c: Chapter) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkActionModal(null)}
                className="lc-btn-secondary px-4 py-2 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!bulkInputValue.subjectId || !bulkInputValue.chapterId}
                onClick={() => handleExecuteBulkAction('set_subject_chapter', bulkInputValue)}
                className="lc-btn-primary flex-1 py-2 text-xs disabled:opacity-40"
              >
                Apply Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
