import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  MoreHorizontal, 
  Plus, 
  CheckSquare, 
  Square,
  AlertCircle,
  Play,
  RotateCcw
} from 'lucide-react';
import { 
  getQuestionsPaginated, 
  deleteQuestion, 
  deleteQuestions, 
  bulkUpdateQuestions, 
  toggleQuestionFlag, 
  getAllUniqueTags, 
  getAllUniqueSourceNames 
} from '../services/questionService';
import { getAllSubjects, getChaptersBySubject, getAllChapters } from '../services/subjectService';
import { DifficultyBadge } from '../components/common/DifficultyBadge';
import { FlagIcons } from '../components/common/FlagIcons';
import { Pagination } from '../components/common/Pagination';
import { ConfirmModal } from '../components/common/ConfirmModal';
import type { Question, Subject, Chapter, QuestionFilter, Difficulty, SourceType } from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface QuestionBankPageProps {
  initialFilter?: Partial<QuestionFilter>;
  onNavigate: (section: NavSection, params?: any) => void;
  onEditQuestion?: (questionId: string) => void;
}

export const QuestionBankPage: React.FC<QuestionBankPageProps> = ({
  initialFilter,
  onNavigate,
  onEditQuestion
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Metadata
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [allChaptersMap, setAllChaptersMap] = useState<Map<string, Chapter>>(new Map());
  const [allSubjectsMap, setAllSubjectsMap] = useState<Map<string, Subject>>(new Map());
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [availableSourceNames, setAvailableSourceNames] = useState<string[]>([]);

  // Search & Filters State
  const [filter, setFilter] = useState<QuestionFilter>({
    subjectId: initialFilter?.subjectId || '',
    chapterId: initialFilter?.chapterId || '',
    sourceType: initialFilter?.sourceType || 'ALL',
    sourceName: initialFilter?.sourceName || '',
    difficulty: initialFilter?.difficulty || 'ALL',
    important: initialFilter?.important,
    veryImportant: initialFilter?.veryImportant,
    dontUnderstand: initialFilter?.dontUnderstand,
    tag: initialFilter?.tag || '',
    searchQuery: initialFilter?.searchQuery || '',
    attemptStatus: initialFilter?.attemptStatus || 'all',
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
  const [bulkActionModal, setBulkActionModal] = useState<'difficulty' | 'subject' | 'source' | 'tag' | null>(null);
  const [bulkInputValue, setBulkInputValue] = useState<any>({});

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
      const [subjs, chaps, tags, srcNames] = await Promise.all([
        getAllSubjects(),
        getAllChapters(),
        getAllUniqueTags(),
        getAllUniqueSourceNames()
      ]);
      setSubjects(subjs);
      setAllSubjectsMap(new Map(subjs.map(s => [s.id, s])));
      setAllChaptersMap(new Map(chaps.map(c => [c.id, c])));
      setAvailableTags(tags);
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

  // Query paginated questions
  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getQuestionsPaginated(filter, currentPage, pageSize);
      setQuestions(res.items);
      setTotalItems(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      console.error('Failed to load questions', e);
    } finally {
      setLoading(false);
    }
  }, [filter, currentPage, pageSize]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Checkbox helpers
  const handleSelectAllOnPage = () => {
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
  const handleToggleFlag = async (
    qId: string,
    flag: 'important' | 'veryImportant' | 'dontUnderstand'
  ) => {
    try {
      const nextVal = await toggleQuestionFlag(qId, flag);
      setQuestions(prev =>
        prev.map(q => (q.id === qId ? { ...q, [flag]: nextVal } : q))
      );
    } catch (e) {
      console.error('Flag toggle failed', e);
    }
  };

  // Bulk Actions
  const handleExecuteBulkAction = async (type: any, val?: any) => {
    if (selectedIds.size === 0) return;
    try {
      await bulkUpdateQuestions(Array.from(selectedIds), { type, value: val });
      setBulkActionModal(null);
      setBulkInputValue({});
      setSelectedIds(new Set());
      await fetchQuestions();
    } catch (e) {
      console.error('Bulk update failed', e);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIds.size === 0) return;
    try {
      await deleteQuestions(Array.from(selectedIds));
      setIsBulkDeleteModalOpen(false);
      setSelectedIds(new Set());
      await fetchQuestions();
    } catch (e) {
      console.error('Bulk delete failed', e);
    }
  };

  const handleSingleDeleteConfirm = async () => {
    if (!singleDeleteTarget) return;
    try {
      await deleteQuestion(singleDeleteTarget.id);
      setSingleDeleteTarget(null);
      await fetchQuestions();
    } catch (e) {
      console.error('Single delete failed', e);
    }
  };

  const resetFilters = () => {
    setSearchInput('');
    setFilter({
      subjectId: '',
      chapterId: '',
      sourceType: 'ALL',
      sourceName: '',
      difficulty: 'ALL',
      important: undefined,
      veryImportant: undefined,
      dontUnderstand: undefined,
      tag: '',
      searchQuery: '',
      attemptStatus: 'all',
      sortBy: 'createdAtDesc'
    });
    setCurrentPage(1);
  };

  const isAllSelected = questions.length > 0 && selectedIds.size === questions.length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Question Bank
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Total of {totalItems.toLocaleString()} questions indexed for fast search and practice.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('import-questions')}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => onNavigate('add-question')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search question text, source, options..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-indigo-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                showFilters || Object.values(filter).some(v => v !== '' && v !== 'ALL' && v !== undefined && v !== 'createdAtDesc' && v !== 'all')
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>

            <select
              value={filter.sortBy}
              onChange={e => {
                setFilter(prev => ({ ...prev, sortBy: e.target.value as any }));
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none"
            >
              <option value="createdAtDesc">Newest First</option>
              <option value="createdAtAsc">Oldest First</option>
              <option value="difficulty">By Difficulty</option>
              <option value="question">Alphabetical (A-Z)</option>
            </select>

            <button
              type="button"
              onClick={resetFilters}
              title="Reset all filters"
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Filter Bar */}
        {showFilters && (
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Subject */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                Subject
              </label>
              <select
                value={filter.subjectId || ''}
                onChange={e => {
                  setFilter(prev => ({ ...prev, subjectId: e.target.value, chapterId: '' }));
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-1.5 text-zinc-800 dark:text-zinc-200"
              >
                <option value="">All Subjects</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                Chapter
              </label>
              <select
                value={filter.chapterId || ''}
                disabled={!filter.subjectId}
                onChange={e => {
                  setFilter(prev => ({ ...prev, chapterId: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-1.5 text-zinc-800 dark:text-zinc-200 disabled:opacity-50"
              >
                <option value="">All Chapters</option>
                {chapters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Type */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                Source Type
              </label>
              <select
                value={filter.sourceType || 'ALL'}
                onChange={e => {
                  setFilter(prev => ({ ...prev, sourceType: e.target.value as any }));
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-1.5 text-zinc-800 dark:text-zinc-200"
              >
                <option value="ALL">All Types</option>
                <option value="Board">Board</option>
                <option value="School">School</option>
                <option value="Guide">Guide</option>
                <option value="Model Test">Model Test</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                Difficulty
              </label>
              <select
                value={filter.difficulty || 'ALL'}
                onChange={e => {
                  setFilter(prev => ({ ...prev, difficulty: e.target.value as any }));
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-1.5 text-zinc-800 dark:text-zinc-200"
              >
                <option value="ALL">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            {/* Flag Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                Flags
              </label>
              <select
                value={
                  filter.important
                    ? 'important'
                    : filter.veryImportant
                    ? 'veryImportant'
                    : filter.dontUnderstand
                    ? 'dontUnderstand'
                    : ''
                }
                onChange={e => {
                  const val = e.target.value;
                  setFilter(prev => ({
                    ...prev,
                    important: val === 'important' ? true : undefined,
                    veryImportant: val === 'veryImportant' ? true : undefined,
                    dontUnderstand: val === 'dontUnderstand' ? true : undefined
                  }));
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-1.5 text-zinc-800 dark:text-zinc-200"
              >
                <option value="">Any Flag</option>
                <option value="important">⭐ Important</option>
                <option value="veryImportant">🔥 Very Important</option>
                <option value="dontUnderstand">❓ Don&apos;t Understand</option>
              </select>
            </div>

            {/* Tag Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                Custom Tag
              </label>
              <select
                value={filter.tag || ''}
                onChange={e => {
                  setFilter(prev => ({ ...prev, tag: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full text-xs rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-1.5 text-zinc-800 dark:text-zinc-200"
              >
                <option value="">All Tags</option>
                {availableTags.map(t => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>
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
              Choose an action for selected questions
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExecuteBulkAction('set_important')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white"
            >
              + ⭐ Important
            </button>
            <button
              type="button"
              onClick={() => handleExecuteBulkAction('set_veryImportant')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white"
            >
              + 🔥 Very Important
            </button>
            <button
              type="button"
              onClick={() => handleExecuteBulkAction('set_dontUnderstand')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white"
            >
              + ❓ Don&apos;t Understand
            </button>

            <button
              type="button"
              onClick={() => setBulkActionModal('difficulty')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white"
            >
              Change Difficulty
            </button>

            <button
              type="button"
              onClick={() => setBulkActionModal('subject')}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-800 hover:bg-indigo-700 text-white"
            >
              Move Chapter
            </button>

            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.size})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-indigo-300 hover:text-white underline ml-2"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Questions Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-sm">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-zinc-400 mx-auto" />
            <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">No questions match your criteria</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Try relaxing your filters, or add new questions to the bank.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-1.5 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-700 dark:text-zinc-300"
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={() => onNavigate('add-question')}
                className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg"
              >
                Add Question
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-50/75 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th className="py-3 px-4 w-10">
                    <button
                      type="button"
                      onClick={handleSelectAllOnPage}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      aria-label="Select all on page"
                    >
                      {isAllSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4 min-w-[280px]">Question</th>
                  <th className="py-3 px-4 min-w-[140px]">Subject & Chapter</th>
                  <th className="py-3 px-4 w-16 text-center">Answer</th>
                  <th className="py-3 px-4 min-w-[140px]">Source</th>
                  <th className="py-3 px-4 w-24">Difficulty</th>
                  <th className="py-3 px-4 min-w-[120px]">Flags</th>
                  <th className="py-3 px-4 w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {questions.map(q => {
                  const isSelected = selectedIds.has(q.id);
                  const isExpanded = expandedId === q.id;
                  const subjectName = allSubjectsMap.get(q.subjectId)?.name || 'Unknown';
                  const chapterName = allChaptersMap.get(q.chapterId)?.name || 'Unknown';

                  return (
                    <React.Fragment key={q.id}>
                      <tr
                        className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors ${
                          isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4">
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
                            {q.tags && q.tags.length > 0 && (
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {q.tags.map(t => (
                                  <span
                                    key={t}
                                    className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                  >
                                    #{t}
                                  </span>
                                ))}
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

                        {/* Source */}
                        <td className="py-3 px-4 text-xs">
                          <div className="font-medium text-zinc-700 dark:text-zinc-300">
                            {q.sourceType}
                          </div>
                          <div className="text-zinc-500 truncate max-w-[130px]" title={q.sourceName}>
                            {q.sourceName}
                          </div>
                        </td>

                        {/* Difficulty */}
                        <td className="py-3 px-4">
                          <DifficultyBadge difficulty={q.difficulty} />
                        </td>

                        {/* Flags */}
                        <td className="py-3 px-4">
                          <FlagIcons
                            important={q.important}
                            veryImportant={q.veryImportant}
                            dontUnderstand={q.dontUnderstand}
                            size="sm"
                          />
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
                              className="p-1 text-zinc-400 hover:text-zinc-600 rounded"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr className="bg-zinc-50/50 dark:bg-zinc-800/30">
                          <td colSpan={8} className="p-4 sm:p-6 border-b border-zinc-200 dark:border-zinc-800">
                            <div className="space-y-4 max-w-4xl">
                              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                Options:
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {Object.entries(q.options).map(([optKey, optVal]) => {
                                  const isCorrect = optKey.toUpperCase() === q.correctAnswer.toUpperCase();
                                  return (
                                    <div
                                      key={optKey}
                                      className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                                        isCorrect
                                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200 font-medium'
                                          : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                                      }`}
                                    >
                                      <span
                                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                                          isCorrect
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                                        }`}
                                      >
                                        {optKey}
                                      </span>
                                      <span className="leading-snug">{optVal}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Explanation */}
                              {q.explanation && (
                                <div className="p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs space-y-1">
                                  <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                                    Explanation:
                                  </div>
                                  <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed">
                                    {q.explanation}
                                  </p>
                                </div>
                              )}

                              {/* Quick Flag Toggles right in expanded drawer */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <FlagIcons
                                  important={q.important}
                                  veryImportant={q.veryImportant}
                                  dontUnderstand={q.dontUnderstand}
                                  interactive={true}
                                  onToggleImportant={() => handleToggleFlag(q.id, 'important')}
                                  onToggleVeryImportant={() => handleToggleFlag(q.id, 'veryImportant')}
                                  onToggleDontUnderstand={() => handleToggleFlag(q.id, 'dontUnderstand')}
                                />

                                <button
                                  type="button"
                                  onClick={() => onNavigate('practice', { questionId: q.id })}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Practice This Question</span>
                                </button>
                              </div>
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

        {/* Pagination Footer */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={p => setCurrentPage(p)}
          onPageSizeChange={s => {
            setPageSize(s);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Single Question Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(singleDeleteTarget)}
        title="Delete Question"
        message="Are you sure you want to delete this question? Its attempt history will also be permanently removed."
        confirmText="Delete Question"
        onConfirm={handleSingleDeleteConfirm}
        onCancel={() => setSingleDeleteTarget(null)}
      />

      {/* Bulk Delete Safety Confirmation (Explicitly required in Prompt 29) */}
      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        title="Delete Multiple Questions"
        message={`You are about to delete ${selectedIds.size} questions.\n\nThis action cannot be undone.`}
        confirmText={`Delete ${selectedIds.size} Questions`}
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
      />

      {/* Bulk Change Difficulty Modal */}
      {bulkActionModal === 'difficulty' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 max-w-sm w-full space-y-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
              Change Difficulty for {selectedIds.size} Questions
            </h3>
            <div className="flex gap-2">
              {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleExecuteBulkAction('set_difficulty', d)}
                  className="flex-1 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold"
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setBulkActionModal(null)}
              className="w-full py-2 text-xs font-medium text-zinc-500 hover:text-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bulk Move Subject/Chapter Modal */}
      {bulkActionModal === 'subject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 max-w-sm w-full space-y-4">
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

            <div className="flex gap-2">
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
