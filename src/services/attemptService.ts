import { db } from '../db';
import type { Attempt, PracticeSession, Question, QuestionStats, SubjectStatistics, ChapterStatistics } from '../types';

export interface SystemStats {
  totalQuestions: number;
  attemptedQuestions: number;
  totalAttempts: number;
  overallAccuracy: number;
  wrongQuestionsCount: number;
  weakQuestionsCount: number;
  subjectStats: SubjectStatistics[];
  chapterStats: ChapterStatistics[];
  mostMissedQuestions: {
    question: Question;
    wrongCount: number;
    accuracy: number;
  }[];
}

export async function saveAttempt(data: {
  questionId: string;
  sessionId?: string;
  selectedAnswer: string;
  correctAnswer?: string;
  isCorrect: boolean;
  timeSpentSeconds?: number;
}): Promise<Attempt> {
  const attempt: Attempt = {
    id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    questionId: data.questionId,
    sessionId: data.sessionId || 'session_' + Date.now(),
    selectedAnswer: data.selectedAnswer,
    correctAnswer: data.correctAnswer || '',
    isCorrect: data.isCorrect,
    timeSpentSeconds: data.timeSpentSeconds || 0,
    attemptedAt: Date.now()
  };

  await db.attempts.add(attempt);
  return attempt;
}

export async function recordAttempt(data: {
  questionId: string;
  sessionId: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}): Promise<Attempt> {
  return saveAttempt(data);
}

export async function savePracticeSession(data: {
  subjectId?: string;
  chapterId?: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount?: number;
  accuracy: number;
  totalTimeSeconds: number;
  mode: string;
  title?: string;
  questionIds?: string[];
}): Promise<PracticeSession> {
  const session: PracticeSession = {
    id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    mode: data.mode,
    title: data.title || `${data.mode.toUpperCase()} Session`,
    subjectId: data.subjectId,
    chapterId: data.chapterId,
    totalQuestions: data.totalQuestions,
    correctCount: data.correctCount,
    wrongCount: data.wrongCount,
    skippedCount: data.skippedCount || 0,
    accuracy: data.accuracy,
    totalTimeSeconds: data.totalTimeSeconds,
    durationSeconds: data.totalTimeSeconds,
    startedAt: Date.now() - (data.totalTimeSeconds * 1000),
    completedAt: Date.now(),
    createdAt: Date.now(),
    questionIds: data.questionIds || []
  };

  await db.sessions.add(session);
  return session;
}

export async function createPracticeSession(data: {
  mode: PracticeSession['mode'];
  title: string;
  subjectId?: string;
  chapterId?: string;
  questionIds: string[];
}): Promise<PracticeSession> {
  const session: PracticeSession = {
    id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    mode: data.mode,
    title: data.title,
    subjectId: data.subjectId,
    chapterId: data.chapterId,
    totalQuestions: data.questionIds.length,
    correctCount: 0,
    wrongCount: 0,
    accuracy: 0,
    startedAt: Date.now(),
    completedAt: 0,
    durationSeconds: 0,
    questionIds: data.questionIds,
    createdAt: Date.now()
  };

  await db.sessions.add(session);
  return session;
}

export async function finishPracticeSession(
  sessionId: string,
  correctCount: number,
  wrongCount: number,
  durationSeconds: number
): Promise<void> {
  const total = correctCount + wrongCount;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  await db.sessions.update(sessionId, {
    correctCount,
    wrongCount,
    accuracy,
    completedAt: Date.now(),
    durationSeconds,
    totalTimeSeconds: durationSeconds
  });
}

export async function getRecentSessions(limit: number = 20): Promise<PracticeSession[]> {
  const all = await db.sessions.toArray();
  return all
    .sort((a, b) => (b.completedAt || b.createdAt || 0) - (a.completedAt || a.createdAt || 0))
    .slice(0, limit);
}

export async function getRecentPracticeSessions(limit: number = 20): Promise<PracticeSession[]> {
  return getRecentSessions(limit);
}

