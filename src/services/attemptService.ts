import { apiFetch } from './apiClient';
import type {
  Attempt,
  PracticeSession,
  Question,
  QuestionStats,
  SubjectStatistics,
  ChapterStatistics,
  QuestionTypeStatistics
} from '../types';

export interface SystemStats {
  totalQuestions: number;
  attemptedQuestions: number;
  totalAttempts: number;
  overallAccuracy: number;
  wrongQuestionsCount: number;
  weakQuestionsCount: number;
  subjectStats: SubjectStatistics[];
  chapterStats: ChapterStatistics[];
  typeStats: QuestionTypeStatistics[];
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
  return apiFetch<Attempt>('/api/attempts', {
    method: 'POST',
    body: JSON.stringify(data)
  });
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
  return apiFetch<PracticeSession>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      completedAt: Date.now()
    })
  });
}

export async function createPracticeSession(data: {
  mode: PracticeSession['mode'];
  title: string;
  subjectId?: string;
  chapterId?: string;
  questionIds: string[];
}): Promise<PracticeSession> {
  return apiFetch<PracticeSession>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      totalQuestions: data.questionIds.length,
      correctCount: 0,
      wrongCount: 0,
      accuracy: 0,
      completedAt: 0
    })
  });
}

export async function finishPracticeSession(
  sessionId: string,
  correctCount: number,
  wrongCount: number,
  durationSeconds: number
): Promise<void> {
  await apiFetch(`/api/sessions/${encodeURIComponent(sessionId)}/finish`, {
    method: 'PATCH',
    body: JSON.stringify({ correctCount, wrongCount, durationSeconds })
  });
}

export async function getRecentSessions(limit: number = 20): Promise<PracticeSession[]> {
  return apiFetch<PracticeSession[]>(`/api/sessions/recent?limit=${encodeURIComponent(String(limit))}`);
}

export async function getRecentPracticeSessions(limit: number = 20): Promise<PracticeSession[]> {
  return getRecentSessions(limit);
}

export async function clearPracticeSessions(): Promise<void> {
  await apiFetch('/api/sessions', { method: 'DELETE' });
}

export async function getAttemptsForSession(sessionId: string): Promise<Attempt[]> {
  return apiFetch<Attempt[]>(`/api/attempts/session/${encodeURIComponent(sessionId)}`);
}

export async function getQuestionStatsMap(): Promise<Map<string, QuestionStats>> {
  const obj = await apiFetch<Record<string, QuestionStats>>('/api/attempts/question-stats');
  return new Map(Object.entries(obj));
}

export async function getWeakQuestions(): Promise<{
  question: Question;
  wrongCount: number;
  totalAttempts: number;
  dontUnderstand: boolean;
}[]> {
  return apiFetch('/api/stats/weak');
}

export async function markQuestionMastered(questionId: string): Promise<void> {
  await apiFetch(`/api/questions/${encodeURIComponent(questionId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ dontUnderstand: false })
  });
}

export async function getSystemStatistics(): Promise<SystemStats> {
  return apiFetch<SystemStats>('/api/stats/system');
}

export async function getOverallStatistics(): Promise<{
  totalQuestions: number;
  totalAttempts: number;
  overallAccuracy: number;
  subjectStats: SubjectStatistics[];
  typeStats: QuestionTypeStatistics[];
  recentSessions: PracticeSession[];
}> {
  const [sys, recent] = await Promise.all([
    getSystemStatistics(),
    getRecentSessions(10)
  ]);
  return {
    totalQuestions: sys.totalQuestions,
    totalAttempts: sys.totalAttempts,
    overallAccuracy: sys.overallAccuracy,
    subjectStats: sys.subjectStats,
    typeStats: sys.typeStats,
    recentSessions: recent
  };
}
