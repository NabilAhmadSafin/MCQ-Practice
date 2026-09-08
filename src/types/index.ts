export type SourceType = 'Board' | 'School' | 'Guide' | 'Model Test' | 'Other';
export type Difficulty = 'Easy' | 'Medium' | 'Hard';
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
  sourceType: SourceType;
  sourceName: string;
  important: boolean;
  veryImportant: boolean;
  dontUnderstand: boolean;
  difficulty: Difficulty;
  tags: string[];
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
  sourceType?: SourceType | 'ALL';
  sourceName?: string;
  difficulty?: Difficulty | 'ALL';
  important?: boolean;
  veryImportant?: boolean;
  dontUnderstand?: boolean;
  tag?: string;
  searchQuery?: string;
  attemptStatus?: 'all' | 'attempted' | 'unattempted' | 'wrong';
  sortBy?: 'createdAtDesc' | 'createdAtAsc' | 'difficulty' | 'question';
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
