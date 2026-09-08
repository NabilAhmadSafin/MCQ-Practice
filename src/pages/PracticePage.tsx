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
  Flag, 
  Star, 
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
import { DifficultyBadge } from '../components/common/DifficultyBadge';
import { FlagIcons } from '../components/common/FlagIcons';
import type { 
  Question, 
  Subject, 
  Chapter, 
  Difficulty, 
  SourceType, 
  PracticeSession, 
  Attempt 
} from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface PracticePageProps {
  initialSubjectId?: string;
  initialChapterId?: string;
  initialQuestionId?: string;
  initialMode?: 'wrong' | 'important' | 'dontUnderstand';
  onNavigate: (section: NavSection, params?: any) => void;
}

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
  const [configSourceType, setConfigSourceType] = useState<SourceType | 'ALL'>('ALL');
  const [configDifficulty, setConfigDifficulty] = useState<Difficulty | 'ALL'>('ALL');
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
  const [configTimeLimitMinutes, setConfigTimeLimitMinutes] = useState<number>(0); // 0 = stopwatch, >0 = countdown

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

      // If single question practice requested directly
      if (initialQuestionId) {
        const q = await getQuestionById(initialQuestionId);
        if (q) {
          startSessionWithQuestions([q], 'instant', 0);
        }
      }
    };
    loadData();
  }, [initialSubjectId, initialChapterId, initialQuestionId]);

  const handleSubjectChange = async (subjId: string) => {
    setConfigSubjectId(subjId);
    setConfigChapterId('');
    const chaps = await getChaptersBySubject(subjId);
    setChapters(chaps);
  };

  // Start practice session
  const handleStartPractice = async () => {
    setSessionError(null);
    try {
      const qs = await getPracticeQuestions({
        subjectId: configSubjectId || undefined,
        chapterId: configChapterId || undefined,
        sourceType: configSourceType !== 'ALL' ? configSourceType : undefined,
        difficulty: configDifficulty !== 'ALL' ? configDifficulty : undefined,
        set: configSet,
        count: configQuestionCount,
        shuffle: configShuffle
      });

      if (qs.length === 0) {
        setSessionError('No questions match your practice criteria. Try changing the question set or chapter filter.');
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

  // Record time spent on current question when navigating
  const recordQuestionTime = () => {
    const now = Date.now();
    const spentOnCurrent = Math.max(1, Math.round((now - questionStartTimestamp) / 1000));
    const currentQ = sessionQuestions[currentIndex];
    if (currentQ) {
      setQuestionTimes(prev => ({
        ...prev,
        [currentQ.id]: (prev[currentQ.id] || 0) + spentOnCurrent
      }));
    }
    setQuestionStartTimestamp(now);
  };

  // Handle Option Select
  const handleSelectOption = (optionKey: 'A' | 'B' | 'C' | 'D') => {
    const currentQ = sessionQuestions[currentIndex];
    if (!currentQ) return;

    // If instant mode and already answered, don't change
    if (configPracticeType === 'instant' && userAnswers[currentQ.id]) {
      return;
    }

    setUserAnswers(prev => ({
      ...prev,
      [currentQ.id]: optionKey
    }));
  };

  // Navigation handlers
  const handleNext = () => {
    recordQuestionTime();
    if (currentIndex < sessionQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    recordQuestionTime();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleJumpTo = (idx: number) => {
    recordQuestionTime();
    setCurrentIndex(idx);
    setShowGridDrawer(false);
  };

  // Keyboard shortcut listener (Prompt 17 requirement: A, B, C, D, arrows, enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'active') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key)) {
        e.preventDefault();
        handleSelectOption(key as any);
      } else if (key === '1') handleSelectOption('A');
      else if (key === '2') handleSelectOption('B');
      else if (key === '3') handleSelectOption('C');
      else if (key === '4') handleSelectOption('D');
      else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentIndex < sessionQuestions.length - 1) {
          handleNext();
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          handlePrev();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, currentIndex, sessionQuestions, userAnswers, configPracticeType]);

  // Finish session
  const handleFinishSession = async () => {
    recordQuestionTime();
    if (timerRef.current) clearInterval(timerRef.current);

    const total = sessionQuestions.length;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    const wrongQs: Question[] = [];

    const attemptsToSave: any[] = [];

    for (const q of sessionQuestions) {
      const selected = userAnswers[q.id];
      const timeSpent = questionTimes[q.id] || 5;

      if (!selected) {
        skipped++;
      } else if (selected.toUpperCase() === q.correctAnswer.toUpperCase()) {
        correct++;
        attemptsToSave.push({
          questionId: q.id,
          selectedAnswer: selected,
          isCorrect: true,
          timeSpentSeconds: timeSpent
        });
      } else {
        wrong++;
        wrongQs.push(q);
        attemptsToSave.push({
          questionId: q.id,
          selectedAnswer: selected,
          isCorrect: false,
          timeSpentSeconds: timeSpent
        });
      }
    }

    const attempted = correct + wrong;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const totalTime = elapsedSeconds;

    // Persist attempts to IndexedDB
    for (const att of attemptsToSave) {
      await saveAttempt(att);
    }

    // Persist session to IndexedDB
    await savePracticeSession({
      subjectId: configSubjectId || 'mixed',
      chapterId: configChapterId || undefined,
      totalQuestions: total,
      correctCount: correct,
      wrongCount: wrong,
      skippedCount: skipped,
      accuracy,
      totalTimeSeconds: totalTime,
      mode: configPracticeType
    });

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

  // Toggle flag on current active question
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

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Current Question
  const currentQ = sessionQuestions[currentIndex];
  const currentAnswer = currentQ ? userAnswers[currentQ.id] : undefined;
  const isAnswered = Boolean(currentAnswer);

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
              Customize your practice scope, feedback type, and timer options.
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

            {/* Source & Difficulty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                  Question Source
                </label>
                <select
                  value={configSourceType}
                  onChange={e => setConfigSourceType(e.target.value as any)}
                  className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="ALL">All Sources</option>
                  <option value="Board">Board Questions</option>
                  <option value="School">Top Schools</option>
                  <option value="Guide">Guide Books</option>
                  <option value="Model Test">Model Tests</option>
                  <option value="Other">Other Sources</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                  Difficulty Level
                </label>
                <select
                  value={configDifficulty}
                  onChange={e => setConfigDifficulty(e.target.value as any)}
                  className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="ALL">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            {/* Question Set selection (Prompt 16 requirement) */}
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
                  { id: 'veryImportant', label: '🔥 Very Important', desc: 'Exam priority' },
                  { id: 'dontUnderstand', label: '❓ Don\'t Understand', desc: 'Concept clarity' }
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
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      configQuestionCount === count
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-transparent'
                        : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {count} Questions
                  </button>
                ))}
              </div>
            </div>

            {/* Practice Type (Instant Feedback vs Exam Mode) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={() => setConfigPracticeType('instant')}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  configPracticeType === 'instant'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100'
                    : 'border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Instant Feedback</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  See the correct answer & explanation immediately after choosing. Perfect for learning.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setConfigPracticeType('exam')}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  configPracticeType === 'exam'
                    ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-100'
                    : 'border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Exam Mode</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  No answer reveals during the exam. Submit at the end for your complete score and review.
                </p>
              </button>
            </div>

            {/* Time limit & shuffle options */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={configShuffle}
                  onChange={e => setConfigShuffle(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <Shuffle className="w-3.5 h-3.5 text-zinc-400" />
                <span>Shuffle Questions randomly</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Timer:</span>
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
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                    Answered
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700 inline-block"></span>
                    Unanswered
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 max-h-48 overflow-y-auto pr-1">
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
            {/* Meta bar: Subject, chapter, difficulty, source, flags */}
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
                <span className="text-xs text-zinc-500">
                  {currentQ.sourceName}
                </span>
                <DifficultyBadge difficulty={currentQ.difficulty} />
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
                  <Star className={`w-3.5 h-3.5 ${currentQ.important ? 'fill-amber-500 text-amber-500' : ''}`} />
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
                  title="Don't Understand"
                >
                  <HelpCircle className={`w-3.5 h-3.5 ${currentQ.dontUnderstand ? 'text-purple-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Question Text */}
            <div className="text-base sm:text-lg font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
              {currentQ.question}
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {(['A', 'B', 'C', 'D'] as const).map(optKey => {
                const optText = currentQ.options[optKey];
                const isSelected = currentAnswer === optKey;
                const isCorrect = optKey === currentQ.correctAnswer.toUpperCase();

                // Style based on mode:
                // Instant mode: reveals correct/wrong if answered
                // Exam mode: only highlights selected option
                let optionStyle = 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900';
                let indicatorStyle = 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300';

                if (configPracticeType === 'instant' && isAnswered) {
                  if (isCorrect) {
                    optionStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 font-medium';
                    indicatorStyle = 'bg-emerald-600 text-white';
                  } else if (isSelected && !isCorrect) {
                    optionStyle = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 font-medium';
                    indicatorStyle = 'bg-rose-600 text-white';
                  }
                } else if (isSelected) {
                  optionStyle = 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 font-medium ring-1 ring-indigo-600';
                  indicatorStyle = 'bg-indigo-600 text-white';
                }

                return (
                  <button
                    key={optKey}
                    type="button"
                    onClick={() => handleSelectOption(optKey)}
                    className={`w-full p-3.5 sm:p-4 rounded-xl border text-left flex items-center justify-between gap-3.5 transition-all text-sm ${optionStyle}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${indicatorStyle}`}
                      >
                        {optKey}
                      </span>
                      <span className="leading-snug pt-0.5">{optText}</span>
                    </div>

                    {/* Instant feedback icon indicators */}
                    {configPracticeType === 'instant' && isAnswered && (
                      <div className="shrink-0 pl-2">
                        {isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        )}
                        {isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instant Mode Explanation Drawer (shows after answering) */}
            {configPracticeType === 'instant' && isAnswered && currentQ.explanation && (
              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-1 animate-in fade-in">
                <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                  Explanation & Context:
                </div>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {currentQ.explanation}
                </p>
              </div>
            )}

            {/* Keyboard shortcut hint */}
            <div className="hidden sm:flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
              <span>Shortcuts: Press keys <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">A</kbd> <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">B</kbd> <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">C</kbd> <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">D</kbd></span>
              <span><kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">←</kbd> Previous • <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">→</kbd> Next</span>
            </div>
          </div>

          {/* Navigation Controls (Prev, Next, Skip) */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={handlePrev}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="flex items-center gap-2">
              {currentIndex < sessionQuestions.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <span>{isAnswered ? 'Next Question' : 'Skip & Next'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishSession}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit & Finish</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SESSION SUMMARY VIEW (Prompt 18, 19, 20 requirement) */}
      {phase === 'summary' && summaryData && (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Award className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Practice Complete!
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500">
              Here is your performance breakdown for this session.
            </p>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-xs text-zinc-500">Accuracy</div>
              <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {summaryData.accuracy}%
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-xs text-zinc-500">Correct</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {summaryData.correct} / {summaryData.total}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-xs text-zinc-500">Wrong</div>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                {summaryData.wrong}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
              <div className="text-xs text-zinc-500">Time Spent</div>
              <div className="text-2xl font-bold text-zinc-800 dark:text-zinc-200 mt-1">
                {formatTime(summaryData.totalTimeSpent)}
              </div>
            </div>
          </div>

          {/* Instant Action Bar: Practice Wrong Questions Again! (Prompt 18 requirement) */}
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

                return (
                  <div key={q.id} className="pt-4 first:pt-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-xs text-zinc-400 mt-0.5">
                          #{idx + 1}
                        </span>
                        <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                          {q.question}
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
                      <div className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-800/40 p-2.5 rounded-lg">
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">Solution: </span>
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
