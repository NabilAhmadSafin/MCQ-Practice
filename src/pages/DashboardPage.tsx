import React, { useEffect, useState } from 'react';
import { 
  Play, 
  XCircle, 
  Flame, 
  Star, 
  HelpCircle, 
  BarChart2, 
  ArrowRight,
  Sparkles,
  BookOpen,
  Clock
} from 'lucide-react';
import { db } from '../db';
import { getAllSubjects, getQuestionCountsBySubject } from '../services/subjectService';
import { getSystemStatistics, type SystemStats, getRecentSessions } from '../services/attemptService';
import type { Subject, PracticeSession } from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface DashboardProps {
  onNavigate: (section: NavSection, params?: any) => void;
  onStartPracticeWithFilter?: (filter: any) => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({ onNavigate, onStartPracticeWithFilter }) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});
  const [recentSessions, setRecentSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [sysStats, subjs, counts, sessions] = await Promise.all([
        getSystemStatistics(),
        getAllSubjects(),
        getQuestionCountsBySubject(),
        getRecentSessions(5)
      ]);
      setStats(sysStats);
      setSubjects(subjs);
      setSubjectCounts(counts);
      setRecentSessions(sessions);
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-zinc-500 text-sm">Loading dashboard...</div>
      </div>
    );
  }

  const hasQuestions = (stats?.totalQuestions ?? 0) > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Greeting & Main CTA Banner */}
      <div className="bg-zinc-900 text-white rounded-2xl p-6 sm:p-8 border border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs uppercase font-bold tracking-wider text-indigo-400">
            {getGreeting()}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 text-white">
            Ready to test your knowledge?
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base mt-2 leading-relaxed">
            Practice efficiently with indexed filters, track wrong answers, and build rapid recall.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => onNavigate('practice')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-sm transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Practice Session</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('question-bank')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
            >
              <span>Explore Question Bank</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Total Questions
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {stats?.totalQuestions.toLocaleString() ?? 0}
          </div>
          <div className="text-xs text-zinc-500 mt-1">In personal question bank</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Attempted
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
            {stats?.attemptedQuestions.toLocaleString() ?? 0}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {stats?.totalQuestions
              ? `${Math.round(((stats.attemptedQuestions || 0) / stats.totalQuestions) * 100)}% coverage`
              : '0% coverage'}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Overall Accuracy
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {stats?.overallAccuracy ?? 0}%
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Across {stats?.totalAttempts.toLocaleString() ?? 0} total attempts
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Wrong Questions
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 mt-2">
            {stats?.wrongQuestionsCount ?? 0}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Need targeted review</div>
        </div>
      </div>

      {/* Quick Practice Mode Buttons */}
      <div>
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
          <span>Quick Practice</span>
          <span className="text-xs font-normal text-zinc-500">Jump right into high-impact sets</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => onNavigate('wrong-questions')}
            className="flex flex-col items-start p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-rose-300 dark:hover:border-rose-700/60 transition-all text-left group"
          >
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mt-3">
              Wrong Questions
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {stats?.wrongQuestionsCount ?? 0} questions
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('practice', { mode: 'weak' })}
            className="flex flex-col items-start p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-300 dark:hover:border-amber-700/60 transition-all text-left group"
          >
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mt-3">
              Weak Questions
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {stats?.weakQuestionsCount ?? 0} with &lt; 60% accuracy
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('important-questions', { tab: 'important' })}
            className="flex flex-col items-start p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-300 dark:hover:border-amber-700/60 transition-all text-left group"
          >
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-500 group-hover:scale-105 transition-transform">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mt-3">
              Important (⭐)
            </div>
            <div className="text-xs text-zinc-500 mt-1">High-yield revision</div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('important-questions', { tab: 'dontUnderstand' })}
            className="flex flex-col items-start p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-purple-300 dark:hover:border-purple-700/60 transition-all text-left group"
          >
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mt-3">
              Don't Understand (❓)
            </div>
            <div className="text-xs text-zinc-500 mt-1">Clarify concepts</div>
          </button>
        </div>
      </div>

      {/* Subjects Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Subjects</span>
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('subjects')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Manage Subjects →
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="p-8 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl text-center bg-zinc-50/50 dark:bg-zinc-900/50">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No subjects created yet.</p>
            <button
              type="button"
              onClick={() => onNavigate('subjects')}
              className="mt-3 px-4 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add Your First Subject
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subjects.map(s => {
              const count = subjectCounts[s.id] || 0;
              const subStat = stats?.subjectStats.find(st => st.subjectId === s.id);

              return (
                <div
                  key={s.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow"
                >
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                      {s.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                      <span>{count} questions</span>
                      {subStat && subStat.attemptedQuestions > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 font-medium">{subStat.accuracy}% accuracy</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => onNavigate('practice', { subjectId: s.id })}
                      disabled={count === 0}
                      className="flex-1 py-1.5 px-3 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-center"
                    >
                      Practice
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('question-bank', { subjectId: s.id })}
                      className="py-1.5 px-3 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Practice Sessions & Quick Setup */}
      {recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span>Recent Practice Sessions</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('practice-history')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View All History →
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
            {recentSessions.map(sess => (
              <div key={sess.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {sess.title}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {new Date(sess.completedAt).toLocaleDateString()} at{' '}
                    {new Date(sess.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                    {Math.floor(sess.durationSeconds / 60)}m {sess.durationSeconds % 60}s
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {sess.correctCount} / {sess.totalQuestions} ({sess.accuracy}%)
                    </div>
                    <div className="text-xs text-zinc-500">
                      <span className="text-emerald-600 font-medium">{sess.correctCount} correct</span>,{' '}
                      <span className="text-rose-600 font-medium">{sess.wrongCount} wrong</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('practice', { retrySessionId: sess.id })}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  >
                    Practice Again
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
