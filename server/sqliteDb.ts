import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import type {
  Subject,
  Chapter,
  CommonInformation,
  Question,
  QuestionFilter,
  QuestionSource,
  QuestionType,
  Attempt,
  PracticeSession,
  QuestionStats,
  SubjectStatistics,
  ChapterStatistics,
  QuestionTypeStatistics
} from '../src/types/index.ts';

export interface MediaRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  ext: string;
  createdAt: number;
}

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), 'data'));
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const DB_PATH = path.join(DATA_DIR, 'mcq-database.sqlite');

fs.mkdirSync(MEDIA_DIR, { recursive: true });

export const sqlite = new DatabaseSync(DB_PATH);

sqlite.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA synchronous = NORMAL;
  PRAGMA foreign_keys = ON;
  PRAGMA temp_store = MEMORY;
  PRAGMA cache_size = -64000;

  CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_subjects_order ON subjects(sort_order);

  CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_chapters_subject ON chapters(subject_id, sort_order);

  CREATE TABLE IF NOT EXISTS common_information (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    images_json TEXT,
    content_blocks_json TEXT,
    subject_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_common_info_subj_chap ON common_information(subject_id, chapter_id);

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'STANDARD',
    question TEXT NOT NULL,
    common_info_id TEXT,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    important INTEGER NOT NULL DEFAULT 0,
    very_important INTEGER NOT NULL DEFAULT 0,
    dont_understand INTEGER NOT NULL DEFAULT 0,
    wrong_mastered_at INTEGER NOT NULL DEFAULT 0,
    sources_json TEXT NOT NULL DEFAULT '[]',
    source_types_json TEXT NOT NULL DEFAULT '[]',
    guides_json TEXT NOT NULL DEFAULT '[]',
    options_json TEXT NOT NULL DEFAULT '{}',
    images_json TEXT,
    content_blocks_json TEXT,
    statements_json TEXT,
    statement_images_json TEXT,
    option_images_json TEXT,
    explanation_images_json TEXT,
    explanation_blocks_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_questions_subj_chap ON questions(subject_id, chapter_id);
  CREATE INDEX IF NOT EXISTS idx_questions_chap ON questions(chapter_id);
  CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
  CREATE INDEX IF NOT EXISTS idx_questions_common_info ON questions(common_info_id);
  CREATE INDEX IF NOT EXISTS idx_questions_flags ON questions(important, very_important, dont_understand);
  CREATE INDEX IF NOT EXISTS idx_questions_created ON questions(created_at DESC);

  CREATE TABLE IF NOT EXISTS media_files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    ext TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_media_name ON media_files(LOWER(name));

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    mode TEXT NOT NULL,
    title TEXT,
    subject_id TEXT,
    chapter_id TEXT,
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    wrong_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    accuracy REAL NOT NULL DEFAULT 0,
    total_time_seconds INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    started_at INTEGER,
    completed_at INTEGER,
    created_at INTEGER NOT NULL,
    question_ids_json TEXT NOT NULL DEFAULT '[]'
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_completed ON sessions(completed_at DESC, created_at DESC);

  CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    question_id TEXT NOT NULL,
    session_id TEXT,
    selected_answer TEXT NOT NULL,
    correct_answer TEXT,
    is_correct INTEGER NOT NULL DEFAULT 0,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    attempted_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id, is_correct);
  CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id, attempted_at);
  CREATE INDEX IF NOT EXISTS idx_attempts_time ON attempts(attempted_at);
`);

const questionCols = sqlite.prepare(`PRAGMA table_info(questions)`).all() as { name: string }[];
if (!questionCols.some(c => c.name === 'wrong_mastered_at')) {
  sqlite.exec(`ALTER TABLE questions ADD COLUMN wrong_mastered_at INTEGER NOT NULL DEFAULT 0`);
}

sqlite.exec(`
  DROP TABLE IF EXISTS english_practice_sessions;
  DROP TABLE IF EXISTS english_part_labels;
  DROP TABLE IF EXISTS english_q1_mcqs;
  DROP TABLE IF EXISTS english_q2_short_questions;
  DROP TABLE IF EXISTS english_q3_gaps;
  DROP TABLE IF EXISTS english_info_cells;
  DROP TABLE IF EXISTS english_info_tables;
  DROP TABLE IF EXISTS english_q5_summaries;
  DROP TABLE IF EXISTS english_matching_mappings;
  DROP TABLE IF EXISTS english_matching_items;
  DROP TABLE IF EXISTS english_rearrangement_answers;
  DROP TABLE IF EXISTS english_rearrangement_sentences;
  DROP TABLE IF EXISTS english_q8_poem_questions;
  DROP TABLE IF EXISTS english_q9_story_questions;
  DROP TABLE IF EXISTS english_questions;
  DROP TABLE IF EXISTS english_models;
  DROP TABLE IF EXISTS english_passages;
  DROP TABLE IF EXISTS english_poems;
  DROP TABLE IF EXISTS english_stories;
  DROP TABLE IF EXISTS english_labels;
  DELETE FROM subjects WHERE id = 'subj-eng-1st' AND NOT EXISTS (SELECT 1 FROM questions WHERE subject_id = 'subj-eng-1st');
