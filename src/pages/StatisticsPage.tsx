import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Award,
  BookOpen,
  ArrowRight,
  Layers,
  FileQuestion
} from 'lucide-react';
import { getOverallStatistics } from '../services/attemptService';
import type { SubjectStatistics, QuestionTypeStatistics } from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface StatisticsPageProps {
  onNavigate: (section: NavSection, params?: any) => void;
}

export const StatisticsPage: React.FC<StatisticsPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<{
    totalQuestions: number;
    totalAttempts: number;
    overallAccuracy: number;
    subjectStats: SubjectStatistics[];
    typeStats?: QuestionTypeStatistics[];
    recentSessions: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const s = await getOverallStatistics();
        setStats(s);
      } catch (e) {
        console.error('Failed to load stats', e);
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-[var(--lc-text)] tracking-tight">
          Performance Analytics
        </h1>
        <p className="text-xs sm:text-sm text-[var(--lc-text-secondary)] mt-1">
          Detailed accuracy, attempt ratios, and chapter mastery rates.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--lc-text-secondary)] text-sm">
          Computing analytics...
        </div>
      ) : !stats ? (
        <div className="p-8 text-center text-[var(--lc-text-muted)]">Failed to load statistics.</div>
      ) : (
        <div className="space-y-8">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="lc-card p-5">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[12px] bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--lc-text-secondary)]">Overall accuracy</div>
                  <div className="text-2xl font-semibold text-[var(--lc-text)] mt-0.5 tabular-nums tracking-tight">
                    {stats.overallAccuracy}%
                  </div>
                </div>
              </div>
            </div>

            <div className="lc-card p-5">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[12px] bg-emerald-500/15 border border-emerald-400/25 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--lc-text-secondary)]">Total attempts</div>
                  <div className="text-2xl font-semibold text-[var(--lc-text)] mt-0.5 tabular-nums tracking-tight">
                    {stats.totalAttempts.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="lc-card p-5">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[12px] bg-amber-500/15 border border-amber-400/25 text-amber-300 flex items-center justify-center shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--lc-text-secondary)]">Active curriculum subjects</div>
                  <div className="text-2xl font-semibold text-[var(--lc-text)] mt-0.5 tabular-nums tracking-tight">
                    {stats.subjectStats.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Question Type Breakdown */}
          {stats.typeStats && stats.typeStats.length > 0 && (
            <div className="space-y-3.5">
              <div>
                <h2 className="text-base font-semibold text-[var(--lc-text)] tracking-tight">
                  Question Type Performance
                </h2>
                <p className="text-xs text-[var(--lc-text-secondary)] mt-0.5">
                  Accuracy and practice coverage across Standard, বহুপদী সমাপ্তিসূচক, and অভিন্ন তথ্যভিত্তিক MCQs.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {stats.typeStats.map(ts => {
                  const attemptedPercent =
                    ts.totalQuestions > 0
                      ? Math.round((ts.attemptedQuestions / ts.totalQuestions) * 100)
                      : 0;
                  const isMulti = ts.type === 'MULTIPLE_STATEMENT';
                  const isStem = ts.type === 'COMMON_STEM';

                  return (
                    <div key={ts.type} className="lc-card p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border ${
                              isMulti
                                ? 'bg-indigo-500/15 border-indigo-400/25 text-indigo-300'
                                : isStem
                                ? 'bg-violet-500/15 border-violet-400/25 text-violet-300'
                                : 'bg-white/[0.05] border-[var(--lc-border)] text-[var(--lc-text-secondary)]'
                            }`}
                          >
                            {isMulti ? <Layers className="w-4 h-4" /> : <FileQuestion className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm text-[var(--lc-text)] truncate">
                              {ts.label}
                            </h3>
                            <div className="text-xs text-[var(--lc-text-muted)] tabular-nums mt-0.5">
                              {ts.totalQuestions} questions · {ts.attemptedQuestions} practiced
                            </div>
                          </div>
                        </div>

                        <div className="text-right tabular-nums shrink-0">
                          <div className="text-lg font-semibold text-[var(--lc-text)]">
                            {ts.accuracy}%
                          </div>
                          <div className="text-[11px] text-[var(--lc-text-muted)]">
                            Accuracy
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-[var(--lc-text-secondary)] tabular-nums">
                          <span>Practice coverage</span>
                          <span>{attemptedPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/[0.07] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all"
                            style={{ width: `${attemptedPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subject Breakdown Cards */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[var(--lc-text)] tracking-tight">
              Subject &amp; Chapter Breakdown
            </h2>

            {stats.subjectStats.length === 0 ? (
              <div className="lc-card p-8 text-center text-[var(--lc-text-secondary)] text-sm">
                No subject statistics recorded yet. Start practicing to generate stats!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.subjectStats.map(s => {
                  const attemptedRatio =
                    s.totalQuestions > 0
                      ? Math.round((s.attemptedQuestions / s.totalQuestions) * 100)
                      : 0;

                  return (
                    <div key={s.subjectId} className="lc-card p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[10px] bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm text-[var(--lc-text)]">
                              {s.subjectName}
                            </h3>
                            <div className="text-xs text-[var(--lc-text-muted)] tabular-nums mt-0.5">
                              {s.totalQuestions} questions · {s.attemptedQuestions} practiced
                            </div>
                          </div>
                        </div>

                        <div className="text-right tabular-nums">
                          <div className="text-lg font-semibold text-[var(--lc-text)]">
                            {s.accuracy}%
                          </div>
                          <div className="text-[11px] text-[var(--lc-text-muted)]">
                            Accuracy
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-[var(--lc-text-secondary)] tabular-nums">
                          <span>Accuracy rate</span>
                          <span>{s.accuracy}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/[0.07] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              s.accuracy >= 80
                                ? 'bg-emerald-400'
                                : s.accuracy >= 60
                                ? 'bg-indigo-400'
                                : 'bg-amber-400'
                            }`}
                            style={{ width: `${s.accuracy}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-[var(--lc-text-secondary)] tabular-nums">
                          <span>Coverage (attempted)</span>
                          <span>{attemptedRatio}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/[0.07] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-400 rounded-full transition-all"
                            style={{ width: `${attemptedRatio}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end border-t border-[var(--lc-divider)]">
                        <button
                          type="button"
                          onClick={() => onNavigate('practice', { subjectId: s.subjectId })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-indigo-500/16 text-indigo-300 hover:bg-indigo-500/26 border border-indigo-400/20 transition-colors"
                        >
                          <span>Practice {s.subjectName}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
