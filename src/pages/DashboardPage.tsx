import React, { useEffect, useState } from 'react';
import {
  Play,
  XCircle,
  Star,
  HelpCircle,
  BarChart2,
  ArrowRight,
  BookOpen,
  Clock
} from 'lucide-react';
import { getAllSubjects, getQuestionCountsBySubject } from '../services/subjectService';
import { getSystemStatistics, type SystemStats, getRecentSessions } from '../services/attemptService';
import type { Subject, PracticeSession } from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface DashboardProps {
  onNavigate: (section: NavSection, params?: any) => void;
  onStartPracticeWithFilter?: (filter: any) => void;
}

export const DashboardPage: React.FC<DashboardProps> = ({ onNavigate }) => {
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
        <div className="text-[var(--lc-text-secondary)] text-sm">Loading dashboard...</div>
      </div>
    );
  }

  const coveragePct = stats?.totalQuestions
    ? Math.round(((stats.attemptedQuestions || 0) / stats.totalQuestions) * 100)
    : 0;
  const accuracyPct = stats?.overallAccuracy ?? 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Asymmetric Two-Column Hero Panel */}
      <div className="lc-hero-panel p-6 sm:p-8 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <span className="text-xs font-medium text-indigo-300">
                {getGreeting()}
              </span>
              <h1 className="text-2xl sm:text-[30px] font-semibold tracking-tight mt-1.5 text-[var(--lc-text)] leading-tight">
                Ready to sharpen your recall?
              </h1>
              <p className="text-[var(--lc-text-secondary)] text-sm sm:text-[15px] mt-2.5 leading-relaxed max-w-xl">
                Practice with indexed filters, isolate weak concepts, and track accuracy across your subjects.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => onNavigate('practice')}
                className="lc-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Practice Session</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('question-bank')}
                className="lc-btn-secondary inline-flex items-center gap-2 px-4 py-2.5 text-sm"
              >
                <span>Explore Question Bank</span>
                <ArrowRight className="w-4 h-4 text-[var(--lc-text-secondary)]" />
              </button>
            </div>
          </div>

          {/* Right Column: Live Real-Data Study Snapshot */}
          <div className="lg:col-span-5 lc-glass-subtle rounded-[16px] p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--lc-text-secondary)]">
                Mastery snapshot
              </span>
              <button
                type="button"
                onClick={() => onNavigate('statistics')}
                className="text-xs font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
              >
                Analytics →
              </button>
            </div>

            <div className="space-y-3.5 tabular-nums">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--lc-text-secondary)]">Bank coverage</span>
                  <span className="font-semibold text-[var(--lc-text)]">
                    {coveragePct}%{' '}
                    <span className="font-normal text-[var(--lc-text-muted)]">
                      ({stats?.attemptedQuestions ?? 0}/{stats?.totalQuestions ?? 0})
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-300"
                    style={{ width: `${coveragePct}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--lc-text-secondary)]">Overall accuracy</span>
                  <span className="font-semibold text-emerald-400">{accuracyPct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${accuracyPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--lc-divider)] flex items-center justify-between text-xs tabular-nums">
              <span className="text-[var(--lc-text-secondary)]">
                Needs review:{' '}
                <span className="font-semibold text-rose-300">
                  {stats?.wrongQuestionsCount ?? 0} wrong
                </span>
              </span>
              <span className="text-[var(--lc-text-muted)]">
                {stats?.totalAttempts.toLocaleString() ?? 0} attempts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="lc-card p-5">
          <div className="text-xs font-medium text-[var(--lc-text-secondary)]">
            Total questions
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-[var(--lc-text)] mt-2 tabular-nums tracking-tight">
            {stats?.totalQuestions.toLocaleString() ?? 0}
          </div>
          <div className="text-xs text-[var(--lc-text-muted)] mt-1">
            In personal bank
          </div>
        </div>

        <div className="lc-card p-5">
          <div className="text-xs font-medium text-[var(--lc-text-secondary)]">
            Attempted
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-indigo-300 mt-2 tabular-nums tracking-tight">
            {stats?.attemptedQuestions.toLocaleString() ?? 0}
          </div>
          <div className="text-xs text-[var(--lc-text-muted)] mt-1 tabular-nums">
            {coveragePct}% bank coverage
          </div>
        </div>

        <div className="lc-card p-5">
          <div className="text-xs font-medium text-[var(--lc-text-secondary)]">
            Overall accuracy
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-emerald-400 mt-2 tabular-nums tracking-tight">
            {accuracyPct}%
          </div>
          <div className="text-xs text-[var(--lc-text-muted)] mt-1 tabular-nums">
            Across {stats?.totalAttempts.toLocaleString() ?? 0} attempts
          </div>
        </div>

        <div className="lc-card p-5">
          <div className="text-xs font-medium text-[var(--lc-text-secondary)]">
            Wrong answers
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-rose-400 mt-2 tabular-nums tracking-tight">
            {stats?.wrongQuestionsCount ?? 0}
          </div>
          <div className="text-xs text-[var(--lc-text-muted)] mt-1">
            Need targeted review
          </div>
        </div>
      </div>

      {/* Quick Practice Modes */}
      <section>
        <div className="flex items-baseline gap-2.5 mb-3.5">
          <h2 className="text-base font-semibold text-[var(--lc-text)] tracking-tight">
            Quick Practice
          </h2>
          <span className="text-xs text-[var(--lc-text-muted)]">
            Jump into high-impact sets
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => onNavigate('wrong-questions')}
            className="lc-card-interactive flex flex-col items-start p-5 text-left group"
          >
            <div className="w-9 h-9 rounded-[10px] bg-rose-500/14 border border-rose-400/20 text-rose-400 flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="font-semibold text-sm text-[var(--lc-text)] mt-3.5">
              Wrong Answers
            </div>
            <div className="text-xs text-[var(--lc-text-secondary)] mt-1 tabular-nums">
              {stats?.wrongQuestionsCount ?? 0} questions
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('practice', { initialMode: 'wrong' })}
            className="lc-card-interactive flex flex-col items-start p-5 text-left group"
          >
            <div className="w-9 h-9 rounded-[10px] bg-amber-500/14 border border-amber-400/20 text-amber-300 flex items-center justify-center">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div className="font-semibold text-sm text-[var(--lc-text)] mt-3.5">
              Weak Questions
            </div>
            <div className="text-xs text-[var(--lc-text-secondary)] mt-1 tabular-nums">
              {stats?.weakQuestionsCount ?? 0} below 60% accuracy
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('important-questions', { tab: 'important' })}
            className="lc-card-interactive flex flex-col items-start p-5 text-left group"
          >
            <div className="w-9 h-9 rounded-[10px] bg-amber-400/14 border border-amber-300/20 text-amber-300 flex items-center justify-center">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div className="font-semibold text-sm text-[var(--lc-text)] mt-3.5">
              Important
            </div>
            <div className="text-xs text-[var(--lc-text-secondary)] mt-1">
              High-yield revision
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('important-questions', { tab: 'dontUnderstand' })}
            className="lc-card-interactive flex flex-col items-start p-5 text-left group"
          >
            <div className="w-9 h-9 rounded-[10px] bg-indigo-500/15 border border-indigo-400/22 text-indigo-300 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="font-semibold text-sm text-[var(--lc-text)] mt-3.5">
              Don&apos;t Understand
            </div>
            <div className="text-xs text-[var(--lc-text-secondary)] mt-1">
              Clarify concepts
            </div>
          </button>
        </div>
      </section>

      {/* Subjects Grid */}
      <section>
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-base font-semibold text-[var(--lc-text)] flex items-center gap-2 tracking-tight">
            <BookOpen className="w-4 h-4 text-indigo-300" />
            <span>Subjects</span>
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('subjects')}
            className="text-xs font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
          >
            Manage Subjects →
          </button>
        </div>

        {subjects.length === 0 ? (
          <div className="lc-card p-8 border-dashed text-center">
            <p className="text-sm text-[var(--lc-text-secondary)]">No subjects created yet.</p>
            <button
              type="button"
              onClick={() => onNavigate('subjects')}
              className="lc-btn-primary mt-3 px-4 py-2 text-xs"
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
                <div key={s.id} className="lc-card p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--lc-text)] text-[15px] truncate">
                      {s.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--lc-text-secondary)] mt-1.5 flex-wrap tabular-nums">
                      <span>{count} questions</span>
                      {subStat && subStat.attemptedQuestions > 0 && (
                        <>
                          <span className="text-[var(--lc-text-muted)]" aria-hidden="true">·</span>
                          <span className="text-emerald-400 font-medium">
                            {subStat.accuracy}% accuracy
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--lc-divider)]">
                    <button
                      type="button"
                      onClick={() => onNavigate('practice', { subjectId: s.id })}
                      disabled={count === 0}
                      className="flex-1 py-1.5 px-3 rounded-[8px] text-xs font-semibold bg-indigo-500/16 text-indigo-300 hover:bg-indigo-500/26 border border-indigo-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-center whitespace-nowrap"
                    >
                      Practice
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('question-bank', { subjectId: s.id })}
                      className="lc-btn-ghost py-1.5 px-3 text-xs rounded-[8px]"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Practice Sessions */}
      {recentSessions.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-base font-semibold text-[var(--lc-text)] flex items-center gap-2 tracking-tight">
              <Clock className="w-4 h-4 text-[var(--lc-text-muted)]" />
              <span>Recent Practice Sessions</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('practice-history')}
              className="text-xs font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
            >
              View All History →
            </button>
          </div>

          <div className="lc-card divide-y divide-[var(--lc-divider)] overflow-hidden">
            {recentSessions.slice(0, 6).map(sess => {
              const ts = sess.completedAt || sess.createdAt;
              return (
                <div
                  key={sess.id}
                  className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm hover:bg-white/[0.03] transition-colors"
                >
                    <div>
                      <div className="font-semibold text-[var(--lc-text)]">
                        {sess.title}
                      </div>
                      <div className="text-xs text-[var(--lc-text-muted)] mt-1 tabular-nums">
                        {new Date(ts).toLocaleDateString()} at{' '}
                        {new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                        {Math.floor(sess.durationSeconds / 60)}m {sess.durationSeconds % 60}s
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right tabular-nums">
                        <div className="text-sm font-semibold text-[var(--lc-text)]">
                          {sess.correctCount} / {sess.totalQuestions}{' '}
                          <span className="text-indigo-300">({sess.accuracy}%)</span>
                        </div>
                        <div className="text-xs text-[var(--lc-text-secondary)]">
                          <span className="text-emerald-400 font-medium">
                            {sess.correctCount} correct
                          </span>
                          {' · '}
                          <span className="text-rose-400 font-medium">
                            {sess.wrongCount} wrong
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate('practice', {
                            subjectId: sess.subjectId !== 'mixed' ? sess.subjectId : undefined,
                            chapterId: sess.chapterId
                          })
                        }
                        className="lc-btn-secondary px-3.5 py-1.5 text-xs"
                      >
                        Practice Again
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
};
