import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Plus, 
  ArrowLeft, 
  CheckCircle2, 
  Star, 
  Flame, 
  HelpCircle,
  Tag as TagIcon
} from 'lucide-react';
import { 
  createQuestion, 
  updateQuestion, 
  getQuestionById,
  getAllUniqueTags,
  getAllUniqueSourceNames
} from '../services/questionService';
import { getAllSubjects, getChaptersBySubject } from '../services/subjectService';
import type { Subject, Chapter, Difficulty, SourceType } from '../types';
import type { NavSection } from '../components/layout/Sidebar';

interface AddQuestionPageProps {
  editId?: string;
  onNavigate: (section: NavSection, params?: any) => void;
}

export const AddQuestionPage: React.FC<AddQuestionPageProps> = ({ editId, onNavigate }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
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
  const [sourceType, setSourceType] = useState<SourceType>('Board');
  const [sourceName, setSourceName] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [important, setImportant] = useState(false);
  const [veryImportant, setVeryImportant] = useState(false);
  const [dontUnderstand, setDontUnderstand] = useState(false);

  // Status
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadInit = async () => {
      const [subjs, allTags, allSources] = await Promise.all([
        getAllSubjects(),
        getAllUniqueTags(),
        getAllUniqueSourceNames()
      ]);
      setSubjects(subjs);
      setAvailableTags(allTags);
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
          setSourceType(q.sourceType);
          setSourceName(q.sourceName);
          setDifficulty(q.difficulty);
          setTags(q.tags || []);
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

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim().toLowerCase().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
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
      setError('Question text cannot be empty');
      return false;
    }
    if (!options.A.trim() || !options.B.trim() || !options.C.trim() || !options.D.trim()) {
      setError('All 4 options (A, B, C, D) must have text');
      return false;
    }
    if (!sourceName.trim()) {
      setError('Source name is required (e.g. "Dhaka Board 2024" or "Panjeri Guide")');
      return false;
    }
    setError(null);
    return true;
  };

  const save = async (keepOpen: boolean) => {
    if (!validate()) return;
    setIsSubmitting(true);
    setError(null);

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
          sourceType,
          sourceName: sourceName.trim(),
          difficulty,
          tags,
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
          sourceType,
          sourceName: sourceName.trim(),
          difficulty,
          tags,
          important,
          veryImportant,
          dontUnderstand
        });

        if (keepOpen) {
          setSuccessMsg('Saved! Ready for next question.');
          setQuestion('');
          setOptions({ A: '', B: '', C: '', D: '' });
          setExplanation('');
          // Keep subject, chapter, sourceType, sourceName, tags for fast sequential entry!
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('question-bank')}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {editId ? 'Edit Question' : 'Add Question'}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500">
              {editId ? 'Update question details and metadata' : 'Manual single-question entry'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-7 space-y-6 shadow-xs">
        {/* Subject & Chapter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              Subject *
            </label>
            <select
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
              value={chapterId}
              onChange={e => setChapterId(e.target.value)}
              disabled={chapters.length === 0}
              className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500 disabled:opacity-50"
            >
              {chapters.length === 0 ? (
                <option value="">No chapters created under this subject</option>
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
            Question Text *
          </label>
          <textarea
            rows={3}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Type question statement here..."
            className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500 leading-relaxed"
          />
        </div>

        {/* Options (A, B, C, D) and Correct Answer Picker */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Options (Select radio for correct answer) *
            </label>
            <span className="text-xs text-zinc-400">
              Correct Answer:{' '}
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{correctAnswer}</span>
            </span>
          </div>

          <div className="space-y-2.5">
            {(['A', 'B', 'C', 'D'] as const).map(optKey => {
              const isSelected = correctAnswer === optKey;
              return (
                <div
                  key={optKey}
                  className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-700'
                      : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50'
                  }`}
                >
                  <label className="flex items-center gap-2 cursor-pointer shrink-0 pl-1">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={isSelected}
                      onChange={() => setCorrectAnswer(optKey)}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="w-6 h-6 rounded-md bg-zinc-200 dark:bg-zinc-700 font-bold text-xs flex items-center justify-center text-zinc-800 dark:text-zinc-200">
                      {optKey}
                    </span>
                  </label>

                  <input
                    type="text"
                    value={options[optKey]}
                    onChange={e =>
                      setOptions({ ...options, [optKey]: e.target.value })
                    }
                    placeholder={`Option ${optKey} text`}
                    className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 border-none focus:outline-none px-2 py-1"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
            Explanation / Solution (Optional)
          </label>
          <textarea
            rows={2}
            value={explanation}
            onChange={e => setExplanation(e.target.value)}
            placeholder="Detailed explanation, formula derivation, or hint..."
            className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500 leading-relaxed"
          />
        </div>

        {/* Source and Difficulty */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              Source Type *
            </label>
            <select
              value={sourceType}
              onChange={e => setSourceType(e.target.value as SourceType)}
              className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
            >
              <option value="Board">Board</option>
              <option value="School">School</option>
              <option value="Guide">Guide</option>
              <option value="Model Test">Model Test</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              Source Name *
            </label>
            <input
              type="text"
              list="sourceNameList"
              value={sourceName}
              onChange={e => setSourceName(e.target.value)}
              placeholder="e.g. Dhaka Board 2024"
              className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
            />
            <datalist id="sourceNameList">
              {availableSources.map(s => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value as Difficulty)}
              className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Custom Tags */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
            Tags (e.g. formula, conceptual, calculation, trap)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag(tagInput);
                }
              }}
              placeholder="Type tag and press Add..."
              className="flex-1 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
            />
            <button
              type="button"
              onClick={() => handleAddTag(tagInput)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300"
            >
              Add Tag
            </button>
          </div>

          {tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              {tags.map(t => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                >
                  <TagIcon className="w-3 h-3" />
                  <span>#{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="ml-1 text-indigo-400 hover:text-indigo-700 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Independent Flags (Important, Very Important, Don't Understand) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-2">
            Question Flags (Independent)
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setImportant(!important)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                important
                  ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500'
              }`}
            >
              <Star className={`w-4 h-4 ${important ? 'fill-amber-500 text-amber-500' : ''}`} />
              <span>⭐ Important</span>
            </button>

            <button
              type="button"
              onClick={() => setVeryImportant(!veryImportant)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                veryImportant
                  ? 'bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700'
                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500'
              }`}
            >
              <Flame className={`w-4 h-4 ${veryImportant ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>🔥 Very Important</span>
            </button>

            <button
              type="button"
              onClick={() => setDontUnderstand(!dontUnderstand)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                dontUnderstand
                  ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-700'
                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500'
              }`}
            >
              <HelpCircle className={`w-4 h-4 ${dontUnderstand ? 'text-purple-600' : ''}`} />
              <span>❓ Don&apos;t Understand</span>
            </button>
          </div>
        </div>

        {/* Submit Actions (Prompt 14: Save Question, Save & Add Another, Cancel) */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => onNavigate('question-bank')}
            className="px-4 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Cancel
          </button>

          {!editId && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => save(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Save & Add Another</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => save(false)}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{editId ? 'Update Question' : 'Save Question'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
