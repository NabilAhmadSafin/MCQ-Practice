export type SourceCategory = 'Board' | 'School' | 'Guide';

export interface QuestionSource {
  type: SourceCategory | string;
  name: string;
}

export const GUIDE_OPTIONS = [
  'Panjaree',
  'Lecture',
  'Royal',
  'Chorcha',
  'eProshnobank'
] as const;

export type GuideOption = typeof GUIDE_OPTIONS[number];

export type CorrectAnswer = 'A' | 'B' | 'C' | 'D' | string;

export interface Subject {
  id: string;
  name: string;
  order: number;
  createdAt: number;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  order: number;
  createdAt: number;
}

export interface Question {
  id: string;
  subjectId: string;
  chapterId: string;
  question: string;
  options: Record<string, string>; // e.g. { A: "...", B: "...", C: "...", D: "..." }
  correctAnswer: CorrectAnswer;
  explanation?: string;
  sources: QuestionSource[];
  sourceTypes?: string[];
  guides?: string[];
  sourceType?: string; // legacy support if present
  sourceName?: string; // legacy support if present
  important: boolean;
  veryImportant: boolean;
  dontUnderstand: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Attempt {
  id: string;
  questionId: string;
  sessionId?: string;
  selectedAnswer: string;
  correctAnswer?: string;
  isCorrect: boolean;
  attemptedAt: number;
  timeSpentSeconds?: number;
}

export interface PracticeSession {
  id: string;
  mode: 'instant' | 'exam' | 'chapter' | 'subject' | 'wrong' | 'weak' | 'important' | 'custom' | string;
  title?: string;
  subjectId?: string;
  chapterId?: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount?: number;
  accuracy: number;
  startedAt?: number;
  completedAt?: number;
  durationSeconds?: number;
  totalTimeSeconds?: number;
  questionIds?: string[];
  createdAt?: number;
}

export interface QuestionFilter {
  subjectId?: string;
  chapterId?: string;
  sourceTypes?: string[]; // multiple selection: ['Board', 'School']
  sourceType?: string;
  guides?: string[]; // multiple selection: ['Panjaree', 'Lecture', 'Royal', 'Chorcha', 'eProshnobank']
  sourceName?: string;
  important?: boolean;
  veryImportant?: boolean;
  dontUnderstand?: boolean;
  flags?: ('important' | 'veryImportant' | 'dontUnderstand')[];
  searchQuery?: string;
  attemptStatus?: 'all' | 'attempted' | 'unattempted' | 'wrong';
  attemptStatuses?: ('attempted' | 'unattempted' | 'wrong')[];
  sortBy?: 'createdAtDesc' | 'createdAtAsc' | 'question';
}

export interface ValidationItem {
  index: number;
  questionText: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  parsedQuestion?: Partial<Question> & {
    subjectName?: string;
    chapterName?: string;
  };
}

export interface QuestionStats {
  totalAttempts: number;
  correctAttempts: number;
  wrongAttempts: number;
  accuracy: number;
  lastAttemptedAt?: number;
  lastIsCorrect?: boolean;
}

export interface SubjectStatistics {
  subjectId: string;
  subjectName: string;
  totalQuestions: number;
  attemptedQuestions: number;
  accuracy: number;
}

export interface ChapterStatistics {
  chapterId: string;
  chapterName: string;
  subjectName: string;
  totalQuestions: number;
  attemptedQuestions: number;
  accuracy: number;
}
