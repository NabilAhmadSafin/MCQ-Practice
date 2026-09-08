import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Bookmark,
  Flame,
  FileText,
  ListOrdered,
  Layers,
  Sparkles
} from 'lucide-react';
import { getAllSubjects, getChaptersBySubject } from '../services/subjectService';
import {
  createQuestion,
  updateQuestion,
  getQuestionById,
  getAllUniqueSourceNames
} from '../services/questionService';
import {
  getCommonInfoById,
  createCommonInfo,
  updateCommonInfo
} from '../services/commonInfoService';
import { toRomanNumeral } from '../utils/romanNumerals';
import type { Subject, Chapter, QuestionSource, QuestionType, Question } from '../types';
import { GUIDE_OPTIONS, QUESTION_TYPE_LABELS } from '../types';

interface AddQuestionPageProps {
  editId?: string | null;
  onNavigate: (page: string) => void;
}

interface CommonStemSubQuestion {
  id?: string;
  question: string;
  statements?: string[];
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  important: boolean;
  veryImportant: boolean;
  dontUnderstand: boolean;
}

export const AddQuestionPage: React.FC<AddQuestionPageProps> = ({ editId, onNavigate }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  // Selected Question Type
  const [questionType, setQuestionType] = useState<QuestionType>('STANDARD');
  const [originalQuestionType, setOriginalQuestionType] = useState<QuestionType>('STANDARD');
  const [originalCommonInfoId, setOriginalCommonInfoId] = useState<string | undefined>(undefined);
  const [typeSwitchWarning, setTypeSwitchWarning] = useState<string | null>(null);

  // Curriculum State
  const [subjectId, setSubjectId] = useState('');
  const [chapterId, setChapterId] = useState('');

  // Standard & Multiple Statement State
  const [question, setQuestion] = useState('');
  const [statements, setStatements] = useState<string[]>(['', '', '']);
  const [options, setOptions] = useState<{ A: string; B: string; C: string; D: string }>({
    A: '',
    B: '',
    C: '',
    D: ''
  });
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [explanation, setExplanation] = useState('');

  // Common Stem State
  const [commonInfoId, setCommonInfoId] = useState<string | undefined>(undefined);
  const [commonInfoTitle, setCommonInfoTitle] = useState('অভিন্ন তথ্য ১');
  const [commonInfoContent, setCommonInfoContent] = useState('');
  const [groupQuestions, setGroupQuestions] = useState<CommonStemSubQuestion[]>([
    {
      question: '',
      options: { A: '', B: '', C: '', D: '' },
      correctAnswer: 'A',
      explanation: '',
      important: false,
      veryImportant: false,
      dontUnderstand: false
    },
    {
      question: '',
      options: { A: '', B: '', C: '', D: '' },
      correctAnswer: 'A',
      explanation: '',
      important: false,
      veryImportant: false,
      dontUnderstand: false
    }
  ]);

  // Sources & Flags
  const [sources, setSources] = useState<QuestionSource[]>([
    { type: 'Board', name: '' }
  ]);
  const [important, setImportant] = useState(false);
  const [veryImportant, setVeryImportant] = useState(false);
  const [dontUnderstand, setDontUnderstand] = useState(false);

  // Status State
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
          const qType: QuestionType = q.questionType || 'STANDARD';
          setQuestionType(qType);
          setOriginalQuestionType(qType);
          setOriginalCommonInfoId(q.commonInfoId);

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

          if (q.statements && q.statements.length > 0) {
            setStatements(q.statements);
          }

          if (q.commonInfoId) {
            setCommonInfoId(q.commonInfoId);
            const cInfo = await getCommonInfoById(q.commonInfoId);
            if (cInfo) {
              setCommonInfoTitle(cInfo.title);
              setCommonInfoContent(cInfo.content);
            }
          }

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

  const handleTypeSelect = (newType: QuestionType) => {
    if (originalCommonInfoId && newType !== 'COMMON_STEM' && questionType === 'COMMON_STEM') {
      setTypeSwitchWarning(
        'Warning: Changing from "অভিন্ন তথ্যভিত্তিক" to Standard or Multiple Statement will remove this question\'s link to its shared passage.'
      );
    } else {
      setTypeSwitchWarning(null);
    }
    setQuestionType(newType);
  };

  // Statement handlers (Multiple Statement)
  const handleAddStatement = () => {
    setStatements(prev => [...prev, '']);
  };

  const handleRemoveStatement = (index: number) => {
    if (statements.length <= 2) return;
    setStatements(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleStatementChange = (index: number, val: string) => {
    setStatements(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleApplyDefaultCombinations = () => {
    setOptions({
      A: 'i ও ii',
      B: 'i ও iii',
      C: 'ii ও iii',
      D: 'i, ii ও iii'
    });
  };

  // Common Stem Sub-Question Handlers
  const handleAddGroupQuestion = () => {
    setGroupQuestions(prev => [
      ...prev,
      {
        question: '',
        options: { A: '', B: '', C: '', D: '' },
        correctAnswer: 'A',
        explanation: '',
        important: false,
        veryImportant: false,
        dontUnderstand: false
      }
    ]);
  };

  const handleRemoveGroupQuestion = (index: number) => {
    if (groupQuestions.length <= 1) return;
    setGroupQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateGroupQuestion = (index: number, updates: Partial<CommonStemSubQuestion>) => {
    setGroupQuestions(prev =>
      prev.map((q, idx) => (idx === index ? { ...q, ...updates } : q))
    );
  };

  // Source handlers
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

    const cleanSources = sources.filter(s => s.name.trim());
    if (cleanSources.length === 0) {
      setError('Please provide at least one source name (e.g. Board, School, or Guide)');
      return false;
    }

    if (questionType === 'STANDARD') {
      if (!question.trim()) {
        setError('Question prompt is required');
        return false;
      }
      if (!options.A.trim() || !options.B.trim() || !options.C.trim() || !options.D.trim()) {
        setError('All 4 options (A, B, C, D) must have text');
        return false;
      }
    } else if (questionType === 'MULTIPLE_STATEMENT') {
      if (!question.trim()) {
        setError('Question prompt (e.g. "নিচের কোনটি সঠিক?") is required');
        return false;
      }
      const validStmts = statements.filter(s => s.trim().length > 0);
      if (validStmts.length < 2) {
        setError('Please provide at least 2 non-empty statements (i, ii...)');
        return false;
      }
      if (!options.A.trim() || !options.B.trim() || !options.C.trim() || !options.D.trim()) {
        setError('All 4 options (A, B, C, D) must have text');
        return false;
      }
    } else if (questionType === 'COMMON_STEM') {
      if (!commonInfoContent.trim()) {
        setError('Common Information / Passage text is required');
        return false;
      }
      if (editId) {
        // Editing a single question within a common stem
        if (!question.trim()) {
          setError('Question prompt is required');
          return false;
        }
        if (!options.A.trim() || !options.B.trim() || !options.C.trim() || !options.D.trim()) {
          setError('All 4 options (A, B, C, D) must have text');
          return false;
        }
      } else {
        // Creating new common stem with sub-questions
        if (groupQuestions.length === 0) {
          setError('At least one question is required for this common stem');
          return false;
        }
        for (let i = 0; i < groupQuestions.length; i++) {
          const gq = groupQuestions[i];
          if (!gq.question.trim()) {
            setError(`Question #${i + 1} prompt is missing`);
            return false;
          }
          if (!gq.options.A.trim() || !gq.options.B.trim() || !gq.options.C.trim() || !gq.options.D.trim()) {
            setError(`Question #${i + 1} must have all 4 options (A, B, C, D)`);
            return false;
          }
        }
      }
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
      if (questionType === 'STANDARD') {
        if (editId) {
          await updateQuestion(editId, {
            subjectId,
            chapterId,
            questionType: 'STANDARD',
            commonInfoId: undefined, // Disconnect if previously linked
            statements: undefined,
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
          setSuccessMsg('Standard MCQ updated successfully!');
          setTimeout(() => onNavigate('question-bank'), 700);
        } else {
          await createQuestion({
            subjectId,
            chapterId,
            questionType: 'STANDARD',
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
      } else if (questionType === 'MULTIPLE_STATEMENT') {
        const cleanStatements = statements.map(s => s.trim()).filter(Boolean);

        if (editId) {
          await updateQuestion(editId, {
            subjectId,
            chapterId,
            questionType: 'MULTIPLE_STATEMENT',
            commonInfoId: undefined,
            statements: cleanStatements,
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
          setSuccessMsg('বহুপদী সমাপ্তিসূচক MCQ updated successfully!');
          setTimeout(() => onNavigate('question-bank'), 700);
        } else {
          await createQuestion({
            subjectId,
            chapterId,
            questionType: 'MULTIPLE_STATEMENT',
            statements: cleanStatements,
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
            setStatements(['', '', '']);
            setOptions({ A: '', B: '', C: '', D: '' });
            setExplanation('');
            setTimeout(() => setSuccessMsg(null), 2500);
          } else {
            setSuccessMsg('Question saved successfully!');
            setTimeout(() => onNavigate('question-bank'), 600);
          }
        }
      } else if (questionType === 'COMMON_STEM') {
        if (editId) {
          // Update the common information passage
          let cId = commonInfoId;
          if (cId) {
            await updateCommonInfo(cId, {
              title: commonInfoTitle.trim() || 'অভিন্ন তথ্য',
              content: commonInfoContent.trim(),
              subjectId,
              chapterId
            });
          } else {
            const createdInfo = await createCommonInfo({
              title: commonInfoTitle.trim() || 'অভিন্ন তথ্য',
              content: commonInfoContent.trim(),
              subjectId,
              chapterId
            });
            cId = createdInfo.id;
          }

          // Update this question
          await updateQuestion(editId, {
            subjectId,
            chapterId,
            questionType: 'COMMON_STEM',
            commonInfoId: cId,
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

          setSuccessMsg('অভিন্ন তথ্যভিত্তিক MCQ updated successfully!');
          setTimeout(() => onNavigate('question-bank'), 700);
        } else {
          // Create 1 CommonInformation record and multiple questions linked to it
          const createdInfo = await createCommonInfo({
            title: commonInfoTitle.trim() || 'অভিন্ন তথ্য ১',
            content: commonInfoContent.trim(),
            subjectId,
            chapterId
          });

          for (const gq of groupQuestions) {
            await createQuestion({
              subjectId,
              chapterId,
              questionType: 'COMMON_STEM',
              commonInfoId: createdInfo.id,
              question: gq.question.trim(),
              options: {
                A: gq.options.A.trim(),
                B: gq.options.B.trim(),
                C: gq.options.C.trim(),
                D: gq.options.D.trim()
              },
              correctAnswer: gq.correctAnswer,
              explanation: gq.explanation?.trim() || undefined,
              sources: validSources,
              important: gq.important,
              veryImportant: gq.veryImportant,
              dontUnderstand: gq.dontUnderstand
            });
          }

          if (keepOpen) {
            setSuccessMsg(`Created stem with ${groupQuestions.length} questions! Ready for next.`);
            setCommonInfoTitle('অভিন্ন তথ্য');
            setCommonInfoContent('');
            setGroupQuestions([
              {
                question: '',
                options: { A: '', B: '', C: '', D: '' },
                correctAnswer: 'A',
                explanation: '',
                important: false,
                veryImportant: false,
                dontUnderstand: false
              },
              {
                question: '',
                options: { A: '', B: '', C: '', D: '' },
                correctAnswer: 'A',
                explanation: '',
                important: false,
                veryImportant: false,
                dontUnderstand: false
              }
            ]);
            setTimeout(() => setSuccessMsg(null), 2500);
          } else {
            setSuccessMsg(`Saved common stem group (${groupQuestions.length} questions)!`);
            setTimeout(() => onNavigate('question-bank'), 600);
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save question');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
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
              {editId
                ? 'Modify question details, statements, or shared information'
                : 'Create and catalog standard, multiple statement, or common stem MCQs'}
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

      {/* Messages & Warnings */}
      {typeSwitchWarning && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600" />
          <span>{typeSwitchWarning}</span>
        </div>
      )}
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

      {/* QUESTION TYPE SELECTOR */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-3 shadow-xs">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
            Question Type / প্রশ্নের ধরন *
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Select the format matching standard, multiple-statement, or shared stem exam questions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Standard */}
          <button
            type="button"
            onClick={() => handleTypeSelect('STANDARD')}
            className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
              questionType === 'STANDARD'
                ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-600'
                : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200'
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                questionType === 'STANDARD'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold">Standard MCQ</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Standard single question with 4 options
              </div>
            </div>
          </button>

          {/* Multiple Statement */}
          <button
            type="button"
            onClick={() => handleTypeSelect('MULTIPLE_STATEMENT')}
            className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
              questionType === 'MULTIPLE_STATEMENT'
                ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-600'
                : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200'
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                questionType === 'MULTIPLE_STATEMENT'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold">বহুপদী সমাপ্তিসূচক</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Multiple statements (i, ii, iii) with combined options
              </div>
            </div>
          </button>

          {/* Common Stem */}
          <button
            type="button"
            onClick={() => handleTypeSelect('COMMON_STEM')}
            className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
              questionType === 'COMMON_STEM'
                ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 ring-1 ring-indigo-600'
                : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200'
            }`}
          >
            <div
              className={`p-2 rounded-lg ${
                questionType === 'COMMON_STEM'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold">অভিন্ন তথ্যভিত্তিক</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Shared passage/stimulus with connected questions
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* CURRICULUM SECTION (Subject & Chapter) */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-xs">
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
      </div>

      {/* COMMON STEM PASSAGE FORM (When Question Type is COMMON_STEM) */}
      {questionType === 'COMMON_STEM' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border-2 border-indigo-200 dark:border-indigo-900/60 p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <Layers className="w-5 h-5" />
            <h2 className="text-base font-bold">অভিন্ন তথ্য / উদ্দীপক (Common Stem Information)</h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            এই তথ্য বা উদ্দীপকটি একাধিক প্রশ্নের জন্য একবারই সংরক্ষিত হবে এবং অনুশীলনের সময় উপরে প্রদর্শিত হবে।
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              Title / শিরোনাম (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={commonInfoTitle}
              onChange={e => setCommonInfoTitle(e.target.value)}
              placeholder="e.g. অভিন্ন তথ্য ১ বা উদ্দীপক ১"
              className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
              Passage / Scenario / Information Content *
            </label>
            <textarea
              rows={4}
              value={commonInfoContent}
              onChange={e => setCommonInfoContent(e.target.value)}
              placeholder="উদ্দীপক বা সাধারণ তথ্যটি এখানে লিখুন... যেমন: একটি বস্তুর ভর 5 kg এবং তার বেগ 10 m/s..."
              className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500 leading-relaxed font-sans"
            />
          </div>
        </div>
      )}

      {/* MULTIPLE STATEMENT STATEMENTS LIST (When Question Type is MULTIPLE_STATEMENT) */}
      {questionType === 'MULTIPLE_STATEMENT' && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                বিবৃতিসমূহ (Statements) - i, ii, iii... *
              </label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Add each statement. They are automatically numbered using Roman numerals (i, ii, iii...).
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddStatement}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Statement
            </button>
          </div>

          <div className="space-y-3">
            {statements.map((stmt, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold font-mono text-xs flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
                  {toRomanNumeral(idx + 1)}.
                </span>
                <input
                  type="text"
                  value={stmt}
                  onChange={e => handleStatementChange(idx, e.target.value)}
                  placeholder={`Statement ${toRomanNumeral(idx + 1)} text...`}
                  className="flex-1 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveStatement(idx)}
                  disabled={statements.length <= 2}
                  className="p-2 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-30 disabled:pointer-events-none"
                  title="Remove statement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Quick preset helper button for standard options */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={handleApplyDefaultCombinations}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Fill standard options (i ও ii, i ও iii, ii ও iii, i, ii ও iii)
            </button>
          </div>
        </div>
      )}

      {/* QUESTIONS SECTION */}
      {/* If COMMON_STEM and in create mode: show multi-question group editor */}
      {questionType === 'COMMON_STEM' && !editId ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between pt-2">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                উদ্দীপকভিত্তিক প্রশ্নসমূহ (Questions for this Stimulus)
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Add each individual question that belongs to this shared passage. Each MCQ is tracked separately.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddGroupQuestion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Question
            </button>
          </div>

          {groupQuestions.map((gq, qIdx) => (
            <div
              key={qIdx}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-5 shadow-xs relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  প্রশ্ন #{qIdx + 1}
                </span>

                {groupQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveGroupQuestion(qIdx)}
                    className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Question
                  </button>
                )}
              </div>

              {/* Sub-Question Prompt */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                  Question Prompt *
                </label>
                <textarea
                  rows={2}
                  value={gq.question}
                  onChange={e => handleUpdateGroupQuestion(qIdx, { question: e.target.value })}
                  placeholder={`Question #${qIdx + 1} prompt...`}
                  className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-3 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
                />
              </div>

              {/* Sub-Question Options */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                  Options & Correct Answer *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(['A', 'B', 'C', 'D'] as const).map(optKey => {
                    const isSelected = gq.correctAnswer === optKey;
                    return (
                      <div
                        key={optKey}
                        className={`flex items-start gap-2.5 p-3 rounded-lg border transition ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer mt-1 shrink-0">
                          <input
                            type="radio"
                            name={`correctAnswer_group_${qIdx}`}
                            checked={isSelected}
                            onChange={() => handleUpdateGroupQuestion(qIdx, { correctAnswer: optKey })}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-zinc-300 dark:border-zinc-700"
                          />
                          <span className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
                            {optKey}
                          </span>
                        </label>
                        <textarea
                          rows={2}
                          value={gq.options[optKey]}
                          onChange={e =>
                            handleUpdateGroupQuestion(qIdx, {
                              options: { ...gq.options, [optKey]: e.target.value }
                            })
                          }
                          placeholder={`Option ${optKey} text...`}
                          className="flex-1 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500 resize-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-Question Explanation */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                  Explanation (Optional)
                </label>
                <input
                  type="text"
                  value={gq.explanation || ''}
                  onChange={e => handleUpdateGroupQuestion(qIdx, { explanation: e.target.value })}
                  placeholder="Explanation or derivation for this specific question..."
                  className="w-full text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
                />
              </div>

              {/* Sub-Question Flags */}
              <div className="flex items-center gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <label className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gq.important}
                    onChange={e => handleUpdateGroupQuestion(qIdx, { important: e.target.checked })}
                    className="rounded text-amber-500 focus:ring-amber-500 border-zinc-300 dark:border-zinc-700"
                  />
                  <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                  Important
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gq.veryImportant}
                    onChange={e => handleUpdateGroupQuestion(qIdx, { veryImportant: e.target.checked })}
                    className="rounded text-rose-500 focus:ring-rose-500 border-zinc-300 dark:border-zinc-700"
                  />
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  Very Important
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gq.dontUnderstand}
                    onChange={e => handleUpdateGroupQuestion(qIdx, { dontUnderstand: e.target.checked })}
                    className="rounded text-purple-500 focus:ring-purple-500 border-zinc-300 dark:border-zinc-700"
                  />
                  <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
                  Don't Understand
                </label>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* STANDARD, MULTIPLE_STATEMENT, or COMMON_STEM in single-edit mode */
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6 shadow-xs">
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
              placeholder={
                questionType === 'MULTIPLE_STATEMENT'
                  ? 'e.g. নিচের কোনটি সঠিক? বা প্রদত্ত তথ্যের আলোকে কোনটি সত্য?'
                  : 'Type your multiple choice question prompt here...'
              }
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
                    <label className="flex items-center gap-2 cursor-pointer mt-1 shrink-0">
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

          {/* Status & Priority Flags */}
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={important}
                onChange={e => setImportant(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-500 border-zinc-300 dark:border-zinc-700"
              />
              <Bookmark className="w-4 h-4 text-amber-500" />
              Mark Important
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={veryImportant}
                onChange={e => setVeryImportant(e.target.checked)}
                className="rounded text-rose-500 focus:ring-rose-500 border-zinc-300 dark:border-zinc-700"
              />
              <Flame className="w-4 h-4 text-rose-500" />
              Mark Very Important
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={dontUnderstand}
                onChange={e => setDontUnderstand(e.target.checked)}
                className="rounded text-purple-500 focus:ring-purple-500 border-zinc-300 dark:border-zinc-700"
              />
              <HelpCircle className="w-4 h-4 text-purple-500" />
              Mark Don't Understand
            </label>
          </div>
        </div>
      )}

      {/* MULTIPLE SOURCES SECTION */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Sources ({sources.length}) *
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Add one or multiple sources (Board, School, or Guide like Panjaree, Lecture, Lecture Supplement, Royal, Chorcha, eProshnobank).
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
                <div className="w-full sm:w-32 shrink-0">
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
                        ? 'e.g. Dhaka Board 2024'
                        : src.type === 'School'
                        ? 'e.g. Notre Dame College'
                        : 'e.g. Panjaree, Lecture...'
                    }
                    className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
                  />
                  <datalist id={`srcList-${idx}`}>
                    {src.type === 'Guide' ? (
                      GUIDE_OPTIONS.map(g => <option key={g} value={g} />)
                    ) : (
                      availableSources.map(s => <option key={s} value={s} />)
                    )}
                  </datalist>
                </div>

                {src.type === 'Guide' && (
                  <div className="w-full sm:w-28 shrink-0">
                    <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                      Entry / Q No.
                    </label>
                    <input
                      type="text"
                      value={src.entryNo || ''}
                      onChange={e => handleUpdateSource(idx, { entryNo: e.target.value })}
                      placeholder="e.g. 142"
                      className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500 font-mono"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveSource(idx)}
                  className="p-1.5 mt-5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                  title="Remove source"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
