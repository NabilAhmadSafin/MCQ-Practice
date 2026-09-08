import Dexie, { type Table } from 'dexie';
import type { Subject, Chapter, Question, Attempt, PracticeSession, CommonInformation } from '../types';

export interface StoredMediaFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  data: Blob;
  createdAt: number;
}

export class MCQDatabase extends Dexie {
  subjects!: Table<Subject, string>;
  chapters!: Table<Chapter, string>;
  questions!: Table<Question, string>;
  commonInformation!: Table<CommonInformation, string>;
  mediaFiles!: Table<StoredMediaFile, string>;
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

    this.version(3).stores({
      subjects: 'id, name, order, createdAt',
      chapters: 'id, subjectId, name, order, [subjectId+order], createdAt',
      questions: 'id, subjectId, chapterId, [subjectId+chapterId], questionType, commonInfoId, important, veryImportant, dontUnderstand, *sourceTypes, *guides, createdAt, updatedAt',
      commonInformation: 'id, subjectId, chapterId, createdAt, updatedAt',
      attempts: 'id, questionId, sessionId, isCorrect, attemptedAt, [questionId+isCorrect]',
      sessions: 'id, startedAt, completedAt, mode, subjectId, chapterId'
    }).upgrade(tx => {
      return tx.table('questions').toCollection().modify((q: any) => {
        if (!q.questionType) {
          q.questionType = 'STANDARD';
        }
      });
    });

    this.version(4).stores({
      subjects: 'id, name, order, createdAt',
      chapters: 'id, subjectId, name, order, [subjectId+order], createdAt',
      questions: 'id, subjectId, chapterId, [subjectId+chapterId], questionType, commonInfoId, important, veryImportant, dontUnderstand, *sourceTypes, *guides, createdAt, updatedAt',
      commonInformation: 'id, subjectId, chapterId, createdAt, updatedAt',
      mediaFiles: 'id, name, mimeType, size, createdAt',
      attempts: 'id, questionId, sessionId, isCorrect, attemptedAt, [questionId+isCorrect]',
      sessions: 'id, startedAt, completedAt, mode, subjectId, chapterId'
    });
  }
}

export const db = new MCQDatabase();
