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

      // Load chapter counts
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
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Subjects
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Organize questions at the top level of your curriculum hierarchy.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsCreating(true);
            setEditingSubject(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Subject</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Create Subject Modal / Form */}
      {isCreating && (
        <div className="bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Add New Subject
          </h2>
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newSubjectName}
              onChange={e => setNewSubjectName(e.target.value)}
              placeholder="e.g. Physics, Higher Mathematics..."
              autoFocus
              className="flex-1 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
              >
                Create Subject
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

      {/* Rename Subject Modal / Inline Edit */}
      {editingSubject && (
        <div className="bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Rename Subject
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
                onClick={() => setEditingSubject(null)}
                className="px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subjects List */}
      {loading ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Loading subjects...</div>
      ) : subjects.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
          <BookOpen className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">No subjects yet</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Create subjects to organize your questions into chapters and practice systematically.
          </p>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="mt-4 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg"
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
              <div
                key={subject.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                          {subject.name}
                        </h2>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                          <span>{chCount} Chapters</span>
                          <span>•</span>
                          <span>{qCount} Questions</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubject(subject);
                          setEditName(subject.name);
                          setIsCreating(false);
                        }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Rename Subject"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(subject)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete Subject"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => onNavigate('chapters', { subjectId: subject.id })}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>View Chapters</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('practice', { subjectId: subject.id })}
                    disabled={qCount === 0}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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

      {/* Confirmation Dialog for Subject Deletion */}
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
