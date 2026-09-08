import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
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
import { ConfirmModal } from '../components/common/ConfirmModal';
import { FlagIcons } from '../components/common/FlagIcons';
import type { Question, QuestionFilter, Subject, Chapter, QuestionStats } from '../types';
import { GUIDE_OPTIONS } from '../types';

interface QuestionBankPageProps {
  onNavigate: (page: string, params?: any) => void;
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
      return { ...prev, guides: next };
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
        (filter.sourceTypes && filter.sourceTypes.length > 0) ||
        (filter.guides && filter.guides.length > 0) ||
        filter.sourceName ||
        (filter.flags && filter.flags.length > 0) ||
        (filter.attemptStatuses && filter.attemptStatuses.length > 0) ||
        filter.searchQuery
    );
  }, [filter]);

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

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <span>Question Bank</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              {totalQuestions} total
            </span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Browse, multi-filter, search, and manage your personal question repository.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onStartPracticeWithFilter && (
            <button
              id="practice-these-btn"
              onClick={() => onStartPracticeWithFilter(filter)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Practice Filtered ({totalQuestions})</span>
            </button>
          )}

          <button
            id="add-question-top-btn"
            onClick={() => onNavigate('add-question')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 shadow-sm">
        {/* Top search & toggle row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="bank-search-input"
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search in question text, options, explanation, or source name..."
              className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 pl-9 pr-8 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              id="toggle-filters-btn"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition ${
                showFilters || hasActiveFilters
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300'
                  : 'border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                id="clear-filters-btn"
                onClick={handleClearFilters}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            <select
              id="sort-by-select"
              value={filter.sortBy || 'createdAtDesc'}
              onChange={e =>
                setFilter(prev => ({ ...prev, sortBy: e.target.value as any }))
              }
              className="text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 py-2 px-2.5 text-zinc-800 dark:text-zinc-200 focus:outline-indigo-500"
            >
              <option value="createdAtDesc">Newest First</option>
              <option value="createdAtAsc">Oldest First</option>
              <option value="question">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* EXPANDABLE MULTI-OPTION FILTER PANEL */}
        {showFilters && (
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4 animate-in fade-in">
            {/* Subject & Chapter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
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
                  className="w-full text-xs rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2 text-zinc-800 dark:text-zinc-200"
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
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
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
                  className="w-full text-xs rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2 text-zinc-800 dark:text-zinc-200 disabled:opacity-50"
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
                <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Search Source Name
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
                  className="w-full text-xs rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-2 text-zinc-800 dark:text-zinc-200"
                />
                <datalist id="bankSourceNameList">
                  {availableSourceNames.map(s => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Source Type Filter Section (Multiple Choice) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Source Type (Choose Multiple)
                </label>
                {(filter.sourceTypes && filter.sourceTypes.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setFilter(prev => ({ ...prev, sourceTypes: [] }))}
                    className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                        isChecked
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <span>{st}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Guide Filter Section (Multiple Choice: panjre, lecture, royal, chorcha, eprosnobank) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Guide (Choose Multiple)
                </label>
                {(filter.guides && filter.guides.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setFilter(prev => ({ ...prev, guides: [] }))}
                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline"
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                        isChecked
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <span>{g}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Practice Status Filter Section (Multiple Choice) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Practice Status (Choose Multiple)
                </label>
                {(filter.attemptStatuses && filter.attemptStatuses.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setFilter(prev => ({ ...prev, attemptStatuses: [] }))}
                    className="text-[10px] text-zinc-500 hover:underline"
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
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                        isChecked
                          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Flags Filter Section (Multiple Choice) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Flags (Choose Multiple)
                </label>
                {(filter.flags && filter.flags.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setFilter(prev => ({ ...prev, flags: [] }))}
                    className="text-[10px] text-zinc-500 hover:underline"
                  >
                    Clear flags
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: 'important', label: 'Important', icon: Bookmark, activeBg: 'bg-amber-500 text-white border-amber-500' },
                  { id: 'veryImportant', label: 'Very Important', icon: Flame, activeBg: 'bg-rose-500 text-white border-rose-500' },
                  { id: 'dontUnderstand', label: "Don't Understand", icon: HelpCircle, activeBg: 'bg-purple-600 text-white border-purple-600' }
                ].map(flagItem => {
                  const isChecked = (filter.flags || []).includes(flagItem.id as any);
                  const Icon = flagItem.icon;
                  return (
                    <button
                      key={flagItem.id}
                      type="button"
                      onClick={() => toggleFlagFilter(flagItem.id as any)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                        isChecked
                          ? flagItem.activeBg
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
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

        {/* Active Filter Pills Bar */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-zinc-100 dark:border-zinc-800/60 text-xs">
            <span className="text-zinc-400 text-[11px] font-medium">Active:</span>

            {filter.subjectId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Subject: {allSubjectsMap.get(filter.subjectId)?.name || 'Selected'}
                <button
                  onClick={() => setFilter(prev => ({ ...prev, subjectId: '', chapterId: '' }))}
                  className="hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filter.chapterId && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Chapter: {allChaptersMap.get(filter.chapterId)?.name || 'Selected'}
                <button
                  onClick={() => setFilter(prev => ({ ...prev, chapterId: '' }))}
                  className="hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filter.sourceTypes?.map(st => (
              <span
                key={st}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
              >
                Type: {st}
                <button onClick={() => toggleSourceTypeFilter(st)} className="hover:text-rose-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filter.guides?.map(g => (
              <span
                key={g}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
              >
                Guide: {g}
                <button onClick={() => toggleGuideFilter(g)} className="hover:text-rose-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filter.attemptStatuses?.map(st => (
              <span
                key={st}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200"
              >
                Status: {st}
                <button onClick={() => toggleStatusFilter(st)} className="hover:text-rose-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filter.flags?.map(f => (
              <span
                key={f}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              >
                Flag: {f}
                <button onClick={() => toggleFlagFilter(f)} className="hover:text-rose-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {filter.sourceName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                Source text: &quot;{filter.sourceName}&quot;
                <button
                  onClick={() => setFilter(prev => ({ ...prev, sourceName: '' }))}
                  className="hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bulk Action Bar (appears when items are selected) */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-900 text-white rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold bg-white text-indigo-950 px-2.5 py-0.5 rounded-full">
              {selectedIds.size} Selected
            </span>
            <span className="text-xs text-indigo-200 hidden sm:inline">
              Choose an action for selected questions:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExecuteBulkAction('set_important')}
              className="px-2.5 py-1 text-xs rounded-lg bg-indigo-800 hover:bg-indigo-700 text-indigo-100 transition"
            >
              ⭐ Mark Important
            </button>
            <button
              type="button"
              onClick={() => handleExecuteBulkAction('set_veryImportant')}
              className="px-2.5 py-1 text-xs rounded-lg bg-indigo-800 hover:bg-indigo-700 text-indigo-100 transition"
            >
              🔥 Mark Very Important
            </button>
            <button
              type="button"
              onClick={() => handleExecuteBulkAction('set_dontUnderstand')}
              className="px-2.5 py-1 text-xs rounded-lg bg-indigo-800 hover:bg-indigo-700 text-indigo-100 transition"
            >
              ❓ Mark Don&apos;t Understand
            </button>
            <button
              type="button"
              onClick={() => setBulkActionModal('subject')}
              className="px-2.5 py-1 text-xs rounded-lg bg-indigo-800 hover:bg-indigo-700 text-indigo-100 transition"
            >
              Move Subject / Chapter
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-2.5 py-1 text-xs rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Questions Table / List View */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-zinc-500">
            <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-base">
              No questions found
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No questions matched your search or filter combination. Try resetting filters.'
                : 'Your question bank is empty. Add new questions or import via Code/DOCX.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
              >
                Clear all filters
              </button>
            ) : (
              <button
                onClick={() => onNavigate('add-question')}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Add Your First Question
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      {selectedIds.size === questions.length && questions.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Question Prompt</th>
                  <th className="py-3 px-4 w-36">Subject / Chapter</th>
                  <th className="py-3 px-4 w-16 text-center">Answer</th>
                  <th className="py-3 px-4 w-48">Sources</th>
                  <th className="py-3 px-4 w-28">Flags</th>
                  <th className="py-3 px-4 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
                {questions.map(q => {
                  const isSelected = selectedIds.has(q.id);
                  const isExpanded = expandedId === q.id;
                  const subjectName = allSubjectsMap.get(q.subjectId)?.name || 'Subject';
                  const chapterName = allChaptersMap.get(q.chapterId)?.name || 'Chapter';
                  const stat = statsMap.get(q.id);

                  // Extract sources cleanly
                  const questionSources =
                    q.sources && q.sources.length > 0
                      ? q.sources
                      : [{ type: q.sourceType || 'Board', name: q.sourceName || '' }];

                  return (
                    <React.Fragment key={q.id}>
                      <tr
                        className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 transition-colors ${
                          isSelected ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(q.id)}
                            className="text-zinc-400 hover:text-zinc-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* Question Text */}
                        <td className="py-3 px-4">
                          <div
                            onClick={() => setExpandedId(isExpanded ? null : q.id)}
                            className="cursor-pointer group"
                          >
                            <div className="font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                              {q.question}
                            </div>
                            {stat && stat.totalAttempts > 0 && (
                              <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
                                <span>{stat.totalAttempts} attempts</span>
                                <span>•</span>
                                <span
                                  className={
                                    stat.accuracy >= 70
                                      ? 'text-emerald-600 font-semibold'
                                      : 'text-rose-600 font-semibold'
                                  }
                                >
                                  {stat.accuracy}% correct
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Subject & Chapter */}
                        <td className="py-3 px-4 text-xs">
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                            {subjectName}
                          </div>
                          <div className="text-zinc-500 truncate mt-0.5">{chapterName}</div>
                        </td>

                        {/* Answer */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold">
                            {q.correctAnswer}
                          </span>
                        </td>

                        {/* Sources */}
                        <td className="py-3 px-4 text-xs">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {questionSources.map((s, sIdx) => {
                              const isGuide = s.type?.toLowerCase() === 'guide';
                              const isSchool = s.type?.toLowerCase() === 'school';
                              return (
                                <span
                                  key={sIdx}
                                  className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                    isGuide
                                      ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                      : isSchool
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                  }`}
                                  title={`${s.type}: ${s.name}`}
                                >
                                  <span className="font-bold">{s.type}:</span>
                                  <span className="truncate max-w-[100px]">{s.name}</span>
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* Flags */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleFlagClick(q.id, 'important')}
                              className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ${
                                q.important ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-700'
                              }`}
                              title={q.important ? 'Important (Click to toggle)' : 'Mark Important'}
                            >
                              <Bookmark className={`w-3.5 h-3.5 ${q.important ? 'fill-amber-500' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFlagClick(q.id, 'veryImportant')}
                              className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ${
                                q.veryImportant ? 'text-rose-500' : 'text-zinc-300 dark:text-zinc-700'
                              }`}
                              title={q.veryImportant ? 'Very Important (Click to toggle)' : 'Mark Very Important'}
                            >
                              <Flame className={`w-3.5 h-3.5 ${q.veryImportant ? 'fill-rose-500' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFlagClick(q.id, 'dontUnderstand')}
                              className={`p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition ${
                                q.dontUnderstand ? 'text-purple-600' : 'text-zinc-300 dark:text-zinc-700'
                              }`}
                              title={q.dontUnderstand ? "Don't Understand (Click to toggle)" : "Mark Don't Understand"}
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (onEditQuestion) onEditQuestion(q.id);
                                else onNavigate('add-question', { editId: q.id });
                              }}
                              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded"
                              title="Edit Question"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setSingleDeleteTarget(q)}
                              className="p-1 text-zinc-400 hover:text-rose-600 rounded"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : q.id)}
                              className="p-1 text-zinc-400 hover:text-zinc-700 rounded"
                              title="Preview Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded View for Detailed Inspection */}
                      {isExpanded && (
                        <tr className="bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800">
                          <td colSpan={7} className="p-4 space-y-3">
                            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                              Options & Explanation
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(['A', 'B', 'C', 'D'] as const).map(k => (
                                <div
                                  key={k}
                                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                                    q.correctAnswer === k
                                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold'
                                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                                  }`}
                                >
                                  <span className="w-4 h-4 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                    {k}
                                  </span>
                                  <span>{q.options[k] || '—'}</span>
                                </div>
                              ))}
                            </div>

                            {q.explanation && (
                              <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1">
                                <span className="font-bold text-zinc-700 dark:text-zinc-300">
                                  Explanation / Derivation:
                                </span>
                                <p className="text-zinc-600 dark:text-zinc-400">
                                  {q.explanation}
                                </p>
                              </div>
                            )}

                            {/* Sources List in Expanded View */}
                            <div className="text-xs flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-zinc-500">Sources:</span>
                              {questionSources.map((s, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-[11px]"
                                >
                                  {s.type}: {s.name}
                                </span>
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
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
            <div>
              Showing{' '}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {Math.min(currentPage * pageSize, totalQuestions)}
              </span>{' '}
              of <span className="font-semibold text-zinc-800 dark:text-zinc-200">{totalQuestions}</span> questions
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 font-medium text-zinc-700 dark:text-zinc-300">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
              Move {selectedIds.size} Questions
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Target Subject</label>
                <select
                  value={bulkInputValue.subjectId || ''}
                  onChange={e => setBulkInputValue({ subjectId: e.target.value, chapterId: '' })}
                  className="w-full mt-1 p-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                >
                  <option value="">Select subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {bulkInputValue.subjectId && (
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Target Chapter</label>
                  <select
                    value={bulkInputValue.chapterId || ''}
                    onChange={e => setBulkInputValue({ ...bulkInputValue, chapterId: e.target.value })}
                    className="w-full mt-1 p-2 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
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
                disabled={!bulkInputValue.subjectId || !bulkInputValue.chapterId}
                onClick={() => handleExecuteBulkAction('set_subject_chapter', bulkInputValue)}
                className="flex-1 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg"
              >
                Apply Move
              </button>
              <button
                type="button"
                onClick={() => setBulkActionModal(null)}
                className="px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
