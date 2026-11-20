import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Bookmark,
  Flame,
  Grid,
  Award,
  TrendingUp,
  Check,
  X,
  Shuffle,
  AlertCircle,
  Layers,
  ListOrdered,
  FileText
} from 'lucide-react';
import {
  getPracticeQuestions,
  toggleQuestionFlag,
  getQuestionById
} from '../services/questionService';
import {
  getAllSubjects,
  getChaptersBySubject,
  getAllChapters
} from '../services/subjectService';
import {
  saveAttempt,
  savePracticeSession
} from '../services/attemptService';
import { getCommonInfoById } from '../services/commonInfoService';
import { toRomanNumeral } from '../utils/romanNumerals';
import { FlagIcons } from '../components/common/FlagIcons';
import { RichContentRenderer } from '../components/common/RichContentRenderer';
import { ImageLightbox } from '../components/common/ImageLightbox';
import type {
  Question,
  Subject,
  Chapter,
  PracticeSession,
  Attempt,
  QuestionType,
  CommonInformation
} from '../types';
import { GUIDE_OPTIONS, QUESTION_TYPE_LABELS } from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface PracticePageProps {
  initialSubjectId?: string;
  initialChapterId?: string;
  initialQuestionId?: string;
  initialMode?: 'wrong' | 'weak' | 'important' | 'dontUnderstand';
  onNavigate: (section: NavSection, params?: any) => void;
}

const SOURCE_TYPE_OPTIONS = ['Board', 'School'] as const;

