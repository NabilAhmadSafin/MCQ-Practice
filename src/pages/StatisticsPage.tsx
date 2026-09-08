import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Award,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import { getOverallStatistics } from '../services/attemptService';
import { getAllSubjects, getChaptersBySubject } from '../services/subjectService';
import type { SubjectStatistics, ChapterStatistics } from '../types';
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Performance Analytics
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-1">
          Detailed accuracy, attempt ratios, and chapter mastery rates.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Computing analytics...</div>
      ) : !stats ? (
        <div className="p-8 text-center text-zinc-500">Failed to load statistics.</div>
      ) : (
        <div className="space-y-6">
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Overall Accuracy</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {stats.overallAccuracy}%
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Total Attempts</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {stats.totalAttempts}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-zinc-500">Active Curriculum Subjects</div>
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {stats.subjectStats.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Breakdown Cards */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Subject & Chapter Breakdown
            </h2>

            {stats.subjectStats.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-sm">
                No subject statistics recorded yet. Start practicing to generate stats!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.subjectStats.map(s => {
                  const attemptedRatio =
                    s.totalQuestions > 0 ? Math.round((s.attemptedQuestions / s.totalQuestions) * 100) : 0;

                  return (
                    <div
                      key={s.subjectId}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                              {s.subjectName}
                            </h3>
                            <div className="text-xs text-zinc-500">
                              {s.totalQuestions} Questions • {s.attemptedQuestions} Practiced
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {s.accuracy}%
                          </div>
                          <div className="text-[10px] uppercase font-semibold text-zinc-400">
                            Accuracy
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar for Accuracy */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>Accuracy Rate</span>
                          <span>{s.accuracy}%</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              s.accuracy >= 80
                                ? 'bg-emerald-500'
                                : s.accuracy >= 60
                                ? 'bg-indigo-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${s.accuracy}%` }}
                          />
                        </div>
                      </div>

                      {/* Progress Bar for Coverage */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-zinc-500">
                          <span>Coverage (Questions Attempted)</span>
                          <span>{attemptedRatio}%</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all"
                            style={{ width: `${attemptedRatio}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onNavigate('practice', { subjectId: s.subjectId })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
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
