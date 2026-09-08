import { db } from '../db';
import type { Subject, Chapter } from '../types';

export async function getAllSubjects(): Promise<Subject[]> {
  return await db.subjects.orderBy('order').toArray();
}

export async function getSubjectById(id: string): Promise<Subject | undefined> {
  return await db.subjects.get(id);
}

export async function createSubject(name: string): Promise<Subject> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Subject name cannot be empty');
  
  const existing = await db.subjects.where('name').equalsIgnoreCase(trimmed).first();
  if (existing) throw new Error(`A subject named "${trimmed}" already exists`);

  const maxOrderSubject = await db.subjects.orderBy('order').last();
  const nextOrder = (maxOrderSubject?.order ?? 0) + 1;

  const subject: Subject = {
    id: 'subj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: trimmed,
    order: nextOrder,
    createdAt: Date.now()
  };

  await db.subjects.add(subject);
  return subject;
}

export async function updateSubject(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Subject name cannot be empty');
  await db.subjects.update(id, { name: trimmed });
}

export async function deleteSubject(id: string): Promise<{ deletedQuestions: number; deletedChapters: number }> {
  const chapters = await db.chapters.where('subjectId').equals(id).toArray();
  const chapterIds = chapters.map(c => c.id);
  
  let deletedQuestions = 0;
  await db.transaction('rw', [db.subjects, db.chapters, db.questions, db.attempts], async () => {
    // find questions
    const questions = await db.questions.where('subjectId').equals(id).toArray();
    deletedQuestions = questions.length;
    const questionIds = questions.map(q => q.id);

    // delete attempts for these questions
    if (questionIds.length > 0) {
      await db.attempts.where('questionId').anyOf(questionIds).delete();
      await db.questions.where('subjectId').equals(id).delete();
    }

    if (chapterIds.length > 0) {
      await db.chapters.where('subjectId').equals(id).delete();
    }

    await db.subjects.delete(id);
  });

  return { deletedQuestions, deletedChapters: chapterIds.length };
}

export async function getChaptersBySubject(subjectId: string): Promise<Chapter[]> {
  return await db.chapters.where('subjectId').equals(subjectId).sortBy('order');
}

export async function getAllChapters(): Promise<Chapter[]> {
  return await db.chapters.orderBy('order').toArray();
}

export async function getChapterById(id: string): Promise<Chapter | undefined> {
  return await db.chapters.get(id);
}

export async function createChapter(subjectId: string, name: string): Promise<Chapter> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Chapter name cannot be empty');

  const subject = await db.subjects.get(subjectId);
  if (!subject) throw new Error('Subject not found');

  const existing = await db.chapters
    .where('subjectId').equals(subjectId)
    .and(c => c.name.toLowerCase() === trimmed.toLowerCase())
    .first();
  if (existing) throw new Error(`A chapter named "${trimmed}" already exists in ${subject.name}`);

  const chaptersInSubj = await db.chapters.where('subjectId').equals(subjectId).sortBy('order');
  const maxOrder = chaptersInSubj.length > 0 ? chaptersInSubj[chaptersInSubj.length - 1].order : 0;

  const chapter: Chapter = {
    id: 'chap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    subjectId,
    name: trimmed,
    order: maxOrder + 1,
    createdAt: Date.now()
  };

  await db.chapters.add(chapter);
  return chapter;
}

export async function updateChapter(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Chapter name cannot be empty');
  await db.chapters.update(id, { name: trimmed });
}

export async function reorderChapters(subjectId: string, chapterIdsInOrder: string[]): Promise<void> {
  await db.transaction('rw', db.chapters, async () => {
    for (let i = 0; i < chapterIdsInOrder.length; i++) {
      await db.chapters.update(chapterIdsInOrder[i], { order: i + 1 });
    }
  });
}

export async function deleteChapter(id: string): Promise<{ deletedQuestions: number }> {
  let deletedQuestions = 0;
  await db.transaction('rw', [db.chapters, db.questions, db.attempts], async () => {
    const questions = await db.questions.where('chapterId').equals(id).toArray();
    deletedQuestions = questions.length;
    const questionIds = questions.map(q => q.id);

    if (questionIds.length > 0) {
      await db.attempts.where('questionId').anyOf(questionIds).delete();
      await db.questions.where('chapterId').equals(id).delete();
    }
    await db.chapters.delete(id);
  });
  return { deletedQuestions };
}

export async function getQuestionCountsBySubject(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  await db.questions.each(q => {
    counts[q.subjectId] = (counts[q.subjectId] || 0) + 1;
  });
  return counts;
}

export async function getQuestionCountsByChapter(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  await db.questions.each(q => {
    counts[q.chapterId] = (counts[q.chapterId] || 0) + 1;
  });
  return counts;
}
