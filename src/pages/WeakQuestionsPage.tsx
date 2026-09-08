import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Play, 
  CheckCircle2, 
  HelpCircle, 
  Flame, 
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { getWeakQuestions, markQuestionMastered } from '../services/attemptService';
import { getAllSubjects, getAllChapters } from '../services/subjectService';
import { FlagIcons } from '../components/common/FlagIcons';
import type { Question, Subject, Chapter } from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface WeakQuestionsPageProps {
  onNavigate: (section: NavSection, params?: any) => void;
}

export const WeakQuestionsPage: React.FC<WeakQuestionsPageProps> = ({ onNavigate }) => {
  const [weakItems, setWeakItems] = useState<{
    question: Question;
    wrongCount: number;
    totalAttempts: number;
    dontUnderstand: boolean;
  }[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Map<string, Subject>>(new Map());
  const [chaptersMap, setChaptersMap] = useState<Map<string, Chapter>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [items, subjs, chaps] = await Promise.all([
        getWeakQuestions(),
        getAllSubjects(),
        getAllChapters()
      ]);
      setWeakItems(items);
      setSubjectsMap(new Map(subjs.map(s => [s.id, s])));
      setChaptersMap(new Map(chaps.map(c => [c.id, c])));
    } catch (e) {
      console.error('Failed to load weak questions', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMastered = async (qId: string) => {
    await markQuestionMastered(qId);
    setWeakItems(prev => prev.filter(i => i.question.id !== qId));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Weak & Struggling Questions</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold">
              {weakItems.length}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Questions you answered wrong multiple times or marked &quot;Don&apos;t Understand&quot;.
          </p>
        </div>

        {weakItems.length > 0 && (
          <button
            type="button"
            onClick={() => onNavigate('practice', { initialMode: 'wrong' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs self-start sm:self-auto"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Practice Weak Questions</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-zinc-500 text-sm">Detecting weak questions...</div>
      ) : weakItems.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="font-semibold text-zinc-800 dark:text-zinc-200 text-base">
            No weak questions identified!
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            You haven&apos;t accumulated recurring mistakes or &quot;Don&apos;t Understand&quot; flags. Keep practicing to build confidence.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('practice')}
            className="mt-2 px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg"
          >
            Start Practice
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {weakItems.map(({ question: q, wrongCount, totalAttempts, dontUnderstand }) => {
            const subjName = subjectsMap.get(q.subjectId)?.name || 'Subject';
            const chapName = chaptersMap.get(q.chapterId)?.name || 'Chapter';

            return (
              <div
                key={q.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        {subjName}
                      </span>
                      <span className="text-zinc-400">•</span>
                      <span className="text-xs text-zinc-500">
                        {chapName}
                      </span>
                      {(q.sources && q.sources.length > 0
                        ? q.sources
                        : [{ type: q.sourceType || 'Board', name: q.sourceName || '' }]
                      ).map((s, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                        >
                          {s.type}: {s.name}{s.entryNo ? ` (Entry #${s.entryNo})` : ''}
                        </span>
                      ))}
                      {dontUnderstand && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-semibold">
                          <HelpCircle className="w-3 h-3" />
                          <span>Needs Concept Review</span>
                        </span>
                      )}
                      {wrongCount > 1 && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Wrong {wrongCount} times ({totalAttempts} attempts)</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug pt-1">
                      {q.question}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMastered(q.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-colors"
                      title="Clear flag and mark as understood"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Mastered</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('practice', { questionId: q.id })}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Practice</span>
                    </button>
                  </div>
                </div>

                {/* Options Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {Object.entries(q.options).map(([k, v]) => {
                    const isCorrect = k.toUpperCase() === q.correctAnswer.toUpperCase();
                    return (
                      <div
                        key={k}
                        className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200 font-semibold'
                            : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-md bg-white dark:bg-zinc-700 flex items-center justify-center font-bold">
                          {k}
                        </span>
                        <span>{v}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-lg text-xs text-zinc-600 dark:text-zinc-300">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">Solution: </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
