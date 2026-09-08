import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  AlertCircle
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
import { FlagIcons } from '../components/common/FlagIcons';
import type {
  Question,
  Subject,
  Chapter,
  PracticeSession,
  Attempt
} from '../types';
import { GUIDE_OPTIONS } from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface PracticePageProps {
  initialSubjectId?: string;
  initialChapterId?: string;
  initialQuestionId?: string;
  initialMode?: 'wrong' | 'important' | 'dontUnderstand';
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
  const [allSubjectsMap, setAllSubjectsMap] = useState<Map<string, Subject>>(new Map());

  // Configuration settings
  const [configSubjectId, setConfigSubjectId] = useState(initialSubjectId || '');
  const [configChapterId, setConfigChapterId] = useState(initialChapterId || '');
  const [configSourceTypes, setConfigSourceTypes] = useState<string[]>([]);
  const [configGuides, setConfigGuides] = useState<string[]>([]);
  const [configSet, setConfigSet] = useState<
    'all' | 'unattempted' | 'wrong' | 'important' | 'veryImportant' | 'dontUnderstand'
  >(
    initialMode === 'wrong'
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
      setAllSubjectsMap(new Map(subjs.map(s => [s.id, s])));
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
    setConfigGuides(prev =>
      prev.includes(guide) ? prev.filter(g => g !== guide) : [...prev, guide]
    );
  };

  // Start practice session
  const handleStartPractice = async () => {
    setSessionError(null);
    try {
      const qs = await getPracticeQuestions({
        subjectId: configSubjectId || undefined,
        chapterId: configChapterId || undefined,
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

  const startSessionWithQuestions = (
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
  };

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
        <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Practice Setup
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Filter questions by subject, board/school source, or guide, and customize your timer.
            </p>
          </div>

          {sessionError && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{sessionError}</span>
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-7 space-y-5 shadow-xs">
            {/* Subject & Chapter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                  Subject
                </label>
                <select
                  value={configSubjectId}
                  onChange={e => handleSubjectChange(e.target.value)}
                  className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                  Chapter
                </label>
                <select
                  value={configChapterId}
                  onChange={e => setConfigChapterId(e.target.value)}
                  disabled={!configSubjectId}
                  className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500 disabled:opacity-50"
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
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                  Source Type Filter (Choose Multiple)
                </label>
                {configSourceTypes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfigSourceTypes([])}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
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
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        isChecked
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {st} Questions
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Guides (Multi-select: Panjaree, Lecture, Royal, Chorcha, eProshnobank) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                  Guide Filter (Choose Multiple)
                </label>
                {configGuides.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfigGuides([])}
                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline"
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
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        isChecked
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Target Set */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-2">
                Question Target Set
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'All Questions', desc: 'Full pool' },
                  { id: 'unattempted', label: 'Unattempted', desc: 'New to you' },
                  { id: 'wrong', label: 'Previously Wrong', desc: 'Mistakes drill' },
                  { id: 'important', label: '⭐ Important', desc: 'Marked important' },
                  { id: 'veryImportant', label: '🔥 Very Important', desc: 'High priority' },
                  { id: 'dontUnderstand', label: "❓ Don't Understand", desc: 'Concept clarity' }
                ].map(opt => {
                  const isSelected = configSet === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setConfigSet(opt.id as any)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100'
                          : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Number of Questions */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-2">
                Number of Questions
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[10, 20, 30, 50, 100].map(count => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setConfigQuestionCount(count)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                      configQuestionCount === count
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Feedback Mode */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-2">
                Practice Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setConfigPracticeType('instant')}
                  className={`p-3 rounded-lg border text-left transition ${
                    configPracticeType === 'instant'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Instant Feedback
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    See correct answer and explanation right after answering each question.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setConfigPracticeType('exam')}
                  className={`p-3 rounded-lg border text-left transition ${
                    configPracticeType === 'exam'
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Exam Mode
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    Answers and explanations hidden until you complete and submit the whole test.
                  </div>
                </button>
              </div>
            </div>

            {/* Options: Shuffle & Timer */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={configShuffle}
                  onChange={e => setConfigShuffle(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Shuffle questions randomly</span>
              </label>

              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-zinc-500">Timer:</span>
                <select
                  value={configTimeLimitMinutes}
                  onChange={e => setConfigTimeLimitMinutes(Number(e.target.value))}
                  className="text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2 py-1"
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
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2"
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
          {/* Top Bar: Progress, Timer, Grid Trigger, Finish */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md text-zinc-800 dark:text-zinc-200">
                {currentIndex + 1} / {sessionQuestions.length}
              </span>

              <button
                type="button"
                onClick={() => setShowGridDrawer(!showGridDrawer)}
                className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 p-1 rounded"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Overview Grid</span>
              </button>
            </div>

            {/* Timer Display */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold ${
                  configTimeLimitMinutes > 0 && remainingSeconds < 120
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
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
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Finish Session
              </button>
            </div>
          </div>

          {/* Collapsible Overview Grid Drawer */}
          {showGridDrawer && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3 shadow-xs animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Jump directly to any question:</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Answered
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" /> Unanswered
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
                      className={`h-8 rounded text-xs font-bold font-mono transition-colors ${
                        isCurrent
                          ? 'ring-2 ring-indigo-600 bg-indigo-600 text-white'
                          : answered
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
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
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-8 space-y-6 shadow-xs">
            {/* Meta bar: Subject, chapter, sources, flags */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {allSubjectsMap.get(currentQ.subjectId)?.name || 'Subject'}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span className="text-xs text-zinc-500">
                  {allChaptersMap.get(currentQ.chapterId)?.name || 'Chapter'}
                </span>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {currentSources.map((s, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                    >
                      <span className="font-semibold">{s.type}:</span> {s.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Interactive Flag toggles right on screen */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleToggleCurrentFlag('important')}
                  className={`p-1.5 rounded-lg border text-xs transition-colors ${
                    currentQ.important
                      ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200'
                      : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'
                  }`}
                  title="Mark Important"
                >
                  <Bookmark className={`w-3.5 h-3.5 ${currentQ.important ? 'fill-amber-500 text-amber-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCurrentFlag('veryImportant')}
                  className={`p-1.5 rounded-lg border text-xs transition-colors ${
                    currentQ.veryImportant
                      ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200'
                      : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'
                  }`}
                  title="Mark Very Important"
                >
                  <Flame className={`w-3.5 h-3.5 ${currentQ.veryImportant ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleCurrentFlag('dontUnderstand')}
                  className={`p-1.5 rounded-lg border text-xs transition-colors ${
                    currentQ.dontUnderstand
                      ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200'
                      : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'
                  }`}
                  title="Mark Don't Understand"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Prompt */}
            <div className="text-base sm:text-lg font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
              {currentQ.question}
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {(['A', 'B', 'C', 'D'] as const).map(optKey => {
                const optText = currentQ.options[optKey];
                const isSelected = currentAnswer === optKey;

                let btnStyles =
                  'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100';

                if (configPracticeType === 'instant' && isAnswered) {
                  const isCorrectAnswer = optKey.toUpperCase() === currentQ.correctAnswer.toUpperCase();
                  if (isCorrectAnswer) {
                    btnStyles =
                      'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 font-semibold ring-1 ring-emerald-500';
                  } else if (isSelected && !isCorrectAnswer) {
                    btnStyles =
                      'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 font-semibold';
                  } else {
                    btnStyles = 'border-zinc-200 dark:border-zinc-800 opacity-60 text-zinc-500';
                  }
                } else if (isSelected) {
                  btnStyles =
                    'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-100 font-semibold ring-1 ring-indigo-600';
                }

                return (
                  <button
                    key={optKey}
                    type="button"
                    onClick={() => handleSelectOption(optKey)}
                    className={`w-full p-3.5 sm:p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${btnStyles}`}
                  >
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {optKey}
                    </span>
                    <span className="text-sm sm:text-base flex-1">{optText}</span>
                  </button>
                );
              })}
            </div>

            {/* Instant Mode Explanation Card */}
            {configPracticeType === 'instant' && isAnswered && (
              <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  {currentAnswer?.toUpperCase() === currentQ.correctAnswer.toUpperCase() ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" /> Correct Answer!
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                      <XCircle className="w-4 h-4" /> Incorrect. Correct Answer: {currentQ.correctAnswer}
                    </span>
                  )}
                </div>

                {currentQ.explanation ? (
                  <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed pt-1">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">Explanation: </span>
                    {currentQ.explanation}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-400 italic">No explanation provided for this question.</div>
                )}
              </div>
            )}

            {/* Bottom Actions: Prev / Next */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition"
              >
                ← Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition"
              >
                {currentIndex === sessionQuestions.length - 1 ? 'Finish' : 'Next Question →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SUMMARY VIEW */}
      {phase === 'summary' && summaryData && (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in">
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Practice Completed!
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500">
              Here is your performance breakdown for this session.
            </p>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-xs text-zinc-500">Score & Accuracy</div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {summaryData.accuracy}%
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {summaryData.correct} of {summaryData.attempted} correct
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-xs text-zinc-500">Correct</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {summaryData.correct}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Questions</div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-xs text-zinc-500">Wrong</div>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                {summaryData.wrong}
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {summaryData.skipped} skipped
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-xs text-zinc-500">Time Spent</div>
              <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mt-1">
                {formatTime(summaryData.totalTimeSpent)}
              </div>
            </div>
          </div>

          {/* Instant Action Bar: Practice Wrong Questions Again! */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {summaryData.wrongQuestions.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  startSessionWithQuestions(summaryData.wrongQuestions, 'instant', 0)
                }
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Practice {summaryData.wrongQuestions.length} Wrong Questions Again</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setPhase('config')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 transition-colors"
            >
              Configure New Practice
            </button>

            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Full Detailed Answer Review */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Detailed Question Review ({sessionQuestions.length})
            </h2>

            <div className="space-y-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              {sessionQuestions.map((q, idx) => {
                const userAns = userAnswers[q.id];
                const isCorrect = userAns && userAns.toUpperCase() === q.correctAnswer.toUpperCase();
                const isSkipped = !userAns;

                const qSources =
                  q.sources && q.sources.length > 0
                    ? q.sources
                    : [{ type: q.sourceType || 'Board', name: q.sourceName || '' }];

                return (
                  <div key={q.id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-xs text-zinc-400 mt-0.5">
                          #{idx + 1}
                        </span>
                        <div>
                          <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                            {q.question}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {qSources.map((s, sIdx) => (
                              <span
                                key={sIdx}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                              >
                                {s.type}: {s.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSkipped ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                            Skipped
                          </span>
                        ) : isCorrect ? (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                            Correct
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300">
                            Wrong (You: {userAns})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {Object.entries(q.options).map(([k, v]) => {
                        const optCorrect = k.toUpperCase() === q.correctAnswer.toUpperCase();
                        const optChosen = userAns && k.toUpperCase() === userAns.toUpperCase();

                        return (
                          <div
                            key={k}
                            className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                              optCorrect
                                ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold'
                                : optChosen
                                ? 'bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-700 text-rose-900 dark:text-rose-200'
                                : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            <span className="font-bold">{k}:</span>
                            <span>{v}</span>
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          Explanation:
                        </span>{' '}
                        {q.explanation}
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
