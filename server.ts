import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  sqlite,
  getStoragePaths,
  withTransaction,
  mapRowToSubject,
  mapRowToChapter,
  mapRowToCommonInfo,
  mapRowToQuestion,
  mapRowToSession,
  mapRowToAttempt,
  normalizeQuestionSources,
  upsertQuestionRow,
  queryQuestionsPaginated,
  queryPracticeQuestions,
  getQuestionStatsMapFromDb,
  getWeakQuestionsFromDb,
  getSystemStatisticsFromDb,
  getDbStatus
} from './server/sqliteDb.ts';
import type { Question, Subject, Chapter, CommonInformation, Attempt, PracticeSession } from './src/types/index.ts';

const PORT = Number(process.env.PORT) || 3000;
const { mediaDir } = getStoragePaths();

function extFromMime(mimeType: string, filename?: string): string {
  const lower = (mimeType || '').toLowerCase();
  if (lower.includes('webp')) return '.webp';
  if (lower.includes('png')) return '.png';
  if (lower.includes('jpeg') || lower.includes('jpg')) return '.jpg';
  if (lower.includes('gif')) return '.gif';
  if (lower.includes('svg')) return '.svg';
  if (filename) {
    const ext = path.extname(filename).toLowerCase();
    if (ext) return ext;
  }
  return '.webp';
}

