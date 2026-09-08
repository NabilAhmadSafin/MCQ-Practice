import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  FolderTree, 
  Play, 
  BookOpen, 
  ArrowRight 
} from 'lucide-react';
import { 
  getAllSubjects, 
  getChaptersBySubject, 
  createChapter, 
  updateChapter, 
  deleteChapter, 
  reorderChapters, 
  getQuestionCountsByChapter 
} from '../services/subjectService';
import { ConfirmModal } from '../components/common/ConfirmModal';
import type { Subject, Chapter } from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface ChaptersPageProps {
  initialSubjectId?: string;
  onNavigate: (section: NavSection, params?: any) => void;
}

export const ChaptersPage: React.FC<ChaptersPageProps> = ({ initialSubjectId, onNavigate }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newChapterName, setNewChapterName] = useState('');
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInitial = async () => {
    try {
      const subjs = await getAllSubjects();
      setSubjects(subjs);
      if (subjs.length > 0) {
        const targetId = initialSubjectId && subjs.some(s => s.id === initialSubjectId)
          ? initialSubjectId
          : subjs[0].id;
        setSelectedSubjectId(targetId);
        await loadChaptersForSubject(targetId);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const loadChaptersForSubject = async (subjId: string) => {
    if (!subjId) return;
    try {
      const [chaps, qCounts] = await Promise.all([
        getChaptersBySubject(subjId),
        getQuestionCountsByChapter()
      ]);
      setChapters(chaps);
      setCounts(qCounts);
    } catch (e: any) {
      setError(e.message || 'Failed to load chapters');
    }
  };

  useEffect(() => {
    loadInitial();
  }, [initialSubjectId]);

  const handleSubjectChange = async (subjId: string) => {
    setSelectedSubjectId(subjId);
    setIsCreating(false);
    setEditingChapter(null);
    await loadChaptersForSubject(subjId);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterName.trim() || !selectedSubjectId) return;
    try {
      await createChapter(selectedSubjectId, newChapterName);
      setNewChapterName('');
      setIsCreating(false);
      setError(null);
      await loadChaptersForSubject(selectedSubjectId);
    } catch (err: any) {
      setError(err.message || 'Failed to create chapter');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter || !editName.trim()) return;
    try {
      await updateChapter(editingChapter.id, editName);
      setEditingChapter(null);
      setError(null);
      await loadChaptersForSubject(selectedSubjectId);
    } catch (err: any) {
      setError(err.message || 'Failed to update chapter');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteChapter(deleteTarget.id);
      setDeleteTarget(null);
      setError(null);
      await loadChaptersForSubject(selectedSubjectId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete chapter');
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= chapters.length) return;

    const reordered = [...chapters];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const ids = reordered.map(c => c.id);
    await reorderChapters(selectedSubjectId, ids);
    await loadChaptersForSubject(selectedSubjectId);
  };

  const currentSubject = subjects.find(s => s.id === selectedSubjectId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Chapters
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Organize questions by specific chapters and manage custom ordering.
          </p>
        </div>

        {subjects.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setIsCreating(true);
              setEditingChapter(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Chapter</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Subject Filter Dropdown / Tab bar */}
      {subjects.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
          <BookOpen className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">No subjects found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            You need to create at least one subject before adding chapters.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('subjects')}
            className="mt-4 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg"
          >
            Go to Subjects
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 shrink-0">
            Select Subject:
          </span>
          {subjects.map(subj => {
            const isSelected = subj.id === selectedSubjectId;
            return (
              <button
                key={subj.id}
                type="button"
                onClick={() => handleSubjectChange(subj.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {subj.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Create Chapter Form */}
      {isCreating && (
        <div className="bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Add Chapter to <span className="text-indigo-600 dark:text-indigo-400">{currentSubject?.name}</span>
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newChapterName}
              onChange={e => setNewChapterName(e.target.value)}
              placeholder="e.g. Work, Energy & Power"
              autoFocus
              className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                Create Chapter
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename Chapter Form */}
      {editingChapter && (
        <div className="bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Rename Chapter
          </h2>
          <form onSubmit={handleUpdate} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              autoFocus
              className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setEditingChapter(null)}
                className="px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Chapters list */}
      {subjects.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Chapters in {currentSubject?.name} ({chapters.length})
            </span>
            <span className="text-xs text-zinc-400">
              Use arrows to reorder
            </span>
          </div>

          {chapters.length === 0 ? (
            <div className="p-10 text-center text-zinc-500 text-sm">
              This subject has no chapters yet. Click &quot;New Chapter&quot; above to create one.
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {chapters.map((chapter, index) => {
                const qCount = counts[chapter.id] || 0;

                return (
                  <div
                    key={chapter.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs font-mono font-bold text-zinc-400">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                          {chapter.name}
                        </h3>
                        <div className="text-xs text-zinc-500">
                          {qCount} Questions
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Reorder buttons */}
                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === chapters.length - 1}
                          className="p-1 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingChapter(chapter);
                          setEditName(chapter.name);
                          setIsCreating(false);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Rename Chapter"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(chapter)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete Chapter"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigate('practice', { subjectId: selectedSubjectId, chapterId: chapter.id })}
                        disabled={qCount === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Practice</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog for Chapter Deletion */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Chapter"
        message={`Are you sure you want to delete chapter "${deleteTarget?.name}"?\n\nThis will permanently delete all ${counts[deleteTarget?.id || ''] || 0} questions under this chapter and their attempt histories.\n\nThis action cannot be undone.`}
        confirmText={`Delete "${deleteTarget?.name}"`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