export const PracticePage: React.FC<PracticePageProps> = ({
  initialSubjectId,
  initialChapterId,
  initialQuestionId,
  initialMode,
  onNavigate
}) => {
  // Phase of practice
  const [phase, setPhase] = useState<'config' | 'active' | 'summary'>('config');

  // Metadata
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [allChaptersMap, setAllChaptersMap] = useState<Map<string, Chapter>>(new Map());
  const allSubjectsMap = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);

  // Configuration settings
  const [configSubjectId, setConfigSubjectId] = useState(initialSubjectId || '');
  const [configChapterId, setConfigChapterId] = useState(initialChapterId || '');
  const [configQuestionTypes, setConfigQuestionTypes] = useState<QuestionType[]>([]);
  const [configSourceTypes, setConfigSourceTypes] = useState<string[]>([]);
  const [configGuides, setConfigGuides] = useState<string[]>([]);
  const [configSet, setConfigSet] = useState<
    'all' | 'unattempted' | 'wrong' | 'important' | 'veryImportant' | 'dontUnderstand'
  >(
    initialMode === 'wrong' || initialMode === 'weak'
      ? 'wrong'
      : initialMode === 'important'
      ? 'important'
      : initialMode === 'dontUnderstand'
      ? 'dontUnderstand'
      : 'all'
  );
  const [configQuestionCount, setConfigQuestionCount] = useState<number>(20);
  const [configPracticeType, setConfigPracticeType] = useState<'instant' | 'exam'>('instant');
  const [configShuffle, setConfigShuffle] = useState<boolean>(true);
  const [configTimeLimitMinutes, setConfigTimeLimitMinutes] = useState<number>(0);

  // Active session state
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [commonInfoMap, setCommonInfoMap] = useState<Record<string, CommonInformation>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({});
  const [questionStartTimestamp, setQuestionStartTimestamp] = useState<number>(Date.now());
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showGridDrawer, setShowGridDrawer] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Summary state
  const [summaryData, setSummaryData] = useState<{
    total: number;
    attempted: number;
    correct: number;
    wrong: number;
    skipped: number;
    accuracy: number;
    totalTimeSpent: number;
    wrongQuestions: Question[];
  } | null>(null);

  // Timer reference
  const timerRef = useRef<any>(null);

  // Load metadata
  useEffect(() => {
    const loadData = async () => {
      const [subjs, chaps] = await Promise.all([
        getAllSubjects(),
        getAllChapters()
      ]);
      setSubjects(subjs);
      setAllChaptersMap(new Map(chaps.map(c => [c.id, c])));

      if (initialSubjectId) {
        setConfigSubjectId(initialSubjectId);
        const subjChaps = chaps.filter(c => c.subjectId === initialSubjectId);
        setChapters(subjChaps);
        if (initialChapterId) setConfigChapterId(initialChapterId);
      } else if (subjs.length > 0) {
        setConfigSubjectId(subjs[0].id);
        const subjChaps = chaps.filter(c => c.subjectId === subjs[0].id);
        setChapters(subjChaps);
      }

      if (initialQuestionId) {
        const singleQ = await getQuestionById(initialQuestionId);
        if (singleQ) {
          startSessionWithQuestions([singleQ], 'instant', 0);
        }
      }
    };
    loadData();
  }, [initialSubjectId, initialChapterId, initialQuestionId]);

  useEffect(() => {
    if (initialMode === 'wrong' || initialMode === 'weak') setConfigSet('wrong');
    else if (initialMode === 'important') setConfigSet('important');
    else if (initialMode === 'dontUnderstand') setConfigSet('dontUnderstand');
  }, [initialMode]);

  const handleSubjectChange = async (subjId: string) => {
    setConfigSubjectId(subjId);
    setConfigChapterId('');
    if (subjId) {
      const chaps = await getChaptersBySubject(subjId);
      setChapters(chaps);
    } else {
      setChapters([]);
    }
  };

  const toggleSourceType = (type: string) => {
    setConfigSourceTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleGuide = (guide: string) => {
    setConfigGuides(prev => {
      const next = prev.includes(guide) ? prev.filter(g => g !== guide) : [...prev, guide];
      if (next.length === 1 && prev.length === 0) {
        // Automatically disable shuffle when a single specific guide is chosen
        setConfigShuffle(false);
      }
      return next;
    });
  };

  const toggleQuestionType = (type: QuestionType) => {
    setConfigQuestionTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Start practice session
  const handleStartPractice = async () => {
    setSessionError(null);
    try {
      const qs = await getPracticeQuestions({
        subjectId: configSubjectId || undefined,
        chapterId: configChapterId || undefined,
        questionTypes: configQuestionTypes.length > 0 ? configQuestionTypes : undefined,
        sourceTypes: configSourceTypes.length > 0 ? configSourceTypes : undefined,
        guides: configGuides.length > 0 ? configGuides : undefined,
        set: configSet,
        count: configQuestionCount,
        shuffle: configShuffle
      });

      if (qs.length === 0) {
        setSessionError('No questions match your practice criteria. Try broadening your filter selection.');
        return;
      }

      startSessionWithQuestions(qs, configPracticeType, configTimeLimitMinutes);
    } catch (e: any) {
      setSessionError(e.message || 'Failed to prepare questions');
    }
  };

  const startSessionWithQuestions = async (
    questionsList: Question[],
    type: 'instant' | 'exam',
    timeLimitMins: number
  ) => {
    setSessionQuestions(questionsList);
    setCurrentIndex(0);
    setUserAnswers({});
    setQuestionTimes({});
    setSessionStartTime(Date.now());
    setQuestionStartTimestamp(Date.now());
    setElapsedSeconds(0);
    setRemainingSeconds(timeLimitMins > 0 ? timeLimitMins * 60 : 0);
    setPhase('active');
    setShowGridDrawer(false);

    // Preload common information records for any common stem questions in this session
    const stemInfoIds = Array.from(
      new Set(questionsList.map(q => q.commonInfoId).filter(Boolean))
    ) as string[];
    if (stemInfoIds.length > 0) {
      try {
        const infos = await Promise.all(stemInfoIds.map(id => getCommonInfoById(id)));
        const map: Record<string, CommonInformation> = {};
        infos.forEach(info => {
          if (info) map[info.id] = info;
        });
        setCommonInfoMap(map);
      } catch (err) {
        console.error('Failed to preload common info:', err);
      }
    }
  };

  // Ensure current question's common info is loaded if not already cached
  useEffect(() => {
    const q = sessionQuestions[currentIndex];
    if (q?.commonInfoId && !commonInfoMap[q.commonInfoId]) {
      getCommonInfoById(q.commonInfoId).then(info => {
        if (info) {
          setCommonInfoMap(prev => ({ ...prev, [info.id]: info }));
        }
      });
    }
  }, [currentIndex, sessionQuestions, commonInfoMap]);

  // Timer effect
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
        if (configTimeLimitMinutes > 0) {
          setRemainingSeconds(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              handleFinishSession();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, configTimeLimitMinutes]);

  // Handle choosing an option
  const handleSelectOption = async (optionKey: 'A' | 'B' | 'C' | 'D') => {
    const currentQ = sessionQuestions[currentIndex];
    if (!currentQ) return;

    if (configPracticeType === 'instant' && userAnswers[currentQ.id]) {
      return; // Already answered in instant mode
    }

    const timeSpentOnQuestion = Math.max(1, Math.round((Date.now() - questionStartTimestamp) / 1000));
    setQuestionTimes(prev => ({
      ...prev,
      [currentQ.id]: (prev[currentQ.id] || 0) + timeSpentOnQuestion
    }));

    setUserAnswers(prev => ({
      ...prev,
      [currentQ.id]: optionKey
    }));

    if (configPracticeType === 'instant') {
      const isCorrect = optionKey.toUpperCase() === currentQ.correctAnswer.toUpperCase();
      try {
        await saveAttempt({
          questionId: currentQ.id,
          selectedAnswer: optionKey,
          isCorrect,
          timeSpentSeconds: timeSpentOnQuestion
        });
      } catch (err) {
        console.error('Failed to log attempt:', err);
      }
    }
  };

  // Navigation between questions
  const handleNext = () => {
    if (currentIndex < sessionQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setQuestionStartTimestamp(Date.now());
    } else {
      handleFinishSession();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setQuestionStartTimestamp(Date.now());
    }
  };

  const handleJumpTo = (index: number) => {
    if (index >= 0 && index < sessionQuestions.length) {
      setCurrentIndex(index);
      setQuestionStartTimestamp(Date.now());
      setShowGridDrawer(false);
    }
  };

  // Finish practice session & generate summary
  const handleFinishSession = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    const total = sessionQuestions.length;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    const wrongQs: Question[] = [];

    const attemptsToSave: any[] = [];

    sessionQuestions.forEach(q => {
      const ans = userAnswers[q.id];
      const timeSpent = questionTimes[q.id] || 0;
      if (!ans) {
        skipped++;
      } else if (ans.toUpperCase() === q.correctAnswer.toUpperCase()) {
        correct++;
        if (configPracticeType === 'exam') {
          attemptsToSave.push({
            questionId: q.id,
            selectedAnswer: ans,
            isCorrect: true,
            timeSpentSeconds: timeSpent
          });
        }
      } else {
        wrong++;
        wrongQs.push(q);
        if (configPracticeType === 'exam') {
          attemptsToSave.push({
            questionId: q.id,
            selectedAnswer: ans,
            isCorrect: false,
            timeSpentSeconds: timeSpent
          });
        }
      }
    });

    if (configPracticeType === 'exam' && attemptsToSave.length > 0) {
      for (const att of attemptsToSave) {
        try {
          await saveAttempt(att);
        } catch (e) {
          console.error('Failed saving exam attempt', e);
        }
      }
    }

    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const totalTime = Math.round((Date.now() - sessionStartTime) / 1000);

    try {
      await savePracticeSession({
        subjectId: configSubjectId || 'mixed',
        chapterId: configChapterId || undefined,
        mode: configPracticeType,
        totalQuestions: total,
        correctCount: correct,
        wrongCount: wrong,
        skippedCount: skipped,
        accuracy: accuracy,
        totalTimeSeconds: totalTime
      });
    } catch (e) {
      console.error('Failed saving practice session', e);
    }

    setSummaryData({
      total,
      attempted,
      correct,
      wrong,
      skipped,
      accuracy,
      totalTimeSpent: totalTime,
      wrongQuestions: wrongQs
    });

    setPhase('summary');
  };

  const handleToggleCurrentFlag = async (
    flag: 'important' | 'veryImportant' | 'dontUnderstand'
  ) => {
    const currentQ = sessionQuestions[currentIndex];
    if (!currentQ) return;
    const nextVal = await toggleQuestionFlag(currentQ.id, flag);
    setSessionQuestions(prev =>
      prev.map(q => (q.id === currentQ.id ? { ...q, [flag]: nextVal } : q))
    );
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = sessionQuestions[currentIndex];
  const currentAnswer = currentQ ? userAnswers[currentQ.id] : undefined;
  const isAnswered = Boolean(currentAnswer);

  const currentSources = currentQ
    ? currentQ.sources && currentQ.sources.length > 0
      ? currentQ.sources
      : [{ type: currentQ.sourceType || 'Board', name: currentQ.sourceName || '' }]
    : [];

  return (
    <div className="min-h-full">
      {/* 1. CONFIGURATION VIEW */}
      {phase === 'config' && (
        <div className="p-5 sm:p-7 lg:p-8 max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--lc-text)]">
              Practice Setup
            </h1>
            <p className="text-[13px] text-[var(--lc-text-secondary)] mt-1">
              Filter questions by subject, board/school source, or guide, and customize your timer.
            </p>
          </div>

          {sessionError && (
            <div className="p-3.5 bg-[var(--lc-warning-soft)] border border-[var(--lc-warning)]/30 rounded-[12px] text-xs font-medium text-[var(--lc-warning)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{sessionError}</span>
            </div>
          )}

          <div className="lc-panel p-5 sm:p-7 space-y-5">
              {/* Subject & Chapter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--lc-text-secondary)] mb-1.5">
                    Subject
                  </label>
                  <select
                    value={configSubjectId}
                    onChange={e => handleSubjectChange(e.target.value)}
                    className="lc-select w-full text-sm px-3 py-2"
                  >
                    <option value="">All Subjects (Mixed)</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--lc-text-secondary)] mb-1.5">
                    Chapter
                  </label>
                  <select
                    value={configChapterId}
                    onChange={e => setConfigChapterId(e.target.value)}
                    disabled={!configSubjectId}
                    className="lc-select w-full text-sm px-3 py-2 disabled:opacity-50"
                  >
                    <option value="">All Chapters</option>
                    {chapters.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            {/* Source Types (Multi-select) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--lc-text-secondary)]">
                  Source Type Filter (Choose Multiple)
                </label>
                {configSourceTypes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfigSourceTypes([])}
                    className="text-[11px] font-medium text-[var(--lc-accent)] hover:underline"
                  >
                    Clear source types
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {SOURCE_TYPE_OPTIONS.map(st => {
                  const isChecked = configSourceTypes.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => toggleSourceType(st)}
                      className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold border transition whitespace-nowrap ${
                        isChecked
                          ? 'bg-[var(--lc-accent)] text-white border-[var(--lc-accent)]'
                          : 'bg-[var(--lc-surface-subtle)] text-[var(--lc-text-secondary)] border-[var(--lc-border)] hover:text-[var(--lc-text)]'
                      }`}
                    >
                      {st} Questions
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Guides */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--lc-text-secondary)]">
                  Guide Filter (Choose Multiple)
                </label>
                {configGuides.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfigGuides([])}
                    className="text-[11px] font-medium text-[var(--lc-accent)] hover:underline"
                  >
                    Clear guides
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {GUIDE_OPTIONS.map(g => {
                  const isChecked = configGuides.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGuide(g)}
                      className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold border transition whitespace-nowrap ${
                        isChecked
                          ? 'bg-[var(--lc-accent)] text-white border-[var(--lc-accent)]'
                          : 'bg-[var(--lc-surface-subtle)] text-[var(--lc-text-secondary)] border-[var(--lc-border)] hover:text-[var(--lc-text)]'
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Type Filter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[var(--lc-text-secondary)]">
                  Question Type Filter / প্রশ্নের ধরন
                </label>
                {configQuestionTypes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfigQuestionTypes([])}
                    className="text-[11px] font-medium text-[var(--lc-accent)] hover:underline"
                  >
                    Clear type filter
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { type: 'STANDARD' as QuestionType, label: 'Standard MCQ' },
                  { type: 'MULTIPLE_STATEMENT' as QuestionType, label: 'বহুপদী সমাপ্তিসূচক' },
                  { type: 'COMMON_STEM' as QuestionType, label: 'অভিন্ন তথ্যভিত্তিক' }
                ].map(t => {
                  const isChecked = configQuestionTypes.includes(t.type);
                  return (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => toggleQuestionType(t.type)}
                      className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold border transition whitespace-nowrap ${
                        isChecked
                          ? 'bg-[var(--lc-accent)] text-white border-[var(--lc-accent)]'
                          : 'bg-[var(--lc-surface-subtle)] text-[var(--lc-text-secondary)] border-[var(--lc-border)] hover:text-[var(--lc-text)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Target Set */}
            <div>
              <label className="block text-xs font-semibold text-[var(--lc-text-secondary)] mb-2">
                Question Target Set
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'all', label: 'All Questions', desc: 'Full pool' },
                  { id: 'unattempted', label: 'Unattempted', desc: 'New to you' },
                  { id: 'wrong', label: 'Wrong Answers', desc: 'Mistakes drill' },
                  { id: 'important', label: 'Important', desc: 'Marked important' },
                  { id: 'veryImportant', label: 'Very Important', desc: 'High priority' },
                  { id: 'dontUnderstand', label: "Don't Understand", desc: 'Concept clarity' }
                ].map(opt => {
                  const isSelected = configSet === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setConfigSet(opt.id as any)}
                      className={`p-3 rounded-[10px] border text-left transition-colors ${
                        isSelected
                          ? 'border-[var(--lc-accent)] bg-[var(--lc-accent-soft)]'
                          : 'border-[var(--lc-border)] bg-[var(--lc-surface-subtle)] hover:border-[var(--lc-border-strong)]'
                      }`}
                    >
                      <div className={`text-xs font-semibold ${isSelected ? 'text-[var(--lc-accent)]' : 'text-[var(--lc-text)]'}`}>
                        {opt.label}
                      </div>
                      <div className="text-[11px] text-[var(--lc-text-secondary)] mt-0.5">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Number of Questions */}
            <div>
              <label className="block text-xs font-semibold text-[var(--lc-text-secondary)] mb-2">
                Number of Questions
              </label>
              <div className="flex items-center gap-2 flex-wrap tabular-nums">
                {[10, 20, 30, 50, 100].map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setConfigQuestionCount(count)}
                    className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold border transition ${
                      configQuestionCount === count
                        ? 'border-[var(--lc-accent)] bg-[var(--lc-accent)] text-white'
                        : 'border-[var(--lc-border)] bg-[var(--lc-surface-subtle)] text-[var(--lc-text-secondary)] hover:text-[var(--lc-text)]'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Mode */}
            <div>
              <label className="block text-xs font-semibold text-[var(--lc-text-secondary)] mb-2">
                Practice Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfigPracticeType('instant')}
                  className={`p-3.5 rounded-[10px] border text-left transition ${
                    configPracticeType === 'instant'
                      ? 'border-[var(--lc-accent)] bg-[var(--lc-accent-soft)]'
                      : 'border-[var(--lc-border)] bg-[var(--lc-surface-subtle)] hover:border-[var(--lc-border-strong)]'
                  }`}
                >
                  <div className="text-xs font-semibold text-[var(--lc-text)]">
                    Instant Feedback
                  </div>
                  <div className="text-[11px] text-[var(--lc-text-secondary)] mt-0.5">
                    See correct answer and explanation right after answering each question.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigPracticeType('exam')}
                  className={`p-3.5 rounded-[10px] border text-left transition ${
                    configPracticeType === 'exam'
                      ? 'border-[var(--lc-accent)] bg-[var(--lc-accent-soft)]'
                      : 'border-[var(--lc-border)] bg-[var(--lc-surface-subtle)] hover:border-[var(--lc-border-strong)]'
                  }`}
                >
                  <div className="text-xs font-semibold text-[var(--lc-text)]">
                    Exam Mode
                  </div>
                  <div className="text-[11px] text-[var(--lc-text-secondary)] mt-0.5">
                    Answers and explanations hidden until you complete and submit the whole test.
                  </div>
                </button>
              </div>
            </div>

            {/* Options: Shuffle & Timer */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[var(--lc-border)]">
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--lc-text)]">
                  <input
                    type="checkbox"
                    checked={configShuffle}
                    onChange={e => setConfigShuffle(e.target.checked)}
                    className="rounded accent-[var(--lc-accent)] w-4 h-4"
                  />
                  <span>Shuffle questions randomly</span>
                </label>
                {configGuides.length === 1 && !configShuffle && (
                  <span className="lc-badge text-[11px] text-[var(--lc-accent)] bg-[var(--lc-accent-soft)] px-2.5 py-0.5 border border-[var(--lc-accent-border)]">
                    Practicing in {configGuides[0]} Entry # Order
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-[var(--lc-text-muted)]" />
                <span className="text-[var(--lc-text-secondary)]">Timer:</span>
                <select
                  value={configTimeLimitMinutes}
                  onChange={e => setConfigTimeLimitMinutes(Number(e.target.value))}
                  className="lc-select text-xs px-2.5 py-1.5"
                >
                  <option value={0}>Stopwatch (Count Up)</option>
                  <option value={10}>10 Minutes Countdown</option>
                  <option value={15}>15 Minutes Countdown</option>
                  <option value={25}>25 Minutes Countdown</option>
                  <option value={45}>45 Minutes Countdown</option>
                </select>
              </div>
            </div>

            {/* Start Button */}
            <div className="pt-2">
              <button
                type="button"
                id="start-practice-session-btn"
                onClick={handleStartPractice}
                className="lc-btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Practice Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ACTIVE PRACTICE VIEW */}
      {phase === 'active' && currentQ && (
        <div className="p-5 sm:p-7 lg:p-8 max-w-4xl mx-auto space-y-5">
          {/* Top Frosted HUD Bar */}
          <div className="lc-glass rounded-[14px] px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-semibold text-[var(--lc-text)] tabular-nums">
                {currentIndex + 1} <span className="text-[var(--lc-text-muted)] font-normal">/ {sessionQuestions.length}</span>
              </span>

              <button
                type="button"
                onClick={() => setShowGridDrawer(!showGridDrawer)}
                className="lc-btn-ghost inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Overview Grid</span>
              </button>
            </div>

            {/* Timer Display & Finish */}
            <div className="flex items-center gap-2.5">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs font-mono tabular-nums border ${
                  configTimeLimitMinutes > 0 && remainingSeconds < 120
                    ? 'bg-[var(--lc-error-soft)] border-[var(--lc-error)]/40 text-[var(--lc-error)]'
                    : 'bg-white/[0.04] border-[var(--lc-border)] text-[var(--lc-text)]'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-[var(--lc-text-muted)]" />
                <span>
                  {configTimeLimitMinutes > 0
                    ? formatTime(remainingSeconds)
                    : formatTime(elapsedSeconds)}
                </span>
              </div>

              <button
                type="button"
                id="finish-session-btn"
                onClick={handleFinishSession}
                className="lc-btn-primary px-3.5 py-1.5 text-xs"
              >
                Finish Session
              </button>
            </div>
          </div>

          {/* Collapsible Overview Grid Drawer */}
          {showGridDrawer && (
            <div className="lc-card p-4 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between text-xs text-[var(--lc-text-secondary)]">
                <span>Jump directly to any question:</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-[3px] bg-[var(--lc-success)]" /> Answered
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-[3px] bg-white/25" /> Unanswered
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5 max-h-48 overflow-y-auto p-1">
                {sessionQuestions.map((q, idx) => {
                  const answered = Boolean(userAnswers[q.id]);
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleJumpTo(idx)}
                      className={`h-8 rounded-[8px] text-xs font-semibold font-mono tabular-nums transition-colors ${
                        isCurrent
                          ? 'ring-2 ring-[var(--lc-accent)] bg-[var(--lc-accent)] text-white'
                          : answered
                          ? 'bg-[var(--lc-success-soft)] text-[var(--lc-success)]'
                          : 'bg-white/[0.04] text-[var(--lc-text-secondary)] hover:bg-white/[0.08]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question Card */}
          <div className="lc-panel p-5 sm:p-8 space-y-6">
            {/* Meta bar (clean unboxed typography) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-[var(--lc-divider)]">
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="font-medium text-indigo-300">
                  {QUESTION_TYPE_LABELS[currentQ.questionType || 'STANDARD']}
                </span>
                <span className="text-[var(--lc-text-muted)]" aria-hidden="true">·</span>
                <span className="font-semibold text-[var(--lc-text)]">
                  {allSubjectsMap.get(currentQ.subjectId)?.name || 'Subject'}
                </span>
                <span className="text-[var(--lc-text-muted)]" aria-hidden="true">·</span>
                <span className="text-[var(--lc-text-secondary)]">
                  {allChaptersMap.get(currentQ.chapterId)?.name || 'Chapter'}
                </span>
                {currentSources.some(s => s.name) &&
                  currentSources.map((s, idx) => (
                    <React.Fragment key={idx}>
                      <span className="text-[var(--lc-text-muted)]" aria-hidden="true">·</span>
                      <span className="text-[var(--lc-text-muted)]">
                        {s.type}: {s.name}
                        {s.type?.toLowerCase() === 'guide' && s.entryNo ? ` #${s.entryNo}` : ''}
                      </span>
                    </React.Fragment>
                  ))}
              </div>

              {/* Interactive Flag toggles */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleCurrentFlag('important')}
                  className={`p-1.5 rounded-[8px] border text-xs transition-colors ${
                    currentQ.important
                      ? 'bg-[var(--lc-warning-soft)] text-[var(--lc-warning)] border-[var(--lc-warning)]/40'
                      : 'bg-[var(--lc-surface-subtle)] border-[var(--lc-border)] text-[var(--lc-text-muted)] hover:text-[var(--lc-text)]'
                  }`}
                  title="Mark Important"
                >
                  <Bookmark className={`w-3.5 h-3.5 ${currentQ.important ? 'fill-current' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCurrentFlag('veryImportant')}
                  className={`p-1.5 rounded-[8px] border text-xs transition-colors ${
                    currentQ.veryImportant
                      ? 'bg-[var(--lc-error-soft)] text-[var(--lc-error)] border-[var(--lc-error)]/40'
                      : 'bg-[var(--lc-surface-subtle)] border-[var(--lc-border)] text-[var(--lc-text-muted)] hover:text-[var(--lc-text)]'
                  }`}
                  title="Mark Very Important"
                >
                  <Flame className={`w-3.5 h-3.5 ${currentQ.veryImportant ? 'fill-current' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCurrentFlag('dontUnderstand')}
                  className={`p-1.5 rounded-[8px] border text-xs transition-colors ${
                    currentQ.dontUnderstand
                      ? 'bg-[var(--lc-accent-soft)] text-[var(--lc-accent)] border-[var(--lc-accent-border)]'
                      : 'bg-[var(--lc-surface-subtle)] border-[var(--lc-border)] text-[var(--lc-text-muted)] hover:text-[var(--lc-text)]'
                  }`}
                  title="Mark Don't Understand"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* COMMON STEM PASSAGE */}
            {currentQ.commonInfoId && commonInfoMap[currentQ.commonInfoId] && (
              <div className="rounded-[12px] border border-[var(--lc-accent-border)] bg-[var(--lc-accent-soft)] p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-[var(--lc-accent)] font-semibold text-xs">
                    <Layers className="w-4 h-4" />
                    <span>{commonInfoMap[currentQ.commonInfoId].title || 'উদ্দীপক / অভিন্ন তথ্য'}</span>
                  </div>

                  {(() => {
                    const groupQs = sessionQuestions.filter(q => q.commonInfoId === currentQ.commonInfoId);
                    if (groupQs.length <= 1) return null;
                    return (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-[var(--lc-text-secondary)] text-[11px]">গ্রুপের প্রশ্ন:</span>
                        {groupQs.map((gq, gIdx) => {
                          const isThis = gq.id === currentQ.id;
                          const targetIdx = sessionQuestions.findIndex(q => q.id === gq.id);
                          const isGrpAnswered = Boolean(userAnswers[gq.id]);
                          return (
                            <button
                              key={gq.id}
                              type="button"
                              onClick={() => targetIdx >= 0 && handleJumpTo(targetIdx)}
                              className={`px-2 py-0.5 rounded-[8px] text-xs font-semibold font-mono tabular-nums transition-colors ${
                                isThis
                                  ? 'bg-[var(--lc-accent)] text-white'
                                  : isGrpAnswered
                                  ? 'bg-[var(--lc-success-soft)] text-[var(--lc-success)]'
                                  : 'bg-[var(--lc-surface)] text-[var(--lc-text-secondary)] border border-[var(--lc-border)] hover:text-[var(--lc-text)]'
                              }`}
                              title={`Jump to group question #${gIdx + 1}`}
                            >
                              {gIdx + 1}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <div className="text-sm sm:text-base text-[var(--lc-text)] leading-relaxed font-sans">
                  <RichContentRenderer
                    content={commonInfoMap[currentQ.commonInfoId].content}
                    contentBlocks={commonInfoMap[currentQ.commonInfoId].contentBlocks}
                    images={commonInfoMap[currentQ.commonInfoId].images}
                  />
                </div>
              </div>
            )}

            {/* Prompt */}
            <div className="text-base sm:text-lg font-medium text-[var(--lc-text)] leading-relaxed">
              <RichContentRenderer
                content={currentQ.question}
                contentBlocks={currentQ.contentBlocks}
                images={currentQ.images}
              />
            </div>

            {/* MULTIPLE STATEMENT LIST */}
            {currentQ.statements && currentQ.statements.length > 0 && (
              <div className="rounded-[12px] border border-[var(--lc-border)] bg-[var(--lc-surface-subtle)] p-4 space-y-2">
                {currentQ.statements.map((stmt, sIdx) => (
                  <div key={sIdx} className="flex items-start gap-2.5 text-sm sm:text-base text-[var(--lc-text)]">
                    <span className="font-mono font-semibold text-xs bg-[var(--lc-surface)] border border-[var(--lc-border)] text-[var(--lc-text-secondary)] px-2 py-0.5 rounded-[8px] shrink-0 mt-0.5">
                      {toRomanNumeral(sIdx + 1)}.
                    </span>
                    <div className="flex-1 leading-relaxed">
                      <RichContentRenderer content={stmt} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Options List */}
            <div className="space-y-3">
              {(['A', 'B', 'C', 'D'] as const).map(optKey => {
                const optText = currentQ.options[optKey];
                const optImg = currentQ.optionImages?.[optKey];
                const isSelected = currentAnswer === optKey;

                let btnStyles =
                  'border-[var(--lc-border)] bg-[var(--lc-surface-subtle)] hover:bg-[var(--lc-surface-hover)] hover:border-[var(--lc-border-strong)] text-[var(--lc-text)]';
                let badgeStyles = 'bg-[var(--lc-surface)] border border-[var(--lc-border)] text-[var(--lc-text-secondary)]';

                if (configPracticeType === 'instant' && isAnswered) {
                  const isCorrectAnswer = optKey.toUpperCase() === currentQ.correctAnswer.toUpperCase();
                  if (isCorrectAnswer) {
                    btnStyles =
                      'border-[var(--lc-success)] bg-[var(--lc-success-soft)] text-[var(--lc-text)] font-medium ring-1 ring-[var(--lc-success)]';
                    badgeStyles = 'bg-[var(--lc-success)] text-white border-transparent';
                  } else if (isSelected && !isCorrectAnswer) {
                    btnStyles =
                      'border-[var(--lc-error)] bg-[var(--lc-error-soft)] text-[var(--lc-text)] font-medium';
                    badgeStyles = 'bg-[var(--lc-error)] text-white border-transparent';
                  } else {
                    btnStyles = 'border-[var(--lc-border)] opacity-60 text-[var(--lc-text-muted)]';
                  }
                } else if (isSelected) {
                  btnStyles =
                    'border-[var(--lc-accent)] bg-[var(--lc-accent-soft)] text-[var(--lc-text)] font-medium ring-1 ring-[var(--lc-accent)]';
                  badgeStyles = 'bg-[var(--lc-accent)] text-white border-transparent';
                }

                return (
                  <button
                    key={optKey}
                    type="button"
                    onClick={() => handleSelectOption(optKey)}
                    className={`w-full p-3.5 sm:p-4 rounded-[12px] border text-left flex items-start gap-3 transition-all ${btnStyles}`}
                  >
                    <span
                      className={`w-6 h-6 rounded-[8px] flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 ${badgeStyles}`}
                    >
                      {optKey}
                    </span>
                    <div className="flex-1">
                      <RichContentRenderer content={optText} />
                      {optImg && (
                        <div className="mt-2 inline-block max-w-[220px]" onClick={e => e.stopPropagation()}>
                          <ImageLightbox
                            image={optImg}
                            alt={`Option ${optKey} figure`}
                            className="max-h-24 sm:max-h-32 object-contain rounded-[8px] border border-[var(--lc-border)] bg-[var(--lc-surface)]"
                          />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Instant Mode Explanation Card */}
            {configPracticeType === 'instant' && isAnswered && (
              <div className="p-4 sm:p-5 rounded-[12px] bg-[var(--lc-surface-subtle)] border border-[var(--lc-border)] space-y-2 animate-fadeIn">
                <div className="flex items-center gap-2">
                  {currentAnswer?.toUpperCase() === currentQ.correctAnswer.toUpperCase() ? (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--lc-success)]">
                      <CheckCircle2 className="w-4 h-4" /> Correct Answer!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--lc-error)]">
                      <XCircle className="w-4 h-4" /> Incorrect. Correct Answer: {currentQ.correctAnswer}
                    </span>
                  )}
                </div>

                {currentQ.explanation || (currentQ.explanationImages && currentQ.explanationImages.length > 0) ? (
                  <div className="text-xs text-[var(--lc-text-secondary)] leading-relaxed pt-1">
                    <span className="font-semibold text-[var(--lc-text)]">Explanation: </span>
                    <div className="mt-1">
                      <RichContentRenderer
                        content={currentQ.explanation || ''}
                        images={currentQ.explanationImages}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-[var(--lc-text-muted)] italic">No explanation provided for this question.</div>
                )}
              </div>
            )}

            {/* Bottom Actions: Prev / Next */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--lc-border)]">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="lc-btn-secondary px-4 py-2 text-xs disabled:opacity-30 disabled:pointer-events-none"
              >
                ← Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="lc-btn-primary px-5 py-2 text-xs"
              >
                {currentIndex === sessionQuestions.length - 1 ? 'Finish' : 'Next Question →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUMMARY VIEW */}
      {phase === 'summary' && summaryData && (
        <div className="p-5 sm:p-7 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fadeIn">
          <div className="text-center space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--lc-text)]">
              Practice Completed
            </h1>
            <p className="text-xs sm:text-sm text-[var(--lc-text-secondary)]">
              Here is your performance breakdown for this session.
            </p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="lc-card p-4 text-center">
              <div className="text-xs text-[var(--lc-text-secondary)]">Accuracy</div>
              <div className="text-2xl font-semibold text-[var(--lc-accent)] mt-1 tabular-nums">
                {summaryData.accuracy}%
              </div>
              <div className="text-[11px] text-[var(--lc-text-muted)] mt-0.5 tabular-nums">
                {summaryData.correct} of {summaryData.attempted} correct
              </div>
            </div>

            <div className="lc-card p-4 text-center">
              <div className="text-xs text-[var(--lc-text-secondary)]">Correct</div>
              <div className="text-2xl font-semibold text-[var(--lc-success)] mt-1 tabular-nums">
                {summaryData.correct}
              </div>
              <div className="text-[11px] text-[var(--lc-text-muted)] mt-0.5">Questions</div>
            </div>

            <div className="lc-card p-4 text-center">
              <div className="text-xs text-[var(--lc-text-secondary)]">Wrong</div>
              <div className="text-2xl font-semibold text-[var(--lc-error)] mt-1 tabular-nums">
                {summaryData.wrong}
              </div>
              <div className="text-[11px] text-[var(--lc-text-muted)] mt-0.5 tabular-nums">
                {summaryData.skipped} skipped
              </div>
            </div>

            <div className="lc-card p-4 text-center">
              <div className="text-xs text-[var(--lc-text-secondary)]">Time Spent</div>
              <div className="text-2xl font-semibold text-[var(--lc-text)] mt-1 font-mono tabular-nums">
                {formatTime(summaryData.totalTimeSpent)}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            {summaryData.wrongQuestions.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  startSessionWithQuestions(summaryData.wrongQuestions, 'instant', 0)
                }
                className="lc-btn-danger w-full sm:w-auto px-5 py-2.5 text-xs flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Practice {summaryData.wrongQuestions.length} Wrong Answers Again</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setPhase('config')}
              className="lc-btn-secondary w-full sm:w-auto px-5 py-2.5 text-xs"
            >
              Configure New Practice
            </button>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="lc-btn-primary w-full sm:w-auto px-5 py-2.5 text-xs"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Detailed Answer Review */}
          <div className="lc-card p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-[var(--lc-text)]">
              Detailed Question Review ({sessionQuestions.length})
            </h2>

            <div className="space-y-4 divide-y divide-[var(--lc-border)]">
              {sessionQuestions.map((q, idx) => {
                const userAns = userAnswers[q.id];
                const isCorrect = userAns && userAns.toUpperCase() === q.correctAnswer.toUpperCase();
                const isSkipped = !userAns;

                const qSources =
                  q.sources && q.sources.length > 0
                    ? q.sources
                    : [{ type: q.sourceType || 'Board', name: q.sourceName || '' }];

                return (
                  <div key={q.id} className="pt-4 first:pt-0 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="font-mono font-semibold text-xs text-[var(--lc-text-muted)] mt-0.5 tabular-nums">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-medium text-sm text-[var(--lc-text)]">
                            <RichContentRenderer
                              content={q.question}
                              contentBlocks={q.contentBlocks}
                              images={q.images}
                            />
                          </div>
                          {q.commonInfoId && commonInfoMap[q.commonInfoId] && (
                            <div className="mt-1.5 text-[11px] p-2.5 rounded-[10px] bg-[var(--lc-accent-soft)] text-[var(--lc-text)] border border-[var(--lc-accent-border)]">
                              <span className="font-semibold text-[var(--lc-accent)]">উদ্দীপক: </span>
                              <RichContentRenderer
                                content={commonInfoMap[q.commonInfoId].content}
                                contentBlocks={commonInfoMap[q.commonInfoId].contentBlocks}
                                images={commonInfoMap[q.commonInfoId].images}
                              />
                            </div>
                          )}
                          {q.statements && q.statements.length > 0 && (
                            <div className="mt-1.5 space-y-0.5 text-xs p-2.5 rounded-[10px] border border-[var(--lc-border)] bg-[var(--lc-surface-subtle)] text-[var(--lc-text-secondary)]">
                              {q.statements.map((st, sIdx) => (
                                <div key={sIdx} className="flex items-start gap-1.5">
                                  <span className="font-mono font-semibold text-[10px] text-[var(--lc-text-muted)] shrink-0">
                                    {toRomanNumeral(sIdx + 1)}.
                                  </span>
                                  <RichContentRenderer content={st} />
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px] text-[var(--lc-text-muted)]">
                            <span className="font-medium text-indigo-300">
                              {QUESTION_TYPE_LABELS[q.questionType || 'STANDARD']}
                            </span>
                            {qSources.map((s, sIdx) => (
                              <React.Fragment key={sIdx}>
                                <span aria-hidden="true">·</span>
                                <span>
                                  {s.type}: {s.name}{s.entryNo ? ` (#${s.entryNo})` : ''}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-xs font-semibold">
                        {isSkipped ? (
                          <span className="text-[var(--lc-text-muted)]">Skipped</span>
                        ) : isCorrect ? (
                          <span className="text-emerald-400">Correct</span>
                        ) : (
                          <span className="text-rose-400">Wrong (You: {userAns})</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {Object.entries(q.options).map(([k, v]) => {
                        const optCorrect = k.toUpperCase() === q.correctAnswer.toUpperCase();
                        const optChosen = userAns && k.toUpperCase() === userAns.toUpperCase();
                        const optImg = q.optionImages?.[k];

                        return (
                          <div
                            key={k}
                            className={`p-2.5 rounded-[10px] border text-xs flex items-start gap-2 ${
                              optCorrect
                                ? 'bg-[var(--lc-success-soft)] border-[var(--lc-success)]/40 text-[var(--lc-text)] font-medium'
                                : optChosen
                                ? 'bg-[var(--lc-error-soft)] border-[var(--lc-error)]/40 text-[var(--lc-text)]'
                                : 'bg-[var(--lc-surface-subtle)] border-[var(--lc-border)] text-[var(--lc-text-secondary)]'
                            }`}
                          >
                            <span className="font-semibold shrink-0">{k}:</span>
                            <div className="flex-1">
                              <RichContentRenderer content={v} />
                              {optImg && (
                                <div className="mt-1">
                                  <ImageLightbox
                                    image={optImg}
                                    alt={`Option ${k} diagram`}
                                    className="max-h-16 object-contain rounded-[6px]"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {(q.explanation || (q.explanationImages && q.explanationImages.length > 0)) && (
                      <div className="text-xs text-[var(--lc-text-secondary)] pt-1">
                        <span className="font-semibold text-[var(--lc-text)]">
                          Explanation:
                        </span>{' '}
                        <div className="mt-1">
                          <RichContentRenderer
                            content={q.explanation || ''}
                            images={q.explanationImages}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
