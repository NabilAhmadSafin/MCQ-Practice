import Dexie, { type Table } from 'dexie';
import type { Subject, Chapter, Question, Attempt, PracticeSession } from '../types';

export class MCQDatabase extends Dexie {
  subjects!: Table<Subject, string>;
  chapters!: Table<Chapter, string>;
  questions!: Table<Question, string>;
  attempts!: Table<Attempt, string>;
  sessions!: Table<PracticeSession, string>;

  constructor() {
    super('MCQPracticeDB');
    this.version(1).stores({
      subjects: 'id, name, order, createdAt',
      chapters: 'id, subjectId, name, order, [subjectId+order], createdAt',
      questions: 'id, subjectId, chapterId, [subjectId+chapterId], sourceType, sourceName, difficulty, important, veryImportant, dontUnderstand, *tags, createdAt, updatedAt',
      attempts: 'id, questionId, sessionId, isCorrect, attemptedAt, [questionId+isCorrect]',
      sessions: 'id, startedAt, completedAt, mode, subjectId, chapterId'
    });
  }
}

export const db = new MCQDatabase();
