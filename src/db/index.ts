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

    this.version(2).stores({
      subjects: 'id, name, order, createdAt',
      chapters: 'id, subjectId, name, order, [subjectId+order], createdAt',
      questions: 'id, subjectId, chapterId, [subjectId+chapterId], important, veryImportant, dontUnderstand, *sourceTypes, *guides, createdAt, updatedAt',
      attempts: 'id, questionId, sessionId, isCorrect, attemptedAt, [questionId+isCorrect]',
      sessions: 'id, startedAt, completedAt, mode, subjectId, chapterId'
    }).upgrade(tx => {
      return tx.table('questions').toCollection().modify((q: any) => {
        if (!q.sources || !Array.isArray(q.sources)) {
          q.sources = [];
          if (q.sourceType || q.sourceName) {
            q.sources.push({ type: q.sourceType || 'Board', name: q.sourceName || '' });
          }
        }
        q.sourceTypes = q.sources.map((s: any) => s.type);
        q.guides = q.sources
          .filter((s: any) => s.type?.toLowerCase() === 'guide')
          .map((s: any) => s.name);
        delete q.difficulty;
        delete q.tags;
      });
    });
  }
}

export const db = new MCQDatabase();
