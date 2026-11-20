import React, { useState, useEffect } from 'react';
import {
  History,
  Clock,
  Calendar,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { getRecentPracticeSessions, clearPracticeSessions } from '../services/attemptService';
import { getAllSubjects, getAllChapters } from '../services/subjectService';
import { ConfirmModal } from '../components/common/ConfirmModal';
import type { PracticeSession, Subject, Chapter } from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface PracticeHistoryPageProps {
  onNavigate: (section: NavSection, params?: any) => void;
}

export const PracticeHistoryPage: React.FC<PracticeHistoryPageProps> = ({ onNavigate }) => {
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Map<string, Subject>>(new Map());
  const [chaptersMap, setChaptersMap] = useState<Map<string, Chapter>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [sess, subjs, chaps] = await Promise.all([
        getRecentPracticeSessions(50),
        getAllSubjects(),
        getAllChapters()
      ]);
      setSessions(sess);
      setSubjectsMap(new Map(subjs.map(s => [s.id, s])));
      setChaptersMap(new Map(chaps.map(c => [c.id, c])));
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmClearHistory = async () => {
    await clearPracticeSessions();
    setIsClearModalOpen(false);
    await loadData();
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--lc-text)] tracking-tight">
            Practice History
          </h1>
          <p className="text-xs sm:text-sm text-[var(--lc-text-secondary)] mt-1">
            Review your past practice tests, accuracy rates, and time logs.
          </p>
        </div>

        {sessions.length > 0 && (
          <button
            type="button"
            onClick={() => setIsClearModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-xs font-semibold text-rose-300 hover:bg-rose-500/12 border border-rose-400/28 self-start sm:self-auto transition-colors whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--lc-text-secondary)] text-sm">
          Loading history...
        </div>
      ) : sessions.length === 0 ? (
        <div className="lc-card p-12 text-center border-dashed">
          <History className="w-10 h-10 text-[var(--lc-text-muted)] mx-auto mb-3" />
          <h3 className="font-semibold text-[var(--lc-text)]">
            No practice sessions yet
          </h3>
          <p className="text-xs text-[var(--lc-text-secondary)] mt-1 max-w-sm mx-auto">
            Take your first practice quiz or exam mode drill to start tracking session history.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('practice')}
            className="lc-btn-primary mt-4 px-4 py-2 text-xs"
          >
            Start Practicing
          </button>
        </div>
      ) : (
        <div className="lc-card overflow-hidden">
          <div className="divide-y divide-[var(--lc-divider)]">
                  {sessions.map(s => {
                    const subj = s.subjectId ? subjectsMap.get(s.subjectId)?.name : 'Mixed Subjects';
                    const chap = s.chapterId ? chaptersMap.get(s.chapterId)?.name : 'All Chapters';
                    const dateStr = new Date(s.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={s.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-[var(--lc-text)]">
                              {subj || 'Mixed Subjects'}
                            </span>
                            <span className="text-[var(--lc-text-muted)]" aria-hidden="true">·</span>
                            <span className="text-xs text-[var(--lc-text-secondary)]">{chap}</span>
                            <span className="text-[var(--lc-text-muted)]" aria-hidden="true">·</span>
                            <span className="text-xs font-medium text-indigo-300 capitalize">
                              {s.mode} mode
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[var(--lc-text-muted)] tabular-nums">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {dateStr}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(s.totalTimeSeconds)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-5">
                          <div className="text-right tabular-nums">
                            <div className="flex items-baseline gap-1.5 justify-end">
                              <span className="text-base font-semibold text-[var(--lc-text)]">
                                {s.correctCount} / {s.totalQuestions}
                              </span>
                              <span className="text-xs font-semibold text-indigo-300">
                                ({s.accuracy}%)
                              </span>
                            </div>
                            <div className="text-[11px] text-[var(--lc-text-muted)]">
                              {s.wrongCount} wrong · {s.skippedCount} skipped
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              onNavigate('practice', {
                                subjectId: s.subjectId !== 'mixed' ? s.subjectId : undefined,
                                chapterId: s.chapterId
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-indigo-500/16 text-indigo-300 hover:bg-indigo-500/26 border border-indigo-400/20 transition-colors whitespace-nowrap"
                          >
                            <span>Practice Again</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
      )}

      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Clear Practice History"
        message="Are you sure you want to clear your practice session history? Attempt statistics will be reset."
        confirmText="Clear History"
        onConfirm={handleConfirmClearHistory}
        onCancel={() => setIsClearModalOpen(false)}
      />
    </div>
  );
};
