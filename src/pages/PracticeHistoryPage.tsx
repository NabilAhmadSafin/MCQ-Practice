import React, { useState, useEffect } from 'react';
import { 
  History, 
  Clock, 
  Award, 
  Calendar, 
  CheckCircle2, 
  Play, 
  Trash2,
  Layers,
  ArrowRight
} from 'lucide-react';
import { getRecentPracticeSessions } from '../services/attemptService';
import { getAllSubjects, getAllChapters } from '../services/subjectService';
import { db } from '../db';
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

  const handleClearHistory = async () => {
    if (confirm('Are you sure you want to clear your practice session history? Attempt statistics will be reset.')) {
      await db.sessions.clear();
      await loadData();
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Practice History
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Review your past practice tests, accuracy rates, and time logs.
          </p>
        </div>

        {sessions.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Loading history...</div>
      ) : sessions.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
          <History className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200">No practice sessions yet</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Take your first practice quiz or exam mode drill to start tracking session history.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('practice')}
            className="mt-4 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg"
          >
            Start Practicing
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
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
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {subj || 'Mixed Subjects'}
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <span className="text-xs text-zinc-500">
                        {chap}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 uppercase">
                        {s.mode}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {dateStr}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(s.totalTimeSeconds)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-right">
                      <div className="flex items-baseline gap-1.5 justify-end">
                        <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {s.correctCount} / {s.totalQuestions}
                        </span>
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          ({s.accuracy}%)
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {s.wrongCount} wrong • {s.skippedCount} skipped
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
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
    </div>
  );
};