export async function getAttemptsForSession(sessionId: string): Promise<Attempt[]> {
  return await db.attempts.where('sessionId').equals(sessionId).sortBy('attemptedAt');
}

export async function getQuestionStatsMap(): Promise<Map<string, QuestionStats>> {
  const allAttempts = await db.attempts.orderBy('attemptedAt').toArray();
  const map = new Map<string, QuestionStats>();

  for (const att of allAttempts) {
    let stat = map.get(att.questionId);
    if (!stat) {
      stat = {
        totalAttempts: 0,
        correctAttempts: 0,
        wrongAttempts: 0,
        accuracy: 0,
        lastAttemptedAt: att.attemptedAt,
        lastIsCorrect: att.isCorrect
      };
      map.set(att.questionId, stat);
    }

    stat.totalAttempts += 1;
    if (att.isCorrect) {
      stat.correctAttempts += 1;
    } else {
      stat.wrongAttempts += 1;
    }
    stat.accuracy = Math.round((stat.correctAttempts / stat.totalAttempts) * 100);
    stat.lastAttemptedAt = att.attemptedAt;
    stat.lastIsCorrect = att.isCorrect;
  }

  return map;
}

export async function getWeakQuestions(): Promise<{
  question: Question;
  wrongCount: number;
  totalAttempts: number;
  dontUnderstand: boolean;
}[]> {
  const statsMap = await getQuestionStatsMap();
  const allQuestions = await db.questions.toArray();

  const weakList: {
    question: Question;
    wrongCount: number;
    totalAttempts: number;
    dontUnderstand: boolean;
  }[] = [];

  for (const q of allQuestions) {
    const stat = statsMap.get(q.id);
    const wrongCount = stat ? stat.wrongAttempts : 0;
    const totalAttempts = stat ? stat.totalAttempts : 0;
    const isLowAccuracy = totalAttempts >= 2 && (stat?.accuracy || 0) < 60;
    const hasMultipleWrongs = wrongCount >= 2;
    const isMarkedDontUnderstand = Boolean(q.dontUnderstand);

    if (hasMultipleWrongs || isLowAccuracy || isMarkedDontUnderstand) {
      weakList.push({
        question: q,
        wrongCount,
        totalAttempts,
        dontUnderstand: isMarkedDontUnderstand
      });
    }
  }

  // Sort by highest wrong count first, then marked dontUnderstand
  weakList.sort((a, b) => {
    if (b.wrongCount !== a.wrongCount) return b.wrongCount - a.wrongCount;
    return (b.dontUnderstand ? 1 : 0) - (a.dontUnderstand ? 1 : 0);
  });

  return weakList;
}

export async function markQuestionMastered(questionId: string): Promise<void> {
  await db.questions.update(questionId, { dontUnderstand: false, updatedAt: Date.now() });
}