`);

export function getStoragePaths() {
  return {
    dataDir: DATA_DIR,
    mediaDir: MEDIA_DIR,
    dbPath: DB_PATH
  };
}

export function withTransaction<T>(fn: () => T): T {
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    sqlite.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      sqlite.exec('ROLLBACK');
    } catch {
      // ignore rollback errors
    }
    throw err;
  }
}

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function mapRowToSubject(row: Record<string, any>): Subject {
  return {
    id: row.id,
    name: row.name,
    order: Number(row.sort_order ?? 0),
    createdAt: Number(row.created_at ?? 0)
  };
}

export function mapRowToChapter(row: Record<string, any>): Chapter {
  return {
    id: row.id,
    subjectId: row.subject_id,
    name: row.name,
    order: Number(row.sort_order ?? 0),
    createdAt: Number(row.created_at ?? 0)
  };
}

export function mapRowToCommonInfo(row: Record<string, any>): CommonInformation {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    images: safeJsonParse(row.images_json, undefined),
    contentBlocks: safeJsonParse(row.content_blocks_json, undefined),
    subjectId: row.subject_id,
    chapterId: row.chapter_id,
    createdAt: Number(row.created_at ?? 0),
    updatedAt: Number(row.updated_at ?? 0)
  };
}

export function mapRowToQuestion(row: Record<string, any>): Question {
  return {
    id: row.id,
    subjectId: row.subject_id,
    chapterId: row.chapter_id,
    questionType: (row.question_type || 'STANDARD') as QuestionType,
    question: row.question,
    images: safeJsonParse(row.images_json, undefined),
    contentBlocks: safeJsonParse(row.content_blocks_json, undefined),
    statements: safeJsonParse(row.statements_json, undefined),
    statementImages: safeJsonParse(row.statement_images_json, undefined),
    commonInfoId: row.common_info_id || undefined,
    options: safeJsonParse(row.options_json, {}),
    optionImages: safeJsonParse(row.option_images_json, undefined),
    correctAnswer: row.correct_answer,
    explanation: row.explanation ?? undefined,
    explanationImages: safeJsonParse(row.explanation_images_json, undefined),
    explanationBlocks: safeJsonParse(row.explanation_blocks_json, undefined),
    sources: safeJsonParse(row.sources_json, []),
    sourceTypes: safeJsonParse(row.source_types_json, []),
    guides: safeJsonParse(row.guides_json, []),
    important: Boolean(row.important),
    veryImportant: Boolean(row.very_important),
    dontUnderstand: Boolean(row.dont_understand),
    wrongMasteredAt: Number(row.wrong_mastered_at ?? 0) || undefined,
    createdAt: Number(row.created_at ?? 0),
    updatedAt: Number(row.updated_at ?? 0)
  };
}

export function mapRowToSession(row: Record<string, any>): PracticeSession {
  return {
    id: row.id,
    mode: row.mode,
    title: row.title ?? undefined,
    subjectId: row.subject_id ?? undefined,
    chapterId: row.chapter_id ?? undefined,
    totalQuestions: Number(row.total_questions ?? 0),
    correctCount: Number(row.correct_count ?? 0),
    wrongCount: Number(row.wrong_count ?? 0),
    skippedCount: Number(row.skipped_count ?? 0),
    accuracy: Number(row.accuracy ?? 0),
    totalTimeSeconds: Number(row.total_time_seconds ?? 0),
    durationSeconds: Number(row.duration_seconds ?? 0),
    startedAt: row.started_at !== null && row.started_at !== undefined ? Number(row.started_at) : undefined,
    completedAt: row.completed_at !== null && row.completed_at !== undefined ? Number(row.completed_at) : undefined,
    createdAt: Number(row.created_at ?? 0),
    questionIds: safeJsonParse(row.question_ids_json, [])
  };
}

export function mapRowToAttempt(row: Record<string, any>): Attempt {
  return {
    id: row.id,
    questionId: row.question_id,
    sessionId: row.session_id ?? undefined,
    selectedAnswer: row.selected_answer,
    correctAnswer: row.correct_answer ?? undefined,
    isCorrect: Boolean(row.is_correct),
    timeSpentSeconds: Number(row.time_spent_seconds ?? 0),
    attemptedAt: Number(row.attempted_at ?? 0)
  };
}

export function normalizeQuestionSources(sources: QuestionSource[]): {
  sources: QuestionSource[];
  sourceTypes: string[];
  guides: string[];
} {
  const cleanSources: QuestionSource[] = (sources || [])
    .filter(s => s && (s.name?.trim() || s.type))
    .map(s => {
      const type = (s.type || 'Board').trim();
      const name = (s.name || '').trim();
      const isGuide = type.toLowerCase() === 'guide';
      const entryNo =
        isGuide && s.entryNo !== undefined && s.entryNo !== null && String(s.entryNo).trim() !== ''
          ? String(s.entryNo).trim()
          : undefined;
      return {
        type,
        name,
        ...(entryNo ? { entryNo } : {})
      };
    });

  const sourceTypes = Array.from(new Set(cleanSources.map(s => s.type).filter(Boolean)));
  const guides = Array.from(
    new Set(
      cleanSources
        .filter(s => s.type?.toLowerCase() === 'guide' && s.name?.trim())
        .map(s => s.name.trim())
    )
  );

  return { sources: cleanSources, sourceTypes, guides };
}

const upsertQuestionStmt = sqlite.prepare(`
  INSERT INTO questions (
    id, subject_id, chapter_id, question_type, question, common_info_id,
    correct_answer, explanation, important, very_important, dont_understand, wrong_mastered_at,
    sources_json, source_types_json, guides_json, options_json,
    images_json, content_blocks_json, statements_json, statement_images_json,
    option_images_json, explanation_images_json, explanation_blocks_json,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    subject_id = excluded.subject_id,
    chapter_id = excluded.chapter_id,
    question_type = excluded.question_type,
    question = excluded.question,
    common_info_id = excluded.common_info_id,
    correct_answer = excluded.correct_answer,
    explanation = excluded.explanation,
    important = excluded.important,
    very_important = excluded.very_important,
    dont_understand = excluded.dont_understand,
    wrong_mastered_at = excluded.wrong_mastered_at,
    sources_json = excluded.sources_json,
    source_types_json = excluded.source_types_json,
    guides_json = excluded.guides_json,
    options_json = excluded.options_json,
    images_json = excluded.images_json,
    content_blocks_json = excluded.content_blocks_json,
    statements_json = excluded.statements_json,
    statement_images_json = excluded.statement_images_json,
    option_images_json = excluded.option_images_json,
    explanation_images_json = excluded.explanation_images_json,
    explanation_blocks_json = excluded.explanation_blocks_json,
    updated_at = excluded.updated_at
`);

export function upsertQuestionRow(q: Question): void {
  const norm = normalizeQuestionSources(q.sources || []);
  const now = Date.now();
  upsertQuestionStmt.run(
    q.id,
    q.subjectId,
    q.chapterId,
    q.questionType || 'STANDARD',
    q.question,
    q.commonInfoId ?? null,
    q.correctAnswer,
    q.explanation ?? null,
    q.important ? 1 : 0,
    q.veryImportant ? 1 : 0,
    q.dontUnderstand ? 1 : 0,
    q.wrongMasteredAt ? Number(q.wrongMasteredAt) : 0,
    JSON.stringify(norm.sources),
    JSON.stringify(norm.sourceTypes),
    JSON.stringify(norm.guides),
    JSON.stringify(q.options || {}),
    q.images ? JSON.stringify(q.images) : null,
    q.contentBlocks ? JSON.stringify(q.contentBlocks) : null,
    q.statements ? JSON.stringify(q.statements) : null,
    q.statementImages ? JSON.stringify(q.statementImages) : null,
    q.optionImages ? JSON.stringify(q.optionImages) : null,
    q.explanationImages ? JSON.stringify(q.explanationImages) : null,
    q.explanationBlocks ? JSON.stringify(q.explanationBlocks) : null,
    q.createdAt || now,
    q.updatedAt || now
  );
}

export function getGuideEntryNo(question: Question, guideName?: string): string | undefined {
  if (!question.sources || question.sources.length === 0) return undefined;

  if (guideName && guideName.trim()) {
    const target = guideName.toLowerCase().trim();
    const match = question.sources.find(
      s => s.type?.toLowerCase() === 'guide' && s.name?.toLowerCase().trim() === target
    );
    if (match?.entryNo !== undefined && match?.entryNo !== null && String(match.entryNo).trim() !== '') {
      return String(match.entryNo).trim();
    }
  }

  const anyGuide = question.sources.find(
    s => s.type?.toLowerCase() === 'guide' && s.entryNo !== undefined && s.entryNo !== null && String(s.entryNo).trim() !== ''
  );
  return anyGuide?.entryNo ? String(anyGuide.entryNo).trim() : undefined;
}

export function compareQuestionsByEntryNo(
  a: Question,
  b: Question,
  guideName?: string,
  direction: 'asc' | 'desc' = 'asc'
): number {
  const entryA = getGuideEntryNo(a, guideName);
  const entryB = getGuideEntryNo(b, guideName);

  if (!entryA && !entryB) return b.createdAt - a.createdAt;
  if (!entryA) return 1;
  if (!entryB) return -1;

  const cmp = entryA.localeCompare(entryB, undefined, { numeric: true, sensitivity: 'base' });
  if (cmp !== 0) return direction === 'desc' ? -cmp : cmp;

  return b.createdAt - a.createdAt;
}

function buildQuestionWhereSql(filter: QuestionFilter): { whereSql: string; params: any[] } {
  const clauses: string[] = [];
  const params: any[] = [];

  if (filter.subjectId) {
    clauses.push('q.subject_id = ?');
    params.push(filter.subjectId);
  }
  if (filter.chapterId) {
    clauses.push('q.chapter_id = ?');
    params.push(filter.chapterId);
  }

  const activeQuestionTypes =
    filter.questionTypes && filter.questionTypes.length > 0
      ? filter.questionTypes
      : filter.questionType && filter.questionType !== 'ALL'
      ? [filter.questionType]
      : [];

  if (activeQuestionTypes.length > 0) {
    const placeholders = activeQuestionTypes.map(() => '?').join(', ');
    clauses.push(`COALESCE(q.question_type, 'STANDARD') IN (${placeholders})`);
    params.push(...activeQuestionTypes);
  }

  const activeSourceTypes =
    filter.sourceTypes && filter.sourceTypes.length > 0
      ? filter.sourceTypes
      : filter.sourceType && filter.sourceType !== 'ALL'
      ? [filter.sourceType]
      : [];

  if (activeSourceTypes.length > 0) {
    const lowerTypes = activeSourceTypes.map(t => t.toLowerCase().trim());
    const placeholders = lowerTypes.map(() => '?').join(', ');
    clauses.push(
      `EXISTS (SELECT 1 FROM json_each(q.source_types_json) WHERE LOWER(value) IN (${placeholders}))`
    );
    params.push(...lowerTypes);
  }

  if (filter.guides && filter.guides.length > 0) {
    const lowerGuides = filter.guides.map(g => g.toLowerCase().trim());
    const placeholders = lowerGuides.map(() => '?').join(', ');
    clauses.push(
      `EXISTS (SELECT 1 FROM json_each(q.guides_json) WHERE LOWER(TRIM(value)) IN (${placeholders}))`
    );
    params.push(...lowerGuides);
  }

  if (filter.sourceName && filter.sourceName.trim()) {
    const term = `%${filter.sourceName.trim().toLowerCase()}%`;
    clauses.push(`LOWER(q.sources_json) LIKE ?`);
    params.push(term);
  }

  if (filter.flags && filter.flags.length > 0) {
    const flagClauses: string[] = [];
    for (const f of filter.flags) {
      if (f === 'important') flagClauses.push('q.important = 1');
      if (f === 'veryImportant') flagClauses.push('q.very_important = 1');
      if (f === 'dontUnderstand') flagClauses.push('q.dont_understand = 1');
    }
    if (flagClauses.length > 0) {
      clauses.push(`(${flagClauses.join(' OR ')})`);
    }
  } else {
    if (filter.important !== undefined) {
      clauses.push('q.important = ?');
      params.push(filter.important ? 1 : 0);
    }
    if (filter.veryImportant !== undefined) {
      clauses.push('q.very_important = ?');
      params.push(filter.veryImportant ? 1 : 0);
    }
    if (filter.dontUnderstand !== undefined) {
      clauses.push('q.dont_understand = ?');
      params.push(filter.dontUnderstand ? 1 : 0);
    }
  }

  if (filter.searchQuery && filter.searchQuery.trim()) {
    const term = `%${filter.searchQuery.trim().toLowerCase()}%`;
    clauses.push(`(
      LOWER(q.question) LIKE ?
      OR LOWER(COALESCE(q.explanation, '')) LIKE ?
      OR LOWER(q.sources_json) LIKE ?
      OR LOWER(q.options_json) LIKE ?
      OR LOWER(COALESCE(q.statements_json, '')) LIKE ?
    )`);
    params.push(term, term, term, term, term);
  }

  const activeAttemptStatuses =
    filter.attemptStatuses && filter.attemptStatuses.length > 0
      ? filter.attemptStatuses
      : filter.attemptStatus && filter.attemptStatus !== 'all'
      ? [filter.attemptStatus]
      : [];

  if (activeAttemptStatuses.length > 0) {
    const statusParts: string[] = [];
    for (const st of activeAttemptStatuses) {
      if (st === 'attempted') {
        statusParts.push(`EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id)`);
      } else if (st === 'unattempted') {
        statusParts.push(`NOT EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id)`);
      } else if (st === 'wrong') {
        statusParts.push(
          `EXISTS (SELECT 1 FROM attempts a WHERE a.question_id = q.id AND a.is_correct = 0 AND a.attempted_at > COALESCE(q.wrong_mastered_at, 0))`
        );
      }
    }
    if (statusParts.length > 0) {
      clauses.push(`(${statusParts.join(' OR ')})`);
    }
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  return { whereSql, params };
}

export function queryQuestionsPaginated(
  filter: QuestionFilter,
  page: number = 1,
  pageSize: number = 25
) {
  const { whereSql, params } = buildQuestionWhereSql(filter);

  const hasSpecificGuide = filter.guides && filter.guides.length === 1;
  const specificGuide = hasSpecificGuide ? filter.guides![0] : undefined;
  const sortBy = filter.sortBy || (hasSpecificGuide ? 'entryNoAsc' : 'createdAtDesc');

  const countRow = sqlite
    .prepare(`SELECT COUNT(*) AS cnt FROM questions q ${whereSql}`)
    .get(...params) as { cnt: number };
  const total = Number(countRow?.cnt ?? 0);
  const totalPages = Math.ceil(total / pageSize) || 1;
  const validPage = Math.max(1, Math.min(page, totalPages));
  const offset = (validPage - 1) * pageSize;

  if (sortBy === 'entryNoAsc' || sortBy === 'entryNoDesc') {
    const rows = sqlite
      .prepare(`SELECT q.* FROM questions q ${whereSql}`)
      .all(...params) as Record<string, any>[];
    const items = rows.map(mapRowToQuestion);
    const dir = sortBy === 'entryNoDesc' ? 'desc' : 'asc';
    items.sort((a, b) => compareQuestionsByEntryNo(a, b, specificGuide, dir));
    return {
      items: items.slice(offset, offset + pageSize),
      total,
      page: validPage,
      pageSize,
      totalPages
    };
  }

  let orderBySql = 'ORDER BY q.created_at DESC';
  if (sortBy === 'createdAtAsc') orderBySql = 'ORDER BY q.created_at ASC';
  else if (sortBy === 'question') orderBySql = 'ORDER BY LOWER(q.question) ASC';

  const rows = sqlite
    .prepare(`SELECT q.* FROM questions q ${whereSql} ${orderBySql} LIMIT ? OFFSET ?`)
    .all(...params, pageSize, offset) as Record<string, any>[];

  return {
    items: rows.map(mapRowToQuestion),
    total,
    page: validPage,
    pageSize,
    totalPages
  };
}

export function queryPracticeQuestions(paramsInput: {
  subjectId?: string;
  chapterId?: string;
  questionTypes?: QuestionType[];
  sourceTypes?: string[];
  guides?: string[];
  set?: 'all' | 'unattempted' | 'wrong' | 'important' | 'veryImportant' | 'dontUnderstand';
  count?: number;
  shuffle?: boolean;
}): Question[] {
  const filter: QuestionFilter = {
    subjectId: paramsInput.subjectId,
    chapterId: paramsInput.chapterId,
    questionTypes: paramsInput.questionTypes,
    sourceTypes: paramsInput.sourceTypes,
    guides: paramsInput.guides
  };

  if (paramsInput.set === 'important') filter.important = true;
  else if (paramsInput.set === 'veryImportant') filter.veryImportant = true;
  else if (paramsInput.set === 'dontUnderstand') filter.dontUnderstand = true;
  else if (paramsInput.set === 'wrong') filter.attemptStatus = 'wrong';
  else if (paramsInput.set === 'unattempted') filter.attemptStatus = 'unattempted';

  const { whereSql, params } = buildQuestionWhereSql(filter);
  const limit = paramsInput.count && paramsInput.count > 0 ? Math.min(paramsInput.count, 5000) : 20;

  if (paramsInput.shuffle) {
    const rows = sqlite
      .prepare(`SELECT q.* FROM questions q ${whereSql} ORDER BY RANDOM() LIMIT ?`)
      .all(...params, limit) as Record<string, any>[];
    return rows.map(mapRowToQuestion);
  }

  const hasSpecificGuide = paramsInput.guides && paramsInput.guides.length === 1;
  if (hasSpecificGuide) {
    const rows = sqlite
      .prepare(`SELECT q.* FROM questions q ${whereSql}`)
      .all(...params) as Record<string, any>[];
    const questions = rows.map(mapRowToQuestion);
    questions.sort((a, b) => compareQuestionsByEntryNo(a, b, paramsInput.guides![0], 'asc'));
    return questions.slice(0, limit);
  }

  const rows = sqlite
    .prepare(`SELECT q.* FROM questions q ${whereSql} ORDER BY q.created_at DESC LIMIT ?`)
    .all(...params, limit) as Record<string, any>[];
  return rows.map(mapRowToQuestion);
}

export function getQuestionStatsMapFromDb(): Record<string, QuestionStats> {
  const rows = sqlite
    .prepare(`
      SELECT
        question_id,
        COUNT(*) AS total_attempts,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct_attempts,
        SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) AS wrong_attempts,
        MAX(attempted_at) AS last_attempted_at
      FROM attempts
      GROUP BY question_id
    `)
    .all() as Record<string, any>[];

  const lastRows = sqlite
    .prepare(`
      SELECT a.question_id, a.is_correct
      FROM attempts a
      INNER JOIN (
        SELECT question_id, MAX(attempted_at) AS max_at
        FROM attempts
        GROUP BY question_id
      ) latest ON latest.question_id = a.question_id AND latest.max_at = a.attempted_at
    `)
    .all() as Record<string, any>[];

  const lastMap = new Map<string, boolean>();
  for (const r of lastRows) {
    lastMap.set(r.question_id, Boolean(r.is_correct));
  }

  const result: Record<string, QuestionStats> = {};
  for (const r of rows) {
    const total = Number(r.total_attempts ?? 0);
    const correct = Number(r.correct_attempts ?? 0);
    const wrong = Number(r.wrong_attempts ?? 0);
    result[r.question_id] = {
      totalAttempts: total,
      correctAttempts: correct,
      wrongAttempts: wrong,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      lastAttemptedAt: Number(r.last_attempted_at ?? 0),
      lastIsCorrect: lastMap.get(r.question_id)
    };
  }
  return result;
}

export function markQuestionMasteredInDb(questionId: string): boolean {
  const exists = sqlite.prepare('SELECT id FROM questions WHERE id = ?').get(questionId);
  if (!exists) return false;
  const row = sqlite
    .prepare('SELECT MAX(attempted_at) AS max_at FROM attempts WHERE question_id = ?')
    .get(questionId) as { max_at: number | null } | undefined;
  const now = Date.now();
  const masteredAt = Math.max(now, Number(row?.max_at ?? 0));
  sqlite
    .prepare('UPDATE questions SET wrong_mastered_at = ?, updated_at = ? WHERE id = ?')
    .run(masteredAt, now, questionId);
  return true;
}

export function getWeakQuestionsFromDb() {
  const rows = sqlite
    .prepare(`
      SELECT
        q.*,
        s.total_attempts,
        s.wrong_attempts,
        s.correct_attempts
      FROM questions q
      INNER JOIN (
        SELECT
          a.question_id,
          COUNT(*) AS total_attempts,
          SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct_attempts,
          SUM(CASE WHEN a.is_correct = 0 AND a.attempted_at > COALESCE(q2.wrong_mastered_at, 0) THEN 1 ELSE 0 END) AS wrong_attempts
        FROM attempts a
        INNER JOIN questions q2 ON q2.id = a.question_id
        GROUP BY a.question_id
      ) s ON s.question_id = q.id
      WHERE s.wrong_attempts >= 1
      ORDER BY s.wrong_attempts DESC, q.updated_at DESC
      LIMIT 500
    `)
    .all() as Record<string, any>[];

  return rows.map(r => ({
    question: mapRowToQuestion(r),
    wrongCount: Number(r.wrong_attempts ?? 0),
    totalAttempts: Number(r.total_attempts ?? 0),
    dontUnderstand: Boolean(r.dont_understand)
  }));
}

export function getSystemStatisticsFromDb() {
  const totalQuestions = Number(
    (sqlite.prepare('SELECT COUNT(*) AS cnt FROM questions').get() as any)?.cnt ?? 0
  );
  const attAgg = sqlite
    .prepare(`
      SELECT
        COUNT(*) AS total_attempts,
        SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS total_correct
      FROM attempts
    `)
    .get() as any;

  const totalAttempts = Number(attAgg?.total_attempts ?? 0);
  const totalCorrect = Number(attAgg?.total_correct ?? 0);
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

  const qAttAgg = sqlite
    .prepare(`
      SELECT
        COUNT(*) AS attempted_questions,
        SUM(CASE WHEN active_wrong_cnt > 0 THEN 1 ELSE 0 END) AS wrong_questions_count,
        SUM(CASE WHEN ROUND(CAST(correct_cnt AS REAL) * 100.0 / total_cnt) < 60 THEN 1 ELSE 0 END) AS weak_questions_count
      FROM (
        SELECT
          a.question_id,
          COUNT(*) AS total_cnt,
          SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct_cnt,
          SUM(CASE WHEN a.is_correct = 0 AND a.attempted_at > COALESCE(q.wrong_mastered_at, 0) THEN 1 ELSE 0 END) AS active_wrong_cnt
        FROM attempts a
        INNER JOIN questions q ON q.id = a.question_id
        GROUP BY a.question_id
      )
    `)
    .get() as any;

  const subjectRows = sqlite
    .prepare(`
      SELECT
        s.id AS subject_id,
        s.name AS subject_name,
        COUNT(DISTINCT q.id) AS total_questions,
        COUNT(DISTINCT a.question_id) AS attempted_questions,
        COUNT(a.id) AS total_att,
        SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct_att
      FROM subjects s
      LEFT JOIN questions q ON q.subject_id = s.id
      LEFT JOIN attempts a ON a.question_id = q.id
      GROUP BY s.id
      ORDER BY s.sort_order ASC
    `)
    .all() as any[];

  const subjectStats: SubjectStatistics[] = subjectRows.map(r => {
    const tAtt = Number(r.total_att ?? 0);
    const cAtt = Number(r.correct_att ?? 0);
    return {
      subjectId: r.subject_id,
      subjectName: r.subject_name,
      totalQuestions: Number(r.total_questions ?? 0),
      attemptedQuestions: Number(r.attempted_questions ?? 0),
      accuracy: tAtt > 0 ? Math.round((cAtt / tAtt) * 100) : 0
    };
  });

  const chapterRows = sqlite
    .prepare(`
      SELECT
        c.id AS chapter_id,
        c.name AS chapter_name,
        COALESCE(s.name, 'Unknown') AS subject_name,
        COUNT(DISTINCT q.id) AS total_questions,
        COUNT(DISTINCT a.question_id) AS attempted_questions,
        COUNT(a.id) AS total_att,
        SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct_att
      FROM chapters c
      LEFT JOIN subjects s ON s.id = c.subject_id
      LEFT JOIN questions q ON q.chapter_id = c.id
      LEFT JOIN attempts a ON a.question_id = q.id
      GROUP BY c.id
      ORDER BY c.sort_order ASC
    `)
    .all() as any[];

  const chapterStats: ChapterStatistics[] = chapterRows.map(r => {
    const tAtt = Number(r.total_att ?? 0);
    const cAtt = Number(r.correct_att ?? 0);
    return {
      chapterId: r.chapter_id,
      chapterName: r.chapter_name,
      subjectName: r.subject_name,
      totalQuestions: Number(r.total_questions ?? 0),
      attemptedQuestions: Number(r.attempted_questions ?? 0),
      accuracy: tAtt > 0 ? Math.round((cAtt / tAtt) * 100) : 0
    };
  });

  const typeLabels: Record<QuestionType, string> = {
    STANDARD: 'Standard MCQ',
    MULTIPLE_STATEMENT: 'বহুপদী সমাপ্তিসূচক',
    COMMON_STEM: 'অভিন্ন তথ্যভিত্তিক'
  };

  const typeRows = sqlite
    .prepare(`
      SELECT
        COALESCE(q.question_type, 'STANDARD') AS qtype,
        COUNT(DISTINCT q.id) AS total_questions,
        COUNT(DISTINCT a.question_id) AS attempted_questions,
        COUNT(a.id) AS total_att,
        SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct_att
      FROM questions q
      LEFT JOIN attempts a ON a.question_id = q.id
      GROUP BY COALESCE(q.question_type, 'STANDARD')
    `)
    .all() as any[];

  const typeRowMap = new Map<string, any>();
  for (const r of typeRows) typeRowMap.set(r.qtype, r);

  const typeStats: QuestionTypeStatistics[] = (
    ['STANDARD', 'MULTIPLE_STATEMENT', 'COMMON_STEM'] as QuestionType[]
  ).map(t => {
    const r = typeRowMap.get(t);
    const tAtt = Number(r?.total_att ?? 0);
    const cAtt = Number(r?.correct_att ?? 0);
    return {
      type: t,
      label: typeLabels[t],
      totalQuestions: Number(r?.total_questions ?? 0),
      attemptedQuestions: Number(r?.attempted_questions ?? 0),
      accuracy: tAtt > 0 ? Math.round((cAtt / tAtt) * 100) : 0
    };
  });

  const missedRows = sqlite
    .prepare(`
      SELECT
        q.*,
        SUM(CASE WHEN a.is_correct = 0 THEN 1 ELSE 0 END) AS wrong_cnt,
        SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) AS correct_cnt,
        COUNT(a.id) AS total_cnt
      FROM attempts a
      INNER JOIN questions q ON q.id = a.question_id
      GROUP BY a.question_id
      HAVING wrong_cnt > 0
      ORDER BY wrong_cnt DESC
      LIMIT 10
    `)
    .all() as any[];

  const mostMissedQuestions = missedRows.map(r => {
    const tCnt = Number(r.total_cnt ?? 0);
    const cCnt = Number(r.correct_cnt ?? 0);
    return {
      question: mapRowToQuestion(r),
      wrongCount: Number(r.wrong_cnt ?? 0),
      accuracy: tCnt > 0 ? Math.round((cCnt / tCnt) * 100) : 0
    };
  });

  return {
    totalQuestions,
    attemptedQuestions: Number(qAttAgg?.attempted_questions ?? 0),
    totalAttempts,
    overallAccuracy,
    wrongQuestionsCount: Number(qAttAgg?.wrong_questions_count ?? 0),
    weakQuestionsCount: Number(qAttAgg?.weak_questions_count ?? 0),
    subjectStats,
    chapterStats,
    typeStats,
    mostMissedQuestions
  };
}

export function getDbStatus() {
  const subjectsCount = Number((sqlite.prepare('SELECT COUNT(*) AS cnt FROM subjects').get() as any)?.cnt ?? 0);
  const chaptersCount = Number((sqlite.prepare('SELECT COUNT(*) AS cnt FROM chapters').get() as any)?.cnt ?? 0);
  const questionsCount = Number((sqlite.prepare('SELECT COUNT(*) AS cnt FROM questions').get() as any)?.cnt ?? 0);
  const sessionsCount = Number((sqlite.prepare('SELECT COUNT(*) AS cnt FROM sessions').get() as any)?.cnt ?? 0);
  const attemptsCount = Number((sqlite.prepare('SELECT COUNT(*) AS cnt FROM attempts').get() as any)?.cnt ?? 0);
  const mediaCount = Number((sqlite.prepare('SELECT COUNT(*) AS cnt FROM media_files').get() as any)?.cnt ?? 0);

  let dbSizeBytes = 0;
  try {
    dbSizeBytes = fs.statSync(DB_PATH).size;
    const walPath = DB_PATH + '-wal';
    if (fs.existsSync(walPath)) dbSizeBytes += fs.statSync(walPath).size;
  } catch {
    // ignore
  }

  let mediaSizeBytes = 0;
  try {
    const files = fs.readdirSync(MEDIA_DIR);
    for (const f of files) {
      try {
        mediaSizeBytes += fs.statSync(path.join(MEDIA_DIR, f)).size;
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }

  return {
    engine: 'SQLite (Local Disk)',
    dbPath: DB_PATH,
    mediaDir: MEDIA_DIR,
    dbSizeBytes,
    mediaSizeBytes,
    mediaCount,
    counts: {
      subjects: subjectsCount,
      chapters: chaptersCount,
      questions: questionsCount,
      sessions: sessionsCount,
      attempts: attemptsCount
    }
  };
}
