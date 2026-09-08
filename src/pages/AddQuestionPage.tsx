import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Star,
  Flame,
  Bookmark
} from 'lucide-react';
import { getAllSubjects, getChaptersBySubject } from '../services/subjectService';
import { createQuestion, updateQuestion, getQuestionById, getAllUniqueSourceNames } from '../services/questionService';
import type { Subject, Chapter, QuestionSource, CorrectAnswer } from '../types';
import { GUIDE_OPTIONS } from '../types';

interface AddQuestionPageProps {
  editId?: string | null;
  onNavigate: (page: string) => void;
}

export const AddQuestionPage: React.FC<AddQuestionPageProps> = ({ editId, onNavigate }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  // Form state
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<{ A: string; B: string; C: string; D: string }>({
    A: '',
    B: '',
    C: '',
    D: ''
  });
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [explanation, setExplanation] = useState('');

  // Multiple sources state
  const [sources, setSources] = useState<QuestionSource[]>([
    { type: 'Board', name: '' }
  ]);

  const [important, setImportant] = useState(false);
  const [veryImportant, setVeryImportant] = useState(false);
  const [dontUnderstand, setDontUnderstand] = useState(false);

  // Status
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadInit = async () => {
      const [subjs, allSources] = await Promise.all([
        getAllSubjects(),
        getAllUniqueSourceNames()
      ]);
      setSubjects(subjs);
      setAvailableSources(allSources);

      if (editId) {
        const q = await getQuestionById(editId);
        if (q) {
          setSubjectId(q.subjectId);
          const chaps = await getChaptersBySubject(q.subjectId);
          setChapters(chaps);
          setChapterId(q.chapterId);
          setQuestion(q.question);
          setOptions({
            A: q.options['A'] || '',
            B: q.options['B'] || '',
            C: q.options['C'] || '',
            D: q.options['D'] || ''
          });
          setCorrectAnswer((q.correctAnswer as any) || 'A');
          setExplanation(q.explanation || '');

          if (q.sources && q.sources.length > 0) {
            setSources(q.sources);
          } else if (q.sourceType || q.sourceName) {
            setSources([{ type: q.sourceType || 'Board', name: q.sourceName || '' }]);
          } else {
            setSources([{ type: 'Board', name: '' }]);
          }

          setImportant(q.important);
          setVeryImportant(q.veryImportant);
          setDontUnderstand(q.dontUnderstand);
        }
      } else if (subjs.length > 0) {
        setSubjectId(subjs[0].id);
        const chaps = await getChaptersBySubject(subjs[0].id);
        setChapters(chaps);
        if (chaps.length > 0) setChapterId(chaps[0].id);
      }
    };
    loadInit();
  }, [editId]);

  const handleSubjectChange = async (newSubjId: string) => {
    setSubjectId(newSubjId);
    const chaps = await getChaptersBySubject(newSubjId);
    setChapters(chaps);
    if (chaps.length > 0) setChapterId(chaps[0].id);
    else setChapterId('');
  };

  const handleAddSource = () => {
    setSources(prev => [...prev, { type: 'Board', name: '' }]);
  };

  const handleRemoveSource = (index: number) => {
    if (sources.length <= 1) {
      setSources([{ type: 'Board', name: '' }]);
      return;
    }
    setSources(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateSource = (index: number, updates: Partial<QuestionSource>) => {
    setSources(prev =>
      prev.map((s, idx) => (idx === index ? { ...s, ...updates } : s))
    );
  };

  const validate = (): boolean => {
    if (!subjectId) {
      setError('Please select a subject');
      return false;
    }
    if (!chapterId) {
      setError('Please select a chapter');
      return false;
    }
    if (!question.trim()) {
      setError('Question prompt is required');
      return false;
    }
    if (!options.A.trim() || !options.B.trim() || !options.C.trim() || !options.D.trim()) {
      setError('All 4 options (A, B, C, D) must have text');
      return false;
    }
    const cleanSources = sources.filter(s => s.name.trim());
    if (cleanSources.length === 0) {
      setError('Please provide at least one source name (e.g. Board, School, or Guide)');
      return false;
    }
    setError(null);
    return true;
  };

  const save = async (keepOpen: boolean) => {
    if (!validate()) return;
    setIsSubmitting(true);
    setError(null);

    const validSources = sources.filter(s => s.name.trim());

    try {
      if (editId) {
        await updateQuestion(editId, {
          subjectId,
          chapterId,
          question: question.trim(),
          options: {
            A: options.A.trim(),
            B: options.B.trim(),
            C: options.C.trim(),
            D: options.D.trim()
          },
          correctAnswer,
          explanation: explanation.trim() || undefined,
          sources: validSources,
          important,
          veryImportant,
          dontUnderstand
        });
        setSuccessMsg('Question updated successfully!');
        setTimeout(() => onNavigate('question-bank'), 700);
      } else {
        await createQuestion({
          subjectId,
          chapterId,
          question: question.trim(),
          options: {
            A: options.A.trim(),
            B: options.B.trim(),
            C: options.C.trim(),
            D: options.D.trim()
          },
          correctAnswer,
          explanation: explanation.trim() || undefined,
          sources: validSources,
          important,
          veryImportant,
          dontUnderstand
        });

        if (keepOpen) {
          setSuccessMsg('Saved! Ready for next question.');
          setQuestion('');
          setOptions({ A: '', B: '', C: '', D: '' });
          setExplanation('');
          setTimeout(() => setSuccessMsg(null), 2500);
        } else {
          setSuccessMsg('Question saved successfully!');
          setTimeout(() => onNavigate('question-bank'), 600);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            id="back-to-bank-btn"
            onClick={() => onNavigate('question-bank')}
            className="p-2 rounded-lg text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            title="Back to Question Bank"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {editId ? 'Edit Question' : 'Add New Question'}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {editId ? 'Modify question details and sources' : 'Create and catalog a multiple choice question'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!editId && (
            <button
              id="save-and-add-another-btn"
              disabled={isSubmitting}
              onClick={() => save(true)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 transition disabled:opacity-50"
            >
              Save & Add Another
            </button>
          )}
          <button
            id="save-question-btn"
            disabled={isSubmitting}
            onClick={() => save(false)}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{editId ? 'Save Changes' : 'Save Question'}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6 shadow-sm">
        {/* Curriculum Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              Subject *
            </label>
            <select
              id="select-subject"
              value={subjectId}
              onChange={e => handleSubjectChange(e.target.value)}
              className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              Chapter *
            </label>
            <select
              id="select-chapter"
              value={chapterId}
              onChange={e => setChapterId(e.target.value)}
              disabled={chapters.length === 0}
              className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500 disabled:opacity-50"
            >
              {chapters.length === 0 ? (
                <option value="">No chapters in this subject</option>
              ) : (
                chapters.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
            Question Prompt *
          </label>
          <textarea
            id="input-question-text"
            rows={3}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Type your multiple choice question prompt here..."
            className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
          />
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            Options & Correct Answer *
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Select the radio button beside the option that is the correct answer.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['A', 'B', 'C', 'D'] as const).map(optKey => {
              const isSelected = correctAnswer === optKey;
              return (
                <div
                  key={optKey}
                  className={`flex items-start gap-2.5 p-3 rounded-lg border transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60'
                  }`}
                >
                  <label className="flex items-center gap-2 cursor-pointer mt-1 flex-shrink-0">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={isSelected}
                      onChange={() => setCorrectAnswer(optKey)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700"
                    />
                    <span className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
                      {optKey}
                    </span>
                  </label>
                  <textarea
                    rows={2}
                    value={options[optKey]}
                    onChange={e =>
                      setOptions(prev => ({ ...prev, [optKey]: e.target.value }))
                    }
                    placeholder={`Option ${optKey} text...`}
                    className="flex-1 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500 resize-none"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
            Explanation / Solution Notes (Optional)
          </label>
          <textarea
            id="input-explanation"
            rows={2}
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            placeholder="Detailed explanation, formula derivation, or reference..."
            className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
          />
        </div>

        {/* MULTIPLE SOURCES SECTION */}
        <div className="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Sources ({sources.length})
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Add one or multiple sources (Board, School, or Guide like Panjaree, Lecture, Royal, Chorcha, eProshnobank).
              </p>
            </div>
            <button
              type="button"
              id="add-source-btn"
              onClick={handleAddSource}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Source
            </button>
          </div>

          <div className="space-y-3">
            {sources.map((src, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/50 space-y-2"
              >
                <div className="flex flex-wrap sm:flex-nowrap items-start gap-2">
                  <div className="w-full sm:w-32 flex-shrink-0">
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Type
                    </label>
                    <select
                      value={src.type}
                      onChange={e => handleUpdateSource(idx, { type: e.target.value })}
                      className="w-full text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
                    >
                      <option value="Board">Board</option>
                      <option value="School">School</option>
                      <option value="Guide">Guide</option>
                    </select>
                  </div>

                  <div className="flex-1 min-w-[170px]">
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      {src.type === 'Board'
                        ? 'Board Exam / Year'
                        : src.type === 'School'
                        ? 'College / School Name'
                        : 'Guide Name'}
                    </label>
                    <input
                      type="text"
                      list={`srcList-${idx}`}
                      value={src.name}
                      onChange={e => handleUpdateSource(idx, { name: e.target.value })}
                      placeholder={
                        src.type === 'Board'
                          ? 'e.g. Dhaka Board 2024, Rajshahi Board 2023'
                          : src.type === 'School'
                          ? 'e.g. Notre Dame College, Viqarunnisa Noon School'
                          : 'e.g. Panjaree, Lecture, Royal, Chorcha, eProshnobank'
                      }
                      className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
                    />
                    <datalist id={`srcList-${idx}`}>
                      {availableSources.map(s => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>

                  {src.type === 'Guide' && (
                    <div className="w-28 sm:w-32 flex-shrink-0">
                      <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                        Entry No.
                      </label>
                      <input
                        type="text"
                        value={src.entryNo || ''}
                        onChange={e => handleUpdateSource(idx, { entryNo: e.target.value })}
                        placeholder="e.g. 142"
                        className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500 font-mono"
                      />
                    </div>
                  )}

                  <div className="flex-shrink-0 self-end pb-0.5">
                    <button
                      type="button"
                      onClick={() => handleRemoveSource(idx)}
                      className="p-1.5 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Remove source"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Quick guide selection pills if Guide type is selected */}
                {src.type === 'Guide' && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Quick select guide:
                    </span>
                    {GUIDE_OPTIONS.map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleUpdateSource(idx, { name: g })}
                        className={`text-xs px-2.5 py-0.5 rounded-full border transition font-medium ${
                          src.name.toLowerCase() === g.toLowerCase()
                            ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-700'
                            : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Question Flags */}
        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-2">
            Flags & Study Bookmarks
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              id="flag-important-toggle"
              onClick={() => setImportant(!important)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                important
                  ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${important ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>Important</span>
            </button>

            <button
              type="button"
              id="flag-very-important-toggle"
              onClick={() => setVeryImportant(!veryImportant)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                veryImportant
                  ? 'border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Flame className={`w-3.5 h-3.5 ${veryImportant ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>Very Important</span>
            </button>

            <button
              type="button"
              id="flag-dont-understand-toggle"
              onClick={() => setDontUnderstand(!dontUnderstand)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition ${
                dontUnderstand
                  ? 'border-purple-400 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-700'
                  : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Don't Understand</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