export async function getSystemStatistics(): Promise<SystemStats> {
  const totalQuestions = await db.questions.count();
  const allQuestions = await db.questions.toArray();
  const allSubjects = await db.subjects.toArray();
  const allChapters = await db.chapters.toArray();
  const allAttempts = await db.attempts.toArray();

  const subjMap = new Map(allSubjects.map(s => [s.id, s.name]));

  // Question stats map
  const questionStatsMap = new Map<string, { total: number; correct: number; wrong: number }>();
  for (const att of allAttempts) {
    const s = questionStatsMap.get(att.questionId) || { total: 0, correct: 0, wrong: 0 };
    s.total += 1;
    if (att.isCorrect) s.correct += 1;
    else s.wrong += 1;
    questionStatsMap.set(att.questionId, s);
  }

  const attemptedQuestions = questionStatsMap.size;
  const totalAttempts = allAttempts.length;
  const totalCorrect = allAttempts.filter(a => a.isCorrect).length;
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  let wrongCount = 0;
  let weakCount = 0;

  for (const [_, s] of questionStatsMap.entries()) {
    if (s.wrong > 0) wrongCount++;
    const acc = Math.round((s.correct / s.total) * 100);
    if (acc < 60) weakCount++;
  }

  // Subject stats
  const subjectAgg = new Map<string, { total: number; attempted: Set<string>; correct: number; totalAtt: number }>();
  for (const s of allSubjects) {
    subjectAgg.set(s.id, { total: 0, attempted: new Set(), correct: 0, totalAtt: 0 });
  }

  for (const q of allQuestions) {
    const agg = subjectAgg.get(q.subjectId);
    if (agg) {
      agg.total += 1;
      const qStat = questionStatsMap.get(q.id);
      if (qStat) {
        agg.attempted.add(q.id);
        agg.correct += qStat.correct;
        agg.totalAtt += qStat.total;
      }
    }
  }

  const subjectStats: SubjectStatistics[] = allSubjects.map(s => {
    const agg = subjectAgg.get(s.id) || { total: 0, attempted: new Set(), correct: 0, totalAtt: 0 };
    const acc = agg.totalAtt > 0 ? Math.round((agg.correct / agg.totalAtt) * 100) : 0;
    return {
      subjectId: s.id,
      subjectName: s.name,
      totalQuestions: agg.total,
      attemptedQuestions: agg.attempted.size,
      accuracy: acc
    };
  });

  // Chapter stats
  const chapterAgg = new Map<string, { total: number; attempted: Set<string>; correct: number; totalAtt: number }>();
  for (const c of allChapters) {
    chapterAgg.set(c.id, { total: 0, attempted: new Set(), correct: 0, totalAtt: 0 });
  }

  for (const q of allQuestions) {
    const agg = chapterAgg.get(q.chapterId);
    if (agg) {
      agg.total += 1;
      const qStat = questionStatsMap.get(q.id);
      if (qStat) {
        agg.attempted.add(q.id);
        agg.correct += qStat.correct;
        agg.totalAtt += qStat.total;
      }
    }
  }

  const chapterStats: ChapterStatistics[] = allChapters.map(c => {
    const agg = chapterAgg.get(c.id) || { total: 0, attempted: new Set(), correct: 0, totalAtt: 0 };
    const acc = agg.totalAtt > 0 ? Math.round((agg.correct / agg.totalAtt) * 100) : 0;
    return {
      chapterId: c.id,
      chapterName: c.name,
      subjectName: subjMap.get(c.subjectId) || 'Unknown',
      totalQuestions: agg.total,
      attemptedQuestions: agg.attempted.size,
      accuracy: acc
    };
  });

  // Most missed questions
  const qMap = new Map(allQuestions.map(q => [q.id, q]));
  const mostMissedQuestions = Array.from(questionStatsMap.entries())
    .filter(([_, s]) => s.wrong > 0 && qMap.has(_))
    .map(([qId, s]) => ({
      question: qMap.get(qId)!,
      wrongCount: s.wrong,
      accuracy: Math.round((s.correct / s.total) * 100)
    }))
    .sort((a, b) => b.wrongCount - a.wrongCount)
    .slice(0, 10);

  return {
    totalQuestions,
    attemptedQuestions,
    totalAttempts,
    overallAccuracy,
    wrongQuestionsCount: wrongCount,
    weakQuestionsCount: weakCount,
    subjectStats,
    chapterStats,
    mostMissedQuestions
  };
}

export async function getOverallStatistics(): Promise<{
  totalQuestions: number;
  totalAttempts: number;
  overallAccuracy: number;
  subjectStats: SubjectStatistics[];
  recentSessions: PracticeSession[];
}> {
  const sys = await getSystemStatistics();
  const recent = await getRecentSessions(10);
  return {
    totalQuestions: sys.totalQuestions,
    totalAttempts: sys.totalAttempts,
    overallAccuracy: sys.overallAccuracy,
    subjectStats: sys.subjectStats,
    recentSessions: recent
  };
}
