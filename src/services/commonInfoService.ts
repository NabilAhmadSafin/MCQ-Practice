import { db } from '../db';
import type { CommonInformation, Question } from '../types';

export async function getCommonInfoById(id: string): Promise<CommonInformation | undefined> {
  return await db.commonInformation.get(id);
}

export async function getAllCommonInfo(): Promise<CommonInformation[]> {
  return await db.commonInformation.orderBy('createdAt').reverse().toArray();
}

export async function createCommonInfo(data: {
  title: string;
  content: string;
  subjectId: string;
  chapterId: string;
}): Promise<CommonInformation> {
  const newInfo: CommonInformation = {
    id: 'ci_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    title: data.title.trim() || 'অভিন্ন তথ্য',
    content: data.content.trim(),
    subjectId: data.subjectId,
    chapterId: data.chapterId,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await db.commonInformation.add(newInfo);
  return newInfo;
}

export async function updateCommonInfo(
  id: string,
  data: Partial<Omit<CommonInformation, 'id' | 'createdAt'>>
): Promise<void> {
  await db.commonInformation.update(id, {
    ...data,
    updatedAt: Date.now()
  });
}

export async function deleteCommonInfo(id: string, deleteLinkedQuestions: boolean = false): Promise<void> {
  await db.transaction('rw', [db.commonInformation, db.questions, db.attempts], async () => {
    if (deleteLinkedQuestions) {
      const linked = await db.questions.where('commonInfoId').equals(id).toArray();
      const ids = linked.map(q => q.id);
      if (ids.length > 0) {
        await db.attempts.where('questionId').anyOf(ids).delete();
        await db.questions.where('id').anyOf(ids).delete();
      }
    } else {
      // Unlink questions and convert to standard if passage deleted
      await db.questions.where('commonInfoId').equals(id).modify({
        commonInfoId: undefined,
        questionType: 'STANDARD',
        updatedAt: Date.now()
      });
    }
    await db.commonInformation.delete(id);
  });
}

export async function getQuestionsForCommonInfo(commonInfoId: string): Promise<Question[]> {
  return await db.questions.where('commonInfoId').equals(commonInfoId).sortBy('createdAt');
}

export async function getCommonInfoWithQuestions(id: string): Promise<{
  commonInfo: CommonInformation;
  questions: Question[];
} | null> {
  const info = await db.commonInformation.get(id);
  if (!info) return null;
  const questions = await getQuestionsForCommonInfo(id);
  return {
    commonInfo: info,
    questions
  };
}
