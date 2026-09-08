export type SourceCategory = 'Board' | 'School' | 'Guide';

export interface QuestionSource {
  type: SourceCategory | string;
  name: string;
  entryNo?: string;
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

export type QuestionType = 'STANDARD' | 'MULTIPLE_STATEMENT' | 'COMMON_STEM';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  STANDARD: 'Standard MCQ',
  MULTIPLE_STATEMENT: 'বহুপদী সমাপ্তিসূচক',
  COMMON_STEM: 'অভিন্ন তথ্যভিত্তিক'
};

export interface CommonInformation {
  id: string;
  title: string;
  content: string;
  subjectId: string;
  chapterId: string;
  createdAt: number;
  updatedAt: number;
}

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
  questionType?: QuestionType;
  question: string;
  statements?: string[]; // For MULTIPLE_STATEMENT: [ "statement 1", "statement 2", ... ]
  commonInfoId?: string; // For COMMON_STEM: references CommonInformation.id
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
  questionType?: QuestionType | 'ALL';
  questionTypes?: QuestionType[];
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
  sortBy?: 'createdAtDesc' | 'createdAtAsc' | 'question' | 'entryNoAsc' | 'entryNoDesc';
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
    commonInfoTitle?: string;
    commonInfoContent?: string;
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

export interface QuestionTypeStatistics {
  type: QuestionType;
  label: string;
  totalQuestions: number;
  attemptedQuestions: number;
  accuracy: number;
}
