import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, BookOpen, Layers, ArrowRight } from 'lucide-react';
import {
  getAllSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getQuestionCountsBySubject,
  getChaptersBySubject
} from '../services/subjectService';
import { ConfirmModal } from '../components/common/ConfirmModal';
import type { Subject } from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface SubjectsPageProps {
  onNavigate: (section: NavSection, params?: any) => void;
}

export const SubjectsPage: React.FC<SubjectsPageProps> = ({ onNavigate }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [chapterCounts, setChapterCounts] = useState<Record<string, number>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [subjs, qCounts] = await Promise.all([
        getAllSubjects(),
        getQuestionCountsBySubject()
      ]);
      setSubjects(subjs);
      setCounts(qCounts);

      const chCounts: Record<string, number> = {};
      for (const s of subjs) {
        const chaps = await getChaptersBySubject(s.id);
        chCounts[s.id] = chaps.length;
      }
      setChapterCounts(chCounts);
    } catch (e: any) {
      setError(e.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    try {
      await createSubject(newSubjectName);
      setNewSubjectName('');
      setIsCreating(false);
      setError(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create subject');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject || !editName.trim()) return;
    try {
      await updateSubject(editingSubject.id, editName);
      setEditingSubject(null);
      setError(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update subject');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSubject(deleteTarget.id);
      setDeleteTarget(null);
      setError(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete subject');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--lc-text)] tracking-tight">
            Subjects
          </h1>
          <p className="text-sm text-[var(--lc-text-secondary)] mt-1">
            Organize questions at the top level of your curriculum hierarchy.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsCreating(true);
            setEditingSubject(null);
          }}
          className="lc-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Subject</span>
        </button>
      </div>

      {error && (
        <div className="lc-glass-subtle p-3.5 rounded-[12px] bg-rose-500/12 border-rose-400/30 text-sm text-rose-200">
          {error}
        </div>
      )}

      {isCreating && (
        <div className="lc-panel p-5 border-indigo-400/30">
          <h2 className="text-sm font-semibold text-[var(--lc-text)] mb-3">
            Add New Subject
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newSubjectName}
              onChange={e => setNewSubjectName(e.target.value)}
              placeholder="e.g. Physics, Higher Mathematics..."
              autoFocus
              className="lc-input flex-1 px-3.5 py-2 text-sm"
            />
            <div className="flex items-center gap-2">
              <button type="submit" className="lc-btn-primary px-4 py-2 text-sm">
                Create Subject
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

      {editingSubject && (
        <div className="lc-panel p-5 border-indigo-400/30">
          <h2 className="text-sm font-semibold text-[var(--lc-text)] mb-3">
            Rename Subject
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
                onClick={() => setEditingSubject(null)}
                className="lc-btn-ghost px-3 py-2 text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[var(--lc-text-secondary)] text-sm">
          Loading subjects...
        </div>
      ) : subjects.length === 0 ? (
        <div className="lc-card p-12 text-center border-dashed">
          <BookOpen className="w-10 h-10 text-[var(--lc-text-muted)] mx-auto mb-3" />
          <h3 className="font-semibold text-[var(--lc-text)]">No subjects yet</h3>
          <p className="text-xs text-[var(--lc-text-secondary)] mt-1 max-w-sm mx-auto">
            Create subjects to organize your questions into chapters and practice systematically.
          </p>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="lc-btn-primary mt-4 px-4 py-2 text-xs"
          >
            Create Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subjects.map(subject => {
            const qCount = counts[subject.id] || 0;
            const chCount = chapterCounts[subject.id] || 0;

            return (
              <div key={subject.id} className="lc-card-interactive p-5 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 border bg-indigo-500/14 border-indigo-400/25 text-indigo-300">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-semibold text-[var(--lc-text)] text-base truncate">
                        {subject.name}
                      </h2>
                      <div className="flex items-center gap-1.5 text-xs text-[var(--lc-text-secondary)] mt-1 tabular-nums">
                        <span>{chCount} chapters</span>
                        <span className="text-[var(--lc-text-muted)]" aria-hidden="true">·</span>
                        <span>{qCount} questions</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSubject(subject);
                        setEditName(subject.name);
                        setIsCreating(false);
                      }}
                      className="p-1.5 text-[var(--lc-text-muted)] hover:text-[var(--lc-text)] rounded-[8px] hover:bg-white/[0.08] transition-colors"
                      title="Rename Subject"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(subject)}
                      className="p-1.5 text-[var(--lc-text-muted)] hover:text-rose-400 rounded-[8px] hover:bg-rose-500/12 transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 mt-5 pt-3.5 border-t border-[var(--lc-divider)]">
                  <button
                    type="button"
                    onClick={() => onNavigate('chapters', { subjectId: subject.id })}
                    className="lc-btn-secondary flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>View Chapters</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('practice', { subjectId: subject.id })}
                    disabled={qCount === 0}
                    className="lc-btn-primary flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Practice Subject</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Subject"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?\n\nThis will permanently delete ALL ${chapterCounts[deleteTarget?.id || ''] || 0} chapters and ${counts[deleteTarget?.id || ''] || 0} questions under this subject, along with their practice history.\n\nThis action cannot be undone.`}
        confirmText={`Delete "${deleteTarget?.name}"`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
