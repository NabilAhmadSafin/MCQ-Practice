import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2
} from 'lucide-react';
import { getWeakQuestions, markQuestionMastered } from '../services/attemptService';
import { getAllSubjects, getAllChapters } from '../services/subjectService';
import { RichContentRenderer } from '../components/common/RichContentRenderer';
import type { Question, Subject, Chapter } from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface WeakQuestionsPageProps {
  onNavigate: (section: NavSection, params?: any) => void;
}

export const WeakQuestionsPage: React.FC<WeakQuestionsPageProps> = ({ onNavigate }) => {
  const [wrongItems, setWrongItems] = useState<{
    question: Question;
    wrongCount: number;
    totalAttempts: number;
    dontUnderstand: boolean;
  }[]>([]);
  const [subjectsMap, setSubjectsMap] = useState<Map<string, Subject>>(new Map());
  const [chaptersMap, setChaptersMap] = useState<Map<string, Chapter>>(new Map());
  const [loading, setLoading] = useState(true);
  const [masteringId, setMasteringId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [items, subjs, chaps] = await Promise.all([
        getWeakQuestions(),
        getAllSubjects(),
        getAllChapters()
      ]);
      setWrongItems(items);
      setSubjectsMap(new Map(subjs.map(s => [s.id, s])));
      setChaptersMap(new Map(chaps.map(c => [c.id, c])));
    } catch (e) {
      console.error('Failed to load wrong answers', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMastered = async (qId: string) => {
    setMasteringId(qId);
    try {
      await markQuestionMastered(qId);
      setWrongItems(prev => prev.filter(i => i.question.id !== qId));
    } catch (e) {
      console.error('Failed to mark question as mastered', e);
    } finally {
      setMasteringId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-[var(--lc-text)] tracking-tight flex items-baseline gap-2.5">
            <span>Wrong Answers</span>
            <span className="text-sm font-medium text-rose-400 tabular-nums">
              {wrongItems.length} to review
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-[var(--lc-text-secondary)] mt-1">
            Questions you answered wrong at least once. Click Mastered to remove a question once you&apos;ve learned it.
          </p>
        </div>

        {wrongItems.length > 0 && (
          <button
            type="button"
            onClick={() => onNavigate('practice', { initialMode: 'wrong' })}
            className="lc-btn-danger inline-flex items-center gap-2 px-4 py-2 text-sm self-start sm:self-auto"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Practice Wrong Answers</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[var(--lc-text-secondary)] text-sm">
          Loading wrong answers...
        </div>
      ) : wrongItems.length === 0 ? (
        <div className="lc-card p-12 text-center border-dashed space-y-3">
          <CheckCircle2 className="w-11 h-11 text-emerald-400 mx-auto" />
          <h3 className="font-semibold text-[var(--lc-text)] text-base">
            No wrong answers!
          </h3>
          <p className="text-xs text-[var(--lc-text-secondary)] max-w-sm mx-auto">
            Questions you answer wrong at least once will appear here until you mark them as mastered.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('practice')}
            className="lc-btn-primary mt-2 px-4 py-2 text-xs"
          >
            Start Practice
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {wrongItems.map(({ question: q, wrongCount, totalAttempts, dontUnderstand }) => {
            const subjName = subjectsMap.get(q.subjectId)?.name || 'Subject';
            const chapName = chaptersMap.get(q.chapterId)?.name || 'Chapter';
            const sourcesList =
              q.sources && q.sources.length > 0
                ? q.sources
                : q.sourceName
                ? [{ type: q.sourceType || 'Board', name: q.sourceName }]
                : [];

            return (
              <div key={q.id} className="lc-card p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Unboxed inline metadata row */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="font-semibold text-[var(--lc-text)]">
                        {subjName}
                      </span>
                      <span className="text-[var(--lc-text-muted)]" aria-hidden="true">·</span>
                      <span className="text-[var(--lc-text-secondary)]">{chapName}</span>

                      {sourcesList.map((s, idx) => (
                        <React.Fragment key={idx}>
                          <span className="text-[var(--lc-text-muted)]" aria-hidden="true">·</span>
                          <span className="text-[var(--lc-text-muted)]">
                            {s.type}: {s.name}{s.entryNo ? ` (#${s.entryNo})` : ''}
                          </span>
                        </React.Fragment>
                      ))}

                      {dontUnderstand && (
                        <>
                          <span className="text-[var(--lc-text-muted)]" aria-hidden="true">·</span>
                          <span className="font-medium text-indigo-300">
                            Needs Concept Review
                          </span>
                        </>
                      )}

                      <span className="text-[var(--lc-text-muted)]" aria-hidden="true">·</span>
                      <span className="font-medium text-rose-400 tabular-nums">
                        Wrong {wrongCount}× ({totalAttempts} attempts)
                      </span>
                    </div>

                    <div className="text-sm sm:text-[15px] font-semibold text-[var(--lc-text)] leading-relaxed pt-0.5">
                      <RichContentRenderer
                        content={q.question}
                        images={q.images}
                        contentBlocks={q.contentBlocks}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMastered(q.id)}
                      disabled={masteringId === q.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-semibold bg-emerald-500/14 text-emerald-300 hover:bg-emerald-500/24 border border-emerald-400/28 transition-colors disabled:opacity-50 whitespace-nowrap"
                      title="Mark as mastered and remove from Wrong Answers"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{masteringId === q.id ? 'Removing...' : 'Mastered'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate('practice', { questionId: q.id })}
                      className="lc-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Practice</span>
                    </button>
                  </div>
                </div>

                {/* Options Preview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {Object.entries(q.options).map(([k, v]) => {
                    const isCorrect = k.toUpperCase() === q.correctAnswer.toUpperCase();
                    return (
                      <div
                        key={k}
                        className={`p-3 rounded-[10px] border text-xs flex items-center gap-2.5 ${
                          isCorrect
                            ? 'bg-emerald-500/12 border-emerald-400/35 text-emerald-200 font-semibold'
                            : 'bg-white/[0.03] border-[var(--lc-border)] text-[var(--lc-text-secondary)]'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-[6px] border flex items-center justify-center font-semibold shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-200'
                              : 'bg-white/[0.05] border-[var(--lc-border)] text-[var(--lc-text-secondary)]'
                          }`}
                        >
                          {k}
                        </span>
                        <div className="min-w-0 flex-1">
                          <RichContentRenderer content={v} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {(q.explanation || (q.explanationBlocks && q.explanationBlocks.length > 0)) && (
                  <div className="pt-3 border-t border-[var(--lc-divider)] text-xs text-[var(--lc-text-secondary)] leading-relaxed">
                    <span className="font-semibold text-[var(--lc-text)]">Solution: </span>
                    <RichContentRenderer
                      content={q.explanation}
                      images={q.explanationImages}
                      contentBlocks={q.explanationBlocks}
                    />
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