async function startServer() {
  const app = express();

  // Raw binary media upload route before express.json()
  app.post(
    '/api/media/upload-raw',
    express.raw({ type: '*/*', limit: '25mb' }),
    (req, res) => {
      try {
        const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
        if (!buffer.length) {
          res.status(400).json({ error: 'Empty image payload' });
          return;
        }
        const rawName = decodeURIComponent(String(req.header('x-file-name') || 'image.webp'));
        const mimeType = String(req.header('x-mime-type') || 'image/webp');
        const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        const ext = extFromMime(mimeType, rawName);
        const filePath = path.join(mediaDir, `${id}${ext}`);

        fs.writeFileSync(filePath, buffer);
        sqlite
          .prepare(
            'INSERT INTO media_files (id, name, mime_type, size, ext, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .run(id, rawName, mimeType, buffer.length, ext, Date.now());

        res.json({
          id,
          storagePath: `media/${id}`,
          url: `/api/media/${id}`,
          name: rawName,
          mimeType,
          size: buffer.length
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message || 'Failed to store media file' });
      }
    }
  );

  app.use(express.json({ limit: '100mb' }));

  // --- DB Status & Seed ---
  app.get('/api/db/status', (_req, res) => {
    try {
      res.json(getDbStatus());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/seed', (req, res) => {
    try {
      const { subjects = [], chapters = [], questions = [] } = req.body || {};
      const cnt = Number((sqlite.prepare('SELECT COUNT(*) AS cnt FROM subjects').get() as any)?.cnt ?? 0);
      if (cnt > 0) {
        res.json({ seeded: false });
        return;
      }

      withTransaction(() => {
        const insideCnt = Number((sqlite.prepare('SELECT COUNT(*) AS cnt FROM subjects').get() as any)?.cnt ?? 0);
        if (insideCnt > 0) return;

        const insSubj = sqlite.prepare(
          'INSERT OR REPLACE INTO subjects (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)'
        );
        for (const s of subjects as Subject[]) {
          insSubj.run(s.id, s.name, s.order ?? 0, s.createdAt ?? Date.now());
        }

        const insChap = sqlite.prepare(
          'INSERT OR REPLACE INTO chapters (id, subject_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)'
        );
        for (const c of chapters as Chapter[]) {
          insChap.run(c.id, c.subjectId, c.name, c.order ?? 0, c.createdAt ?? Date.now());
        }

        for (const q of questions as Question[]) {
          upsertQuestionRow(q);
        }
      });

      res.json({ seeded: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/seed/force', (req, res) => {
    try {
      const { subjects = [], chapters = [], questions = [] } = req.body || {};
      withTransaction(() => {
        sqlite.exec(`
          DELETE FROM attempts;
          DELETE FROM sessions;
          DELETE FROM questions;
          DELETE FROM common_information;
          DELETE FROM chapters;
          DELETE FROM subjects;
        `);

        const insSubj = sqlite.prepare(
          'INSERT OR REPLACE INTO subjects (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)'
        );
        for (const s of subjects as Subject[]) {
          insSubj.run(s.id, s.name, s.order ?? 0, s.createdAt ?? Date.now());
        }

        const insChap = sqlite.prepare(
          'INSERT OR REPLACE INTO chapters (id, subject_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)'
        );
        for (const c of chapters as Chapter[]) {
          insChap.run(c.id, c.subjectId, c.name, c.order ?? 0, c.createdAt ?? Date.now());
        }

        for (const q of questions as Question[]) {
          upsertQuestionRow(q);
        }
      });

      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Subjects ---
  app.get('/api/subjects', (_req, res) => {
    const rows = sqlite.prepare('SELECT * FROM subjects ORDER BY sort_order ASC').all() as Record<string, any>[];
    res.json(rows.map(mapRowToSubject));
  });

  app.get('/api/subjects/counts', (_req, res) => {
    const rows = sqlite
      .prepare('SELECT subject_id, COUNT(*) AS cnt FROM questions GROUP BY subject_id')
      .all() as { subject_id: string; cnt: number }[];
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.subject_id] = Number(r.cnt ?? 0);
    res.json(counts);
  });

  app.get('/api/subjects/:id', (req, res) => {
    const row = sqlite.prepare('SELECT * FROM subjects WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Subject not found' });
      return;
    }
    res.json(mapRowToSubject(row));
  });

  app.post('/api/subjects', (req, res) => {
    try {
      const trimmed = String(req.body?.name || '').trim();
      if (!trimmed) {
        res.status(400).json({ error: 'Subject name cannot be empty' });
        return;
      }
      const existing = sqlite
        .prepare('SELECT id FROM subjects WHERE LOWER(name) = LOWER(?)')
        .get(trimmed);
      if (existing) {
        res.status(409).json({ error: `A subject named "${trimmed}" already exists` });
        return;
      }
      const maxRow = sqlite.prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM subjects').get() as any;
      const subject: Subject = {
        id: 'subj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        name: trimmed,
        order: Number(maxRow?.max_order ?? 0) + 1,
        createdAt: Date.now()
      };
      sqlite
        .prepare('INSERT INTO subjects (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)')
        .run(subject.id, subject.name, subject.order, subject.createdAt);
      res.json(subject);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/subjects/:id', (req, res) => {
    const trimmed = String(req.body?.name || '').trim();
    if (!trimmed) {
      res.status(400).json({ error: 'Subject name cannot be empty' });
      return;
    }
    sqlite.prepare('UPDATE subjects SET name = ? WHERE id = ?').run(trimmed, req.params.id);
    res.json({ ok: true });
  });

  app.delete('/api/subjects/:id', (req, res) => {
    const id = req.params.id;
    const result = withTransaction(() => {
      const chapCount = Number(
        (sqlite.prepare('SELECT COUNT(*) AS cnt FROM chapters WHERE subject_id = ?').get(id) as any)?.cnt ?? 0
      );
      const qCount = Number(
        (sqlite.prepare('SELECT COUNT(*) AS cnt FROM questions WHERE subject_id = ?').get(id) as any)?.cnt ?? 0
      );

      sqlite
        .prepare('DELETE FROM attempts WHERE question_id IN (SELECT id FROM questions WHERE subject_id = ?)')
        .run(id);
      sqlite.prepare('DELETE FROM questions WHERE subject_id = ?').run(id);
      sqlite.prepare('DELETE FROM common_information WHERE subject_id = ?').run(id);
      sqlite.prepare('DELETE FROM chapters WHERE subject_id = ?').run(id);
      sqlite.prepare('DELETE FROM subjects WHERE id = ?').run(id);

      return { deletedQuestions: qCount, deletedChapters: chapCount };
    });
    res.json(result);
  });

  // --- Chapters ---
  app.get('/api/chapters', (req, res) => {
    const subjectId = req.query.subjectId ? String(req.query.subjectId) : undefined;
    const rows = subjectId
      ? (sqlite
          .prepare('SELECT * FROM chapters WHERE subject_id = ? ORDER BY sort_order ASC')
          .all(subjectId) as Record<string, any>[])
      : (sqlite.prepare('SELECT * FROM chapters ORDER BY sort_order ASC').all() as Record<string, any>[]);
    res.json(rows.map(mapRowToChapter));
  });

  app.get('/api/chapters/counts', (_req, res) => {
    const rows = sqlite
      .prepare('SELECT chapter_id, COUNT(*) AS cnt FROM questions GROUP BY chapter_id')
      .all() as { chapter_id: string; cnt: number }[];
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.chapter_id] = Number(r.cnt ?? 0);
    res.json(counts);
  });

  app.put('/api/chapters/reorder', (req, res) => {
    const chapterIdsInOrder: string[] = Array.isArray(req.body?.chapterIdsInOrder)
      ? req.body.chapterIdsInOrder
      : [];
    withTransaction(() => {
      const stmt = sqlite.prepare('UPDATE chapters SET sort_order = ? WHERE id = ?');
      for (let i = 0; i < chapterIdsInOrder.length; i++) {
        stmt.run(i + 1, chapterIdsInOrder[i]);
      }
    });
    res.json({ ok: true });
  });

  app.get('/api/chapters/:id', (req, res) => {
    const row = sqlite.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Chapter not found' });
      return;
    }
    res.json(mapRowToChapter(row));
  });

  app.post('/api/chapters', (req, res) => {
    const subjectId = String(req.body?.subjectId || '');
    const trimmed = String(req.body?.name || '').trim();
    if (!trimmed) {
      res.status(400).json({ error: 'Chapter name cannot be empty' });
      return;
    }
    const subject = sqlite.prepare('SELECT * FROM subjects WHERE id = ?').get(subjectId) as Record<string, any> | undefined;
    if (!subject) {
      res.status(404).json({ error: 'Subject not found' });
      return;
    }
    const existing = sqlite
      .prepare('SELECT id FROM chapters WHERE subject_id = ? AND LOWER(name) = LOWER(?)')
      .get(subjectId, trimmed);
    if (existing) {
      res.status(409).json({ error: `A chapter named "${trimmed}" already exists in ${subject.name}` });
      return;
    }
    const maxRow = sqlite
      .prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM chapters WHERE subject_id = ?')
      .get(subjectId) as any;

    const chapter: Chapter = {
      id: 'chap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      subjectId,
      name: trimmed,
      order: Number(maxRow?.max_order ?? 0) + 1,
      createdAt: Date.now()
    };
    sqlite
      .prepare('INSERT INTO chapters (id, subject_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(chapter.id, chapter.subjectId, chapter.name, chapter.order, chapter.createdAt);
    res.json(chapter);
  });

  app.patch('/api/chapters/:id', (req, res) => {
    const trimmed = String(req.body?.name || '').trim();
    if (!trimmed) {
      res.status(400).json({ error: 'Chapter name cannot be empty' });
      return;
    }
    sqlite.prepare('UPDATE chapters SET name = ? WHERE id = ?').run(trimmed, req.params.id);
    res.json({ ok: true });
  });

  app.delete('/api/chapters/:id', (req, res) => {
    const id = req.params.id;
    const result = withTransaction(() => {
      const qCount = Number(
        (sqlite.prepare('SELECT COUNT(*) AS cnt FROM questions WHERE chapter_id = ?').get(id) as any)?.cnt ?? 0
      );
      sqlite
        .prepare('DELETE FROM attempts WHERE question_id IN (SELECT id FROM questions WHERE chapter_id = ?)')
        .run(id);
      sqlite.prepare('DELETE FROM questions WHERE chapter_id = ?').run(id);
      sqlite.prepare('DELETE FROM common_information WHERE chapter_id = ?').run(id);
      sqlite.prepare('DELETE FROM chapters WHERE id = ?').run(id);
      return { deletedQuestions: qCount };
    });
    res.json(result);
  });

  // --- Common Information ---
  app.get('/api/common-info', (_req, res) => {
    const rows = sqlite
      .prepare('SELECT * FROM common_information ORDER BY created_at DESC')
      .all() as Record<string, any>[];
    res.json(rows.map(mapRowToCommonInfo));
  });

  app.post('/api/common-info/find-by-content', (req, res) => {
    const content = String(req.body?.content || '').trim();
    if (!content) {
      res.json(null);
      return;
    }
    const row = sqlite
      .prepare('SELECT * FROM common_information WHERE TRIM(content) = ? LIMIT 1')
      .get(content) as Record<string, any> | undefined;
    res.json(row ? mapRowToCommonInfo(row) : null);
  });

  app.get('/api/common-info/:id', (req, res) => {
    const row = sqlite
      .prepare('SELECT * FROM common_information WHERE id = ?')
      .get(req.params.id) as Record<string, any> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Common information not found' });
      return;
    }
    res.json(mapRowToCommonInfo(row));
  });

  app.get('/api/common-info/:id/questions', (req, res) => {
    const rows = sqlite
      .prepare('SELECT * FROM questions WHERE common_info_id = ? ORDER BY created_at ASC')
      .all(req.params.id) as Record<string, any>[];
    res.json(rows.map(mapRowToQuestion));
  });

  app.get('/api/common-info/:id/with-questions', (req, res) => {
    const infoRow = sqlite
      .prepare('SELECT * FROM common_information WHERE id = ?')
      .get(req.params.id) as Record<string, any> | undefined;
    if (!infoRow) {
      res.json(null);
      return;
    }
    const qRows = sqlite
      .prepare('SELECT * FROM questions WHERE common_info_id = ? ORDER BY created_at ASC')
      .all(req.params.id) as Record<string, any>[];
    res.json({
      commonInfo: mapRowToCommonInfo(infoRow),
      questions: qRows.map(mapRowToQuestion)
    });
  });

  app.post('/api/common-info', (req, res) => {
    const data = req.body || {};
    const now = Date.now();
    const newInfo: CommonInformation = {
      id: 'ci_' + now + '_' + Math.random().toString(36).substring(2, 8),
      title: String(data.title || '').trim() || 'অভিন্ন তথ্য',
      content: String(data.content || '').trim(),
      images: data.images || [],
      contentBlocks: data.contentBlocks,
      subjectId: data.subjectId,
      chapterId: data.chapterId,
      createdAt: now,
      updatedAt: now
    };
    sqlite
      .prepare(
        `INSERT INTO common_information
          (id, title, content, images_json, content_blocks_json, subject_id, chapter_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newInfo.id,
        newInfo.title,
        newInfo.content,
        newInfo.images ? JSON.stringify(newInfo.images) : null,
        newInfo.contentBlocks ? JSON.stringify(newInfo.contentBlocks) : null,
        newInfo.subjectId,
        newInfo.chapterId,
        newInfo.createdAt,
        newInfo.updatedAt
      );
    res.json(newInfo);
  });

  app.patch('/api/common-info/:id', (req, res) => {
    const row = sqlite
      .prepare('SELECT * FROM common_information WHERE id = ?')
      .get(req.params.id) as Record<string, any> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Common information not found' });
      return;
    }
    const current = mapRowToCommonInfo(row);
    const updated: CommonInformation = {
      ...current,
      ...req.body,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: Date.now()
    };
    sqlite
      .prepare(
        `UPDATE common_information
         SET title = ?, content = ?, images_json = ?, content_blocks_json = ?, subject_id = ?, chapter_id = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        updated.title,
        updated.content,
        updated.images ? JSON.stringify(updated.images) : null,
        updated.contentBlocks ? JSON.stringify(updated.contentBlocks) : null,
        updated.subjectId,
        updated.chapterId,
        updated.updatedAt,
        updated.id
      );
    res.json({ ok: true });
  });

  app.delete('/api/common-info/:id', (req, res) => {
    const id = req.params.id;
    const deleteLinked = req.query.deleteLinkedQuestions === 'true';
    withTransaction(() => {
      if (deleteLinked) {
        sqlite
          .prepare('DELETE FROM attempts WHERE question_id IN (SELECT id FROM questions WHERE common_info_id = ?)')
          .run(id);
        sqlite.prepare('DELETE FROM questions WHERE common_info_id = ?').run(id);
      } else {
        sqlite
          .prepare(
            `UPDATE questions SET common_info_id = NULL, question_type = 'STANDARD', updated_at = ? WHERE common_info_id = ?`
          )
          .run(Date.now(), id);
      }
      sqlite.prepare('DELETE FROM common_information WHERE id = ?').run(id);
    });
    res.json({ ok: true });
  });

  // --- Questions ---
  app.get('/api/questions/count', (_req, res) => {
    const cnt = Number((sqlite.prepare('SELECT COUNT(*) AS cnt FROM questions').get() as any)?.cnt ?? 0);
    res.json({ count: cnt });
  });

  app.get('/api/questions/sources', (_req, res) => {
    const rows = sqlite
      .prepare(
        `SELECT DISTINCT TRIM(json_extract(j.value, '$.name')) AS name
         FROM questions q, json_each(q.sources_json) j
         WHERE name IS NOT NULL AND name != ''
         ORDER BY name ASC`
      )
      .all() as { name: string }[];
    res.json(rows.map(r => r.name));
  });

  app.post('/api/questions/check-duplicates', (req, res) => {
    const texts: string[] = Array.isArray(req.body?.texts) ? req.body.texts : [];
    if (texts.length === 0) {
      res.json({ duplicates: [] });
      return;
    }
    const normalized = Array.from(new Set(texts.map(t => String(t).toLowerCase().trim()).filter(Boolean)));
    const duplicates: string[] = [];
    const stmt = sqlite.prepare('SELECT 1 FROM questions WHERE LOWER(TRIM(question)) = ? LIMIT 1');
    for (const t of normalized) {
      if (stmt.get(t)) duplicates.push(t);
    }
    res.json({ duplicates });
  });

  app.post('/api/questions/query', (req, res) => {
    try {
      const { filter = {}, page = 1, pageSize = 25 } = req.body || {};
      res.json(queryQuestionsPaginated(filter, Number(page), Number(pageSize)));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/questions/practice', (req, res) => {
    try {
      res.json(queryPracticeQuestions(req.body || {}));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/questions/bulk-put', (req, res) => {
    try {
      const questions: Question[] = Array.isArray(req.body?.questions) ? req.body.questions : [];
      withTransaction(() => {
        for (const q of questions) {
          upsertQuestionRow(q);
        }
      });
      res.json({ inserted: questions.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/questions/bulk-update', (req, res) => {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const action = req.body?.action;
    if (!ids.length || !action) {
      res.json({ updated: 0 });
      return;
    }

    withTransaction(() => {
      const getStmt = sqlite.prepare('SELECT * FROM questions WHERE id = ?');
      const now = Date.now();
      for (const id of ids) {
        const row = getStmt.get(id) as Record<string, any> | undefined;
        if (!row) continue;
        const q = mapRowToQuestion(row);
        q.updatedAt = now;

        switch (action.type) {
          case 'set_important':
            q.important = true;
            break;
          case 'unset_important':
            q.important = false;
            break;
          case 'set_veryImportant':
            q.veryImportant = true;
            break;
          case 'unset_veryImportant':
            q.veryImportant = false;
            break;
          case 'set_dontUnderstand':
            q.dontUnderstand = true;
            break;
          case 'unset_dontUnderstand':
            q.dontUnderstand = false;
            break;
          case 'set_subject_chapter':
            if (action.value?.subjectId) q.subjectId = action.value.subjectId;
            if (action.value?.chapterId) q.chapterId = action.value.chapterId;
            break;
          case 'add_source':
            if (action.value?.type && action.value?.name) {
              const norm = normalizeQuestionSources([
                ...(q.sources || []),
                { type: action.value.type, name: action.value.name }
              ]);
              q.sources = norm.sources;
              q.sourceTypes = norm.sourceTypes;
              q.guides = norm.guides;
            }
            break;
        }
        upsertQuestionRow(q);
      }
    });

    res.json({ updated: ids.length });
  });

  app.post('/api/questions/bulk-delete', (req, res) => {
    const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids : [];
    if (ids.length === 0) {
      res.json({ deleted: 0 });
      return;
    }
    withTransaction(() => {
      const delAtt = sqlite.prepare('DELETE FROM attempts WHERE question_id = ?');
      const delQ = sqlite.prepare('DELETE FROM questions WHERE id = ?');
      for (const id of ids) {
        delAtt.run(id);
        delQ.run(id);
      }
    });
    res.json({ deleted: ids.length });
  });

  app.get('/api/questions/:id', (req, res) => {
    const row = sqlite.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    res.json(mapRowToQuestion(row));
  });

  app.post('/api/questions', (req, res) => {
    try {
      const data = req.body || {};
      const norm = normalizeQuestionSources(data.sources || []);
      const now = Date.now();
      const newQuestion: Question = {
        id: 'q_' + now + '_' + Math.random().toString(36).substring(2, 8),
        subjectId: data.subjectId,
        chapterId: data.chapterId,
        questionType: data.questionType || 'STANDARD',
        question: data.question,
        images: data.images || [],
        contentBlocks: data.contentBlocks,
        statements: data.statements,
        statementImages: data.statementImages,
        commonInfoId: data.commonInfoId,
        options: data.options || {},
        optionImages: data.optionImages,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
        explanationImages: data.explanationImages || [],
        explanationBlocks: data.explanationBlocks,
        sources: norm.sources,
        sourceTypes: norm.sourceTypes,
        guides: norm.guides,
        important: Boolean(data.important),
        veryImportant: Boolean(data.veryImportant),
        dontUnderstand: Boolean(data.dontUnderstand),
        createdAt: now,
        updatedAt: now
      };
      upsertQuestionRow(newQuestion);
      res.json(newQuestion);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/questions/:id', (req, res) => {
    const row = sqlite.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    const existing = mapRowToQuestion(row);
    const changes = req.body || {};
    const updated: Question = {
      ...existing,
      ...changes,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: Date.now()
    };
    if (changes.sources) {
      const norm = normalizeQuestionSources(changes.sources);
      updated.sources = norm.sources;
      updated.sourceTypes = norm.sourceTypes;
      updated.guides = norm.guides;
    }
    upsertQuestionRow(updated);
    res.json({ ok: true });
  });

  app.post('/api/questions/:id/toggle-flag', (req, res) => {
    const flag = req.body?.flag as 'important' | 'veryImportant' | 'dontUnderstand';
    if (!['important', 'veryImportant', 'dontUnderstand'].includes(flag)) {
      res.status(400).json({ error: 'Invalid flag' });
      return;
    }
    const row = sqlite.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
    if (!row) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }
    const q = mapRowToQuestion(row);
    const nextVal = !q[flag];
    const colMap: Record<string, string> = {
      important: 'important',
      veryImportant: 'very_important',
      dontUnderstand: 'dont_understand'
    };
    sqlite
      .prepare(`UPDATE questions SET ${colMap[flag]} = ?, updated_at = ? WHERE id = ?`)
      .run(nextVal ? 1 : 0, Date.now(), q.id);
    res.json({ value: nextVal });
  });

  app.delete('/api/questions/:id', (req, res) => {
    withTransaction(() => {
      sqlite.prepare('DELETE FROM attempts WHERE question_id = ?').run(req.params.id);
      sqlite.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);
    });
    res.json({ ok: true });
  });

  // --- Attempts, Sessions & Stats ---
  app.post('/api/attempts', (req, res) => {
    const data = req.body || {};
    const attempt: Attempt = {
      id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      questionId: data.questionId,
      sessionId: data.sessionId || 'session_' + Date.now(),
      selectedAnswer: data.selectedAnswer,
      correctAnswer: data.correctAnswer || '',
      isCorrect: Boolean(data.isCorrect),
      timeSpentSeconds: Number(data.timeSpentSeconds || 0),
      attemptedAt: Date.now()
    };
    sqlite
      .prepare(
        `INSERT INTO attempts (id, question_id, session_id, selected_answer, correct_answer, is_correct, time_spent_seconds, attempted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        attempt.id,
        attempt.questionId,
        attempt.sessionId ?? null,
        attempt.selectedAnswer,
        attempt.correctAnswer ?? null,
        attempt.isCorrect ? 1 : 0,
        attempt.timeSpentSeconds ?? 0,
        attempt.attemptedAt
      );
    res.json(attempt);
  });

  app.get('/api/attempts/session/:sessionId', (req, res) => {
    const rows = sqlite
      .prepare('SELECT * FROM attempts WHERE session_id = ? ORDER BY attempted_at ASC')
      .all(req.params.sessionId) as Record<string, any>[];
    res.json(rows.map(mapRowToAttempt));
  });

  app.get('/api/attempts/question-stats', (_req, res) => {
    res.json(getQuestionStatsMapFromDb());
  });

  app.post('/api/sessions', (req, res) => {
    const data = req.body || {};
    const now = Date.now();
    const isCompleted = data.completedAt !== undefined ? Boolean(data.completedAt) : Boolean(data.accuracy !== undefined && data.totalTimeSeconds !== undefined);
    const totalTime = Number(data.totalTimeSeconds ?? data.durationSeconds ?? 0);

    const session: PracticeSession = {
      id: 'sess_' + now + '_' + Math.random().toString(36).substring(2, 8),
      mode: data.mode || 'instant',
      title: data.title || `${String(data.mode || 'practice').toUpperCase()} Session`,
      subjectId: data.subjectId,
      chapterId: data.chapterId,
      totalQuestions: Number(data.totalQuestions ?? data.questionIds?.length ?? 0),
      correctCount: Number(data.correctCount ?? 0),
      wrongCount: Number(data.wrongCount ?? 0),
      skippedCount: Number(data.skippedCount ?? 0),
      accuracy: Number(data.accuracy ?? 0),
      totalTimeSeconds: totalTime,
      durationSeconds: totalTime,
      startedAt: data.startedAt ?? (isCompleted ? now - totalTime * 1000 : now),
      completedAt: data.completedAt ?? (isCompleted ? now : 0),
      createdAt: now,
      questionIds: data.questionIds || []
    };

    sqlite
      .prepare(
        `INSERT INTO sessions (
          id, mode, title, subject_id, chapter_id, total_questions, correct_count, wrong_count,
          skipped_count, accuracy, total_time_seconds, duration_seconds, started_at, completed_at,
          created_at, question_ids_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        session.id,
        session.mode,
        session.title ?? null,
        session.subjectId ?? null,
        session.chapterId ?? null,
        session.totalQuestions,
        session.correctCount,
        session.wrongCount,
        session.skippedCount ?? 0,
        session.accuracy,
        session.totalTimeSeconds ?? 0,
        session.durationSeconds ?? 0,
        session.startedAt ?? now,
        session.completedAt ?? 0,
        session.createdAt ?? now,
        JSON.stringify(session.questionIds || [])
      );
    res.json(session);
  });

  app.patch('/api/sessions/:id/finish', (req, res) => {
    const correctCount = Number(req.body?.correctCount ?? 0);
    const wrongCount = Number(req.body?.wrongCount ?? 0);
    const durationSeconds = Number(req.body?.durationSeconds ?? 0);
    const total = correctCount + wrongCount;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    sqlite
      .prepare(
        `UPDATE sessions
         SET correct_count = ?, wrong_count = ?, accuracy = ?, completed_at = ?, duration_seconds = ?, total_time_seconds = ?
         WHERE id = ?`
      )
      .run(correctCount, wrongCount, accuracy, Date.now(), durationSeconds, durationSeconds, req.params.id);
    res.json({ ok: true });
  });

  app.get('/api/sessions/recent', (req, res) => {
    const limit = Math.min(Number(req.query.limit || 20), 200);
    const rows = sqlite
      .prepare(
        `SELECT * FROM sessions ORDER BY COALESCE(NULLIF(completed_at, 0), created_at, 0) DESC LIMIT ?`
      )
      .all(limit) as Record<string, any>[];
    res.json(rows.map(mapRowToSession));
  });

  app.delete('/api/sessions', (_req, res) => {
    sqlite.prepare('DELETE FROM sessions').run();
    res.json({ ok: true });
  });

  app.get('/api/stats/system', (_req, res) => {
    res.json(getSystemStatisticsFromDb());
  });

  app.get('/api/stats/weak', (_req, res) => {
    res.json(getWeakQuestionsFromDb());
  });

  // --- Media Files (stored directly on disk in ./data/media/) ---
  app.get('/api/media/find', (req, res) => {
    const cleanName = String(req.query.name || '').toLowerCase().trim();
    if (!cleanName) {
      res.json(null);
      return;
    }
    const row = sqlite
      .prepare('SELECT * FROM media_files WHERE LOWER(TRIM(name)) = ? OR id = ? LIMIT 1')
      .get(cleanName, cleanName) as Record<string, any> | undefined;
    if (!row) {
      res.json(null);
      return;
    }
    res.json({
      id: row.id,
      storagePath: `media/${row.id}`,
      url: `/api/media/${row.id}`,
      altText: row.name,
      caption: '',
      order: 0
    });
  });

  app.get('/api/media/:id', (req, res) => {
    const id = req.params.id.replace(/^media\//, '');
    const row = sqlite
      .prepare('SELECT * FROM media_files WHERE id = ?')
      .get(id) as Record<string, any> | undefined;
    if (!row) {
      res.status(404).send('Media not found');
      return;
    }
    const filePath = path.join(mediaDir, `${row.id}${row.ext || '.webp'}`);
    if (!fs.existsSync(filePath)) {
      res.status(404).send('Media file missing on disk');
      return;
    }
    res.setHeader('Content-Type', row.mime_type || 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.sendFile(filePath);
  });

  app.delete('/api/media/:id', (req, res) => {
    const id = req.params.id.replace(/^media\//, '');
    const row = sqlite.prepare('SELECT * FROM media_files WHERE id = ?').get(id) as Record<string, any> | undefined;
    if (row) {
      const filePath = path.join(mediaDir, `${row.id}${row.ext || '.webp'}`);
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {
        // ignore
      }
      sqlite.prepare('DELETE FROM media_files WHERE id = ?').run(id);
    }
    res.json({ ok: true });
  });

  // --- Export / Import / Reset ---
  app.get('/api/export/json', (_req, res) => {
    const subjects = (sqlite.prepare('SELECT * FROM subjects ORDER BY sort_order ASC').all() as any[]).map(mapRowToSubject);
    const chapters = (sqlite.prepare('SELECT * FROM chapters ORDER BY sort_order ASC').all() as any[]).map(mapRowToChapter);
    const commonInformation = (sqlite.prepare('SELECT * FROM common_information').all() as any[]).map(mapRowToCommonInfo);
    const questions = (sqlite.prepare('SELECT * FROM questions').all() as any[]).map(mapRowToQuestion);
    const attempts = (sqlite.prepare('SELECT * FROM attempts').all() as any[]).map(mapRowToAttempt);
    const sessions = (sqlite.prepare('SELECT * FROM sessions').all() as any[]).map(mapRowToSession);

    const payload = {
      app: 'Fast MCQ Practice',
      version: '2.1',
      exportedAt: new Date().toISOString(),
      subjects,
      chapters,
      commonInformation,
      questions,
      attempts,
      sessions
    };
    const filename = `mcq-questions-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(payload, null, 2));
  });

  app.get('/api/export/history', (_req, res) => {
    const sessions = (sqlite.prepare('SELECT * FROM sessions').all() as any[]).map(mapRowToSession);
    const attempts = (sqlite.prepare('SELECT * FROM attempts').all() as any[]).map(mapRowToAttempt);
    const payload = {
      exportedAt: new Date().toISOString(),
      sessions,
      attempts
    };
    const filename = `mcq-practice-history-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(payload, null, 2));
  });

  app.post('/api/import/history', (req, res) => {
    try {
      const parsed = req.body || {};
      if (!Array.isArray(parsed.sessions) && !Array.isArray(parsed.attempts)) {
        res.status(400).json({ error: 'History backup JSON must contain a "sessions" or "attempts" array' });
        return;
      }

      const sessions: PracticeSession[] = Array.isArray(parsed.sessions) ? parsed.sessions : [];
      const attempts: Attempt[] = Array.isArray(parsed.attempts) ? parsed.attempts : [];

      let sessionsCount = 0;
      let attemptsCount = 0;

      withTransaction(() => {
        const insSess = sqlite.prepare(
          `INSERT OR REPLACE INTO sessions (
            id, mode, title, subject_id, chapter_id, total_questions, correct_count, wrong_count,
            skipped_count, accuracy, total_time_seconds, duration_seconds, started_at, completed_at,
            created_at, question_ids_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const sess of sessions) {
          if (!sess?.id) continue;
          insSess.run(
            sess.id,
            sess.mode || 'instant',
            sess.title ?? null,
            sess.subjectId ?? null,
            sess.chapterId ?? null,
            Number(sess.totalQuestions ?? 0),
            Number(sess.correctCount ?? 0),
            Number(sess.wrongCount ?? 0),
            Number(sess.skippedCount ?? 0),
            Number(sess.accuracy ?? 0),
            Number(sess.totalTimeSeconds ?? sess.durationSeconds ?? 0),
            Number(sess.durationSeconds ?? sess.totalTimeSeconds ?? 0),
            sess.startedAt ?? null,
            sess.completedAt ?? null,
            Number(sess.createdAt ?? Date.now()),
            JSON.stringify(Array.isArray(sess.questionIds) ? sess.questionIds : [])
          );
          sessionsCount++;
        }

        const insAtt = sqlite.prepare(
          `INSERT OR REPLACE INTO attempts (id, question_id, session_id, selected_answer, correct_answer, is_correct, time_spent_seconds, attempted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const att of attempts) {
          if (!att?.id || !att?.questionId) continue;
          insAtt.run(
            att.id,
            att.questionId,
            att.sessionId ?? null,
            att.selectedAnswer ?? '',
            att.correctAnswer ?? null,
            att.isCorrect ? 1 : 0,
            Number(att.timeSpentSeconds ?? 0),
            Number(att.attemptedAt ?? Date.now())
          );
          attemptsCount++;
        }
      });

      res.json({
        sessionsCount,
        attemptsCount
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/questions/clear-additional-data', (req, res) => {
    try {
      const clearAttempts = req.body?.clearAttempts !== false;
      const clearSessions = Boolean(req.body?.clearSessions);
      const clearFlags = Boolean(req.body?.clearFlags);

      let deletedAttempts = 0;
      let deletedSessions = 0;
      let resetFlaggedQuestions = 0;

      withTransaction(() => {
        if (clearAttempts) {
          const info = sqlite.prepare('DELETE FROM attempts').run();
          deletedAttempts = Number(info.changes ?? 0);
        }
        if (clearSessions) {
          const info = sqlite.prepare('DELETE FROM sessions').run();
          deletedSessions = Number(info.changes ?? 0);
        }
        if (clearFlags) {
          const info = sqlite
            .prepare(
              `UPDATE questions
               SET important = 0, very_important = 0, dont_understand = 0, updated_at = ?
               WHERE important != 0 OR very_important != 0 OR dont_understand != 0`
            )
            .run(Date.now());
          resetFlaggedQuestions = Number(info.changes ?? 0);
        }
      });

      res.json({
        ok: true,
        deletedAttempts,
        deletedSessions,
        resetFlaggedQuestions
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/import/json', (req, res) => {
    try {
      const parsed = req.body || {};
      const subjects: Subject[] = parsed.subjects || [];
      const chapters: Chapter[] = parsed.chapters || [];
      const questions: Question[] = parsed.questions || [];
      const commonInformation: CommonInformation[] = parsed.commonInformation || [];
      const attempts: Attempt[] = parsed.attempts || [];
      const sessions: PracticeSession[] = parsed.sessions || [];
      const mediaFiles: { id: string; name: string; mimeType: string; size: number; base64: string; createdAt?: number }[] =
        parsed.mediaFiles || [];

      if (!Array.isArray(questions)) {
        res.status(400).json({ error: 'JSON backup must contain a "questions" array' });
        return;
      }

      withTransaction(() => {
        const insSubj = sqlite.prepare(
          'INSERT OR REPLACE INTO subjects (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)'
        );
        for (const s of subjects) {
          insSubj.run(s.id, s.name, s.order ?? 0, s.createdAt ?? Date.now());
        }

        const insChap = sqlite.prepare(
          'INSERT OR REPLACE INTO chapters (id, subject_id, name, sort_order, created_at) VALUES (?, ?, ?, ?, ?)'
        );
        for (const c of chapters) {
          insChap.run(c.id, c.subjectId, c.name, c.order ?? 0, c.createdAt ?? Date.now());
        }

        const insCi = sqlite.prepare(
          `INSERT OR REPLACE INTO common_information
            (id, title, content, images_json, content_blocks_json, subject_id, chapter_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const ci of commonInformation) {
          insCi.run(
            ci.id,
            ci.title || 'অভিন্ন তথ্য',
            ci.content || '',
            ci.images ? JSON.stringify(ci.images) : null,
            ci.contentBlocks ? JSON.stringify(ci.contentBlocks) : null,
            ci.subjectId,
            ci.chapterId,
            ci.createdAt ?? Date.now(),
            ci.updatedAt ?? Date.now()
          );
        }

        for (const rawQ of questions) {
          const q: any = { ...rawQ };
          if (!q.sources || !Array.isArray(q.sources)) {
            q.sources = [];
            if (q.sourceType || q.sourceName) {
              q.sources.push({ type: q.sourceType || 'Board', name: q.sourceName || '' });
            }
          }
          if (!q.questionType) q.questionType = 'STANDARD';
          delete q.difficulty;
          delete q.tags;
          upsertQuestionRow(q);
        }

        const insSess = sqlite.prepare(
          `INSERT OR REPLACE INTO sessions (
            id, mode, title, subject_id, chapter_id, total_questions, correct_count, wrong_count,
            skipped_count, accuracy, total_time_seconds, duration_seconds, started_at, completed_at,
            created_at, question_ids_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const sess of sessions) {
          insSess.run(
            sess.id,
            sess.mode,
            sess.title ?? null,
            sess.subjectId ?? null,
            sess.chapterId ?? null,
            sess.totalQuestions ?? 0,
            sess.correctCount ?? 0,
            sess.wrongCount ?? 0,
            sess.skippedCount ?? 0,
            sess.accuracy ?? 0,
            sess.totalTimeSeconds ?? 0,
            sess.durationSeconds ?? 0,
            sess.startedAt ?? null,
            sess.completedAt ?? null,
            sess.createdAt ?? Date.now(),
            JSON.stringify(sess.questionIds || [])
          );
        }

        const insAtt = sqlite.prepare(
          `INSERT OR REPLACE INTO attempts (id, question_id, session_id, selected_answer, correct_answer, is_correct, time_spent_seconds, attempted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const att of attempts) {
          insAtt.run(
            att.id,
            att.questionId,
            att.sessionId ?? null,
            att.selectedAnswer,
            att.correctAnswer ?? null,
            att.isCorrect ? 1 : 0,
            att.timeSpentSeconds ?? 0,
            att.attemptedAt ?? Date.now()
          );
        }

        const insMedia = sqlite.prepare(
          'INSERT OR REPLACE INTO media_files (id, name, mime_type, size, ext, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        );
        for (const m of mediaFiles) {
          if (!m?.id || !m?.base64) continue;
          const buf = Buffer.from(m.base64, 'base64');
          const ext = extFromMime(m.mimeType, m.name);
          fs.writeFileSync(path.join(mediaDir, `${m.id}${ext}`), buf);
          insMedia.run(m.id, m.name || 'image', m.mimeType || 'image/webp', buf.length, ext, m.createdAt ?? Date.now());
        }
      });

      res.json({
        subjectsCount: subjects.length,
        chaptersCount: chapters.length,
        questionsCount: questions.length,
        mediaCount: mediaFiles.length
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/db/reset', (_req, res) => {
    withTransaction(() => {
      sqlite.exec(`
        DELETE FROM attempts;
        DELETE FROM sessions;
        DELETE FROM questions;
        DELETE FROM common_information;
        DELETE FROM chapters;
        DELETE FROM subjects;
        DELETE FROM media_files;
      `);
    });
    try {
      const files = fs.readdirSync(mediaDir);
      for (const f of files) {
        fs.unlinkSync(path.join(mediaDir, f));
      }
    } catch {
      // ignore
    }
    res.json({ ok: true });
  });

  // --- Vite / Static Frontend Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const paths = getStoragePaths();
    const pidFile = path.join(paths.dataDir, 'server.pid');
    try {
      fs.writeFileSync(pidFile, String(process.pid), 'utf8');
    } catch {
      // ignore
    }
    const cleanupPid = () => {
      try {
        if (fs.existsSync(pidFile) && fs.readFileSync(pidFile, 'utf8').trim() === String(process.pid)) {
          fs.unlinkSync(pidFile);
        }
      } catch {
        // ignore
      }
    };
    process.on('exit', cleanupPid);
    process.on('SIGINT', () => {
      cleanupPid();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      cleanupPid();
      process.exit(0);
    });

    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`SQLite database: ${paths.dbPath}`);
    console.log(`Media directory: ${paths.mediaDir}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
