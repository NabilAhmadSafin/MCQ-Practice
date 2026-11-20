import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Play,
  BookOpen
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

export const ChaptersPage: React.FC<ChaptersPageProps> = ({
  initialSubjectId,
  onNavigate
}) => {
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

  const loadInitial = async () => {
    try {
      const subjs = await getAllSubjects();
      setSubjects(subjs);
      if (subjs.length > 0) {
        const targetId =
          initialSubjectId && subjs.some(s => s.id === initialSubjectId)
            ? initialSubjectId
            : subjs[0].id;
        setSelectedSubjectId(targetId);
        await loadChaptersForSubject(targetId);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load initial data');
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--lc-text)] tracking-tight">
            Chapters
          </h1>
          <p className="text-sm text-[var(--lc-text-secondary)] mt-1">
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
            className="lc-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Chapter</span>
          </button>
        )}
      </div>

      {error && (
        <div className="lc-glass-subtle p-3.5 rounded-[12px] bg-rose-500/12 border-rose-400/30 text-sm text-rose-200">
          {error}
        </div>
      )}

      {subjects.length === 0 ? (
        <div className="lc-card p-12 text-center border-dashed">
          <BookOpen className="w-10 h-10 text-[var(--lc-text-muted)] mx-auto mb-3" />
          <h3 className="font-semibold text-[var(--lc-text)]">No subjects found</h3>
          <p className="text-xs text-[var(--lc-text-secondary)] mt-1 max-w-sm mx-auto">
            You need to create at least one subject before adding chapters.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('subjects')}
            className="lc-btn-primary mt-4 px-4 py-2 text-xs"
          >
            Go to Subjects
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-[var(--lc-divider)]">
          <span className="text-xs font-medium text-[var(--lc-text-muted)] shrink-0 mr-1">
            Subject:
          </span>
          {subjects.map(subj => {
            const isSelected = subj.id === selectedSubjectId;
            return (
              <button
                key={subj.id}
                type="button"
                onClick={() => handleSubjectChange(subj.id)}
                className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-all shrink-0 whitespace-nowrap border ${
                  isSelected
                    ? 'bg-indigo-500/22 text-[var(--lc-text)] border-indigo-400/35 shadow-[0_2px_10px_rgba(0,0,0,0.22)]'
                    : 'bg-white/[0.04] border-[var(--lc-border)] text-[var(--lc-text-secondary)] hover:text-[var(--lc-text)] hover:bg-white/[0.08]'
                }`}
              >
                {subj.name}
              </button>
            );
          })}
        </div>
      )}

      <>
          {isCreating && (
            <div className="lc-panel p-5 border-indigo-400/30">
              <h2 className="text-sm font-semibold text-[var(--lc-text)] mb-3">
                Add Chapter to <span className="text-indigo-300">{currentSubject?.name}</span>
              </h2>
              <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newChapterName}
                  onChange={e => setNewChapterName(e.target.value)}
                  placeholder="e.g. Work, Energy & Power"
                  autoFocus
                  className="lc-input flex-1 px-3.5 py-2 text-sm"
                />
                <div className="flex items-center gap-2">
                  <button type="submit" className="lc-btn-primary px-4 py-2 text-sm">
                    Create Chapter
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="lc-btn-ghost px-3 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {editingChapter && (
            <div className="lc-panel p-5 border-indigo-400/30">
              <h2 className="text-sm font-semibold text-[var(--lc-text)] mb-3">
                Rename Chapter
              </h2>
              <form onSubmit={handleUpdate} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  autoFocus
                  className="lc-input flex-1 px-3.5 py-2 text-sm"
                />
                <div className="flex items-center gap-2">
                  <button type="submit" className="lc-btn-primary px-4 py-2 text-sm">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingChapter(null)}
                    className="lc-btn-ghost px-3 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {subjects.length > 0 && (
            <div className="lc-card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[var(--lc-divider)] flex items-center justify-between bg-white/[0.025]">
                <span className="text-xs font-medium text-[var(--lc-text-secondary)] tabular-nums">
                  Chapters in {currentSubject?.name} ({chapters.length})
                </span>
                <span className="text-xs text-[var(--lc-text-muted)]">
                  Use arrows to reorder
                </span>
              </div>

              {chapters.length === 0 ? (
                <div className="p-10 text-center text-[var(--lc-text-secondary)] text-sm">
                  This subject has no chapters yet. Click &quot;New Chapter&quot; above to create one.
                </div>
              ) : (
                <div className="divide-y divide-[var(--lc-divider)]">
                  {chapters.map((chapter, index) => {
                    const qCount = counts[chapter.id] || 0;

                    return (
                      <div
                        key={chapter.id}
                        className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="w-7 h-7 rounded-[8px] bg-white/[0.04] border border-[var(--lc-border)] flex items-center justify-center text-xs font-mono font-semibold text-[var(--lc-text-secondary)] tabular-nums shrink-0">
                            {index + 1}
                          </span>
                          <div>
                            <h3 className="font-semibold text-[var(--lc-text)] text-sm">
                              {chapter.name}
                            </h3>
                            <div className="text-xs text-[var(--lc-text-muted)] tabular-nums mt-0.5">
                              {qCount} questions
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <div className="flex items-center bg-white/[0.04] border border-[var(--lc-border)] rounded-[8px] p-0.5">
                            <button
                              type="button"
                              onClick={() => handleMove(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-[var(--lc-text-secondary)] hover:text-[var(--lc-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMove(index, 'down')}
                              disabled={index === chapters.length - 1}
                              className="p-1 text-[var(--lc-text-secondary)] hover:text-[var(--lc-text)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                            className="p-1.5 text-[var(--lc-text-muted)] hover:text-[var(--lc-text)] rounded-[8px] hover:bg-white/[0.08] transition-colors"
                            title="Rename Chapter"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(chapter)}
                            className="p-1.5 text-[var(--lc-text-muted)] hover:text-rose-400 rounded-[8px] hover:bg-rose-500/12 transition-colors"
                            title="Delete Chapter"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onNavigate('practice', {
                                subjectId: selectedSubjectId,
                                chapterId: chapter.id
                              })
                            }
                            disabled={qCount === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-indigo-500/16 text-indigo-300 hover:bg-indigo-500/26 border border-indigo-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
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
      </>

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
