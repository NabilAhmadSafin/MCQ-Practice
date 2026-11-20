import React, { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Eye,
  EyeOff,
  Image as ImageIcon,
  X
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
import type { Subject, Chapter, QuestionSource, QuestionType, Question, QuestionImage } from '../types';
import { GUIDE_OPTIONS, QUESTION_TYPE_LABELS } from '../types';
import { ImageUploader } from '../components/common/ImageUploader';
import { MathChemistryToolbar } from '../components/common/MathChemistryToolbar';
import { RichContentRenderer } from '../components/common/RichContentRenderer';
import { validateImageFile, storeImage, deleteMediaFile } from '../services/imageStorageService';
import type { NavSection } from '../components/layout/Sidebar';

interface AddQuestionPageProps {
  editId?: string | null;
  initialSubjectId?: string;
  onNavigate: (page: NavSection, params?: any) => void;
}

interface CommonStemSubQuestion {
  id?: string;
  question: string;
  images?: QuestionImage[];
  statements?: string[];
  options: { A: string; B: string; C: string; D: string };
  optionImages?: Record<string, QuestionImage>;
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  explanationImages?: QuestionImage[];
  important: boolean;
  veryImportant: boolean;
  dontUnderstand: boolean;
}

export const AddQuestionPage: React.FC<AddQuestionPageProps> = ({
  editId,
  initialSubjectId,
  onNavigate
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  // Selected Question Type
  const [questionType, setQuestionType] = useState<QuestionType>('STANDARD');
  const [originalQuestionType, setOriginalQuestionType] = useState<QuestionType>('STANDARD');
  const [originalCommonInfoId, setOriginalCommonInfoId] = useState<string | undefined>(undefined);
  const [typeSwitchWarning, setTypeSwitchWarning] = useState<string | null>(null);

  // Curriculum State
  const [subjectId, setSubjectId] = useState(initialSubjectId || '');
  const [chapterId, setChapterId] = useState('');

  // Standard & Multiple Statement State
  const [question, setQuestion] = useState('');
  const [images, setImages] = useState<QuestionImage[]>([]);
  const [statements, setStatements] = useState<string[]>(['', '', '']);
  const [options, setOptions] = useState<{ A: string; B: string; C: string; D: string }>({
    A: '',
    B: '',
    C: '',
    D: ''
  });
  const [optionImages, setOptionImages] = useState<Record<string, QuestionImage>>({});
  const [correctAnswer, setCorrectAnswer] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [explanation, setExplanation] = useState('');
  const [explanationImages, setExplanationImages] = useState<QuestionImage[]>([]);

  // Live Preview Mode Toggle
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Common Stem State
  const [commonInfoId, setCommonInfoId] = useState<string | undefined>(undefined);
  const [commonInfoTitle, setCommonInfoTitle] = useState('অভিন্ন তথ্য ১');
  const [commonInfoContent, setCommonInfoContent] = useState('');
  const [commonInfoImages, setCommonInfoImages] = useState<QuestionImage[]>([]);
  const [groupQuestions, setGroupQuestions] = useState<CommonStemSubQuestion[]>([
    {
      question: '',
      images: [],
      options: { A: '', B: '', C: '', D: '' },
      optionImages: {},
      correctAnswer: 'A',
      explanation: '',
      explanationImages: [],
      important: false,
      veryImportant: false,
      dontUnderstand: false
    },
    {
      question: '',
      images: [],
      options: { A: '', B: '', C: '', D: '' },
      optionImages: {},
      correctAnswer: 'A',
      explanation: '',
      explanationImages: [],
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
          setImages(q.images || []);
          setOptions({
            A: q.options['A'] || '',
            B: q.options['B'] || '',
            C: q.options['C'] || '',
            D: q.options['D'] || ''
          });
          setOptionImages(q.optionImages || {});
          setCorrectAnswer((q.correctAnswer as any) || 'A');
          setExplanation(q.explanation || '');
          setExplanationImages(q.explanationImages || []);

          if (q.statements && q.statements.length > 0) {
            setStatements(q.statements);
          }

          if (q.commonInfoId) {
            setCommonInfoId(q.commonInfoId);
            const cInfo = await getCommonInfoById(q.commonInfoId);
            if (cInfo) {
              setCommonInfoTitle(cInfo.title);
              setCommonInfoContent(cInfo.content);
              setCommonInfoImages(cInfo.images || []);
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
        const preferredId =
          initialSubjectId && subjs.some(s => s.id === initialSubjectId)
            ? initialSubjectId
            : subjs[0].id;
        setSubjectId(preferredId);
        const chaps = await getChaptersBySubject(preferredId);
        setChapters(chaps);
        if (chaps.length > 0) setChapterId(chaps[0].id);
      }
    };
    loadInit();
  }, [editId, initialSubjectId]);

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

  // Math & Chemistry quick insertion helpers
  const handleInsertMathToQuestion = (latex: string, displayMode?: boolean) => {
    const formatted = displayMode ? `\n\\[${latex}\\]\n` : ` $${latex}$ `;
    setQuestion(prev => (prev ? `${prev}${formatted}` : formatted.trim()));
  };

  const handleInsertChemToQuestion = (chem: string, _isReaction?: boolean) => {
    const formatted = ` [chem]${chem}[/chem] `;
    setQuestion(prev => (prev ? `${prev}${formatted}` : formatted.trim()));
  };

  const handleOptionImageUpload = async (optKey: string, file: File) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid image file.');
      return;
    }
    try {
      const stored = await storeImage(file, `option_${optKey}_${file.name}`);
      setOptionImages(prev => ({ ...prev, [optKey]: stored }));
    } catch (err: any) {
      setError(err.message || 'Error uploading option image.');
    }
  };

  const handleRemoveOptionImage = async (optKey: string) => {
    const img = optionImages[optKey];
    if (img?.id) {
      await deleteMediaFile(img.id).catch(() => {});
    }
    setOptionImages(prev => {
      const copy = { ...prev };
      delete copy[optKey];
      return copy;
    });
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
            images,
            options: {
              A: options.A.trim(),
              B: options.B.trim(),
              C: options.C.trim(),
              D: options.D.trim()
            },
            optionImages,
            correctAnswer,
            explanation: explanation.trim() || undefined,
            explanationImages,
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
            images,
            options: {
              A: options.A.trim(),
              B: options.B.trim(),
              C: options.C.trim(),
              D: options.D.trim()
            },
            optionImages,
            correctAnswer,
            explanation: explanation.trim() || undefined,
            explanationImages,
            sources: validSources,
            important,
            veryImportant,
            dontUnderstand
          });

          if (keepOpen) {
            setSuccessMsg('Saved! Ready for next question.');
            setQuestion('');
            setImages([]);
            setOptions({ A: '', B: '', C: '', D: '' });
            setOptionImages({});
            setExplanation('');
            setExplanationImages([]);
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
            images,
            options: {
              A: options.A.trim(),
              B: options.B.trim(),
              C: options.C.trim(),
              D: options.D.trim()
            },
            optionImages,
            correctAnswer,
            explanation: explanation.trim() || undefined,
            explanationImages,
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
            images,
            options: {
              A: options.A.trim(),
              B: options.B.trim(),
              C: options.C.trim(),
              D: options.D.trim()
            },
            optionImages,
            correctAnswer,
            explanation: explanation.trim() || undefined,
            explanationImages,
            sources: validSources,
            important,
            veryImportant,
            dontUnderstand
          });

          if (keepOpen) {
            setSuccessMsg('Saved! Ready for next question.');
            setQuestion('');
            setImages([]);
            setStatements(['', '', '']);
            setOptions({ A: '', B: '', C: '', D: '' });
            setOptionImages({});
            setExplanation('');
            setExplanationImages([]);
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
              images: commonInfoImages,
              subjectId,
              chapterId
            });
          } else {
            const createdInfo = await createCommonInfo({
              title: commonInfoTitle.trim() || 'অভিন্ন তথ্য',
              content: commonInfoContent.trim(),
              images: commonInfoImages,
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
            images,
            options: {
              A: options.A.trim(),
              B: options.B.trim(),
              C: options.C.trim(),
              D: options.D.trim()
            },
            optionImages,
            correctAnswer,
            explanation: explanation.trim() || undefined,
            explanationImages,
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
            images: commonInfoImages,
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
              images: gq.images || [],
              options: {
                A: gq.options.A.trim(),
                B: gq.options.B.trim(),
                C: gq.options.C.trim(),
                D: gq.options.D.trim()
              },
              optionImages: gq.optionImages,
              correctAnswer: gq.correctAnswer,
              explanation: gq.explanation?.trim() || undefined,
              explanationImages: gq.explanationImages || [],
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
            setCommonInfoImages([]);
            setGroupQuestions([
              {
                question: '',
                images: [],
                options: { A: '', B: '', C: '', D: '' },
                optionImages: {},
                correctAnswer: 'A',
                explanation: '',
                explanationImages: [],
                important: false,
                veryImportant: false,
                dontUnderstand: false
              },
              {
                question: '',
                images: [],
                options: { A: '', B: '', C: '', D: '' },
                optionImages: {},
                correctAnswer: 'A',
                explanation: '',
                explanationImages: [],
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-lc-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[var(--lc-border)]">
        <div className="flex items-center gap-3">
          <button
            id="back-to-bank-btn"
            onClick={() => onNavigate('question-bank')}
            className="lc-btn-ghost p-2"
            title="Back to Question Bank"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--lc-text)]">
              {editId ? 'Edit Question' : 'Add New Question'}
            </h1>
            <p className="text-sm text-[var(--lc-text-secondary)] mt-0.5">
              {editId
                ? 'Modify question details, statements, or shared information'
                : 'Create and catalog standard, multiple statement, or common stem MCQs'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowLivePreview(prev => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-sm transition ${
              showLivePreview
                ? 'lc-btn-secondary border-[var(--lc-accent-border)] bg-[var(--lc-accent-soft)] text-[var(--lc-accent)]'
                : 'lc-btn-secondary'
            }`}
          >
            {showLivePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showLivePreview ? 'Hide Preview' : 'Live Preview'}</span>
          </button>
          {!editId && (
            <button
              id="save-and-add-another-btn"
              disabled={isSubmitting}
              onClick={() => save(true)}
              className="lc-btn-secondary px-4 py-2 text-sm disabled:opacity-50"
            >
              Save & Add Another
            </button>
          )}
          <button
            id="save-question-btn"
            disabled={isSubmitting}
            onClick={() => save(false)}
            className="lc-btn-primary flex items-center gap-2 px-5 py-2 text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{editId ? 'Save Changes' : 'Save Question'}</span>
          </button>
        </div>
      </div>

      {/* Live Preview Card */}
      {showLivePreview && (
        <div className="lc-panel border-[var(--lc-accent-border)] p-5 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--lc-border)]">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[var(--lc-accent)]" />
              <span className="text-xs font-semibold text-indigo-300">
                Live Interactive Student Preview
              </span>
            </div>
            <span className="text-xs text-[var(--lc-text-muted)]">
              Updates in real-time as you type or upload figures
            </span>
          </div>

          {/* Stimulus preview if COMMON_STEM */}
          {questionType === 'COMMON_STEM' && (commonInfoContent || commonInfoImages.length > 0) && (
            <div className="p-4 rounded-[12px] border border-[var(--lc-accent-border)] bg-[var(--lc-accent-soft)] space-y-2">
              <div className="text-xs font-semibold text-[var(--lc-accent)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>{commonInfoTitle || 'উদ্দীপক'}</span>
              </div>
              <RichContentRenderer
                content={commonInfoContent}
                images={commonInfoImages}
                className="text-sm text-[var(--lc-text)] leading-relaxed"
              />
            </div>
          )}

          {/* Question Prompt preview */}
          <div className="space-y-2.5">
            <div className="text-base font-semibold text-[var(--lc-text)]">
              <RichContentRenderer
                content={question || '(Question prompt is empty)'}
                images={images}
              />
            </div>

            {/* Multiple Statements preview */}
            {questionType === 'MULTIPLE_STATEMENT' && statements.length > 0 && (
              <div className="rounded-[12px] border border-[var(--lc-border)] bg-[var(--lc-surface-subtle)] p-3.5 space-y-1.5">
                {statements.map((stmt, sIdx) => (
                  <div key={sIdx} className="flex items-start gap-2.5 text-sm text-[var(--lc-text)]">
                    <span className="font-mono text-xs text-[var(--lc-text-secondary)] shrink-0 mt-0.5 tabular-nums">
                      {toRomanNumeral(sIdx + 1)}.
                    </span>
                    <RichContentRenderer content={stmt || `Statement ${sIdx + 1}`} />
                  </div>
                ))}
              </div>
            )}

            {/* Options preview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {(['A', 'B', 'C', 'D'] as const).map(optKey => {
                const optText = options[optKey];
                const optImg = optionImages[optKey];
                const isCorrect = correctAnswer === optKey;

                return (
                  <div
                    key={optKey}
                    className={`p-3 rounded-[10px] border text-sm flex items-start gap-2.5 ${
                      isCorrect
                        ? 'border-[var(--lc-success)] bg-[var(--lc-success-soft)] text-[var(--lc-text)] font-medium'
                        : 'border-[var(--lc-border)] bg-[var(--lc-surface-subtle)] text-[var(--lc-text)]'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-[6px] flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 ${
                        isCorrect
                          ? 'bg-[var(--lc-success)] text-white'
                          : 'bg-[var(--lc-surface)] border border-[var(--lc-border)] text-[var(--lc-text-secondary)]'
                      }`}
                    >
                      {optKey}
                    </span>
                    <div className="flex-1 min-w-0">
                      <RichContentRenderer content={optText || `Option ${optKey}`} />
                      {optImg && (
                        <div className="mt-1.5">
                          <img
                            src={optImg.url}
                            alt={`Option ${optKey} figure`}
                            className="max-h-20 object-contain rounded-[8px] border border-[var(--lc-border)]"
                          />
                        </div>
                      )}
                    </div>
                    {isCorrect && (
                      <span className="text-[11px] font-semibold text-[var(--lc-success)] ml-auto shrink-0">
                        Correct
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Explanation preview */}
            {(explanation || explanationImages.length > 0) && (
              <div className="p-3.5 rounded-[10px] bg-[var(--lc-surface-subtle)] border border-[var(--lc-border)] text-xs text-[var(--lc-text-secondary)] space-y-1">
                <span className="font-semibold text-[var(--lc-text)]">Explanation:</span>
                <RichContentRenderer
                  content={explanation}
                  images={explanationImages}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages & Warnings */}
      {typeSwitchWarning && (
        <div
          className="flex items-center gap-3 p-4 rounded-[12px] text-sm"
          style={{
            backgroundColor: 'var(--lc-warning-soft)',
            border: '1px solid var(--lc-warning)',
            color: 'var(--lc-text)'
          }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-[var(--lc-warning)]" />
          <span>{typeSwitchWarning}</span>
        </div>
      )}
      {error && (
        <div
          className="flex items-center gap-3 p-4 rounded-[12px] text-sm"
          style={{
            backgroundColor: 'var(--lc-error-soft)',
            border: '1px solid var(--lc-error)',
            color: 'var(--lc-error)'
          }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div
          className="flex items-center gap-3 p-4 rounded-[12px] text-sm"
          style={{
            backgroundColor: 'var(--lc-success-soft)',
            border: '1px solid var(--lc-success)',
            color: 'var(--lc-success)'
          }}
        >
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* QUESTION TYPE SELECTOR */}
      <div className="lc-card p-5 space-y-3.5">
        <div>
          <label className="block text-sm font-semibold text-[var(--lc-text)]">
            Question Type / প্রশ্নের ধরন *
          </label>
          <p className="text-xs text-[var(--lc-text-muted)] mt-0.5">
            Select the format matching standard, multiple-statement, or shared stem exam questions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Standard */}
          <button
            type="button"
            onClick={() => handleTypeSelect('STANDARD')}
            className={`p-3.5 rounded-[12px] border text-left flex items-start gap-3 transition-all ${
              questionType === 'STANDARD'
                ? 'border-[var(--lc-accent)] bg-[var(--lc-accent-soft)] text-[var(--lc-text)]'
                : 'border-[var(--lc-border)] bg-[var(--lc-surface-subtle)] hover:border-[var(--lc-border-strong)] text-[var(--lc-text)]'
            }`}
          >
            <div
              className={`p-2 rounded-[8px] shrink-0 ${
                questionType === 'STANDARD'
                  ? 'bg-[var(--lc-accent)] text-white'
                  : 'bg-[var(--lc-surface)] border border-[var(--lc-border)] text-[var(--lc-text-secondary)]'
              }`}
            >
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Standard MCQ</div>
              <div className="text-xs text-[var(--lc-text-secondary)] mt-0.5">
                Standard single question with 4 options
              </div>
            </div>
          </button>

          {/* Multiple Statement */}
          <button
            type="button"
            onClick={() => handleTypeSelect('MULTIPLE_STATEMENT')}
            className={`p-3.5 rounded-[12px] border text-left flex items-start gap-3 transition-all ${
              questionType === 'MULTIPLE_STATEMENT'
                ? 'border-[var(--lc-accent)] bg-[var(--lc-accent-soft)] text-[var(--lc-text)]'
                : 'border-[var(--lc-border)] bg-[var(--lc-surface-subtle)] hover:border-[var(--lc-border-strong)] text-[var(--lc-text)]'
            }`}
          >
            <div
              className={`p-2 rounded-[8px] shrink-0 ${
                questionType === 'MULTIPLE_STATEMENT'
                  ? 'bg-[var(--lc-accent)] text-white'
                  : 'bg-[var(--lc-surface)] border border-[var(--lc-border)] text-[var(--lc-text-secondary)]'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">বহুপদী সমাপ্তিসূচক</div>
              <div className="text-xs text-[var(--lc-text-secondary)] mt-0.5">
                Multiple statements (i, ii, iii) with combined options
              </div>
            </div>
          </button>

          {/* Common Stem */}
          <button
            type="button"
            onClick={() => handleTypeSelect('COMMON_STEM')}
            className={`p-3.5 rounded-[12px] border text-left flex items-start gap-3 transition-all ${
              questionType === 'COMMON_STEM'
                ? 'border-[var(--lc-accent)] bg-[var(--lc-accent-soft)] text-[var(--lc-text)]'
                : 'border-[var(--lc-border)] bg-[var(--lc-surface-subtle)] hover:border-[var(--lc-border-strong)] text-[var(--lc-text)]'
            }`}
          >
            <div
              className={`p-2 rounded-[8px] shrink-0 ${
                questionType === 'COMMON_STEM'
                  ? 'bg-[var(--lc-accent)] text-white'
                  : 'bg-[var(--lc-surface)] border border-[var(--lc-border)] text-[var(--lc-text-secondary)]'
              }`}
            >
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">অভিন্ন তথ্যভিত্তিক</div>
              <div className="text-xs text-[var(--lc-text-secondary)] mt-0.5">
                Shared passage/stimulus with connected questions
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* CURRICULUM SECTION (Subject & Chapter) */}
      <div className="lc-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--lc-text-secondary)] mb-1.5">
              Subject *
            </label>
            <select
              id="select-subject"
              value={subjectId}
              onChange={e => handleSubjectChange(e.target.value)}
              className="lc-select w-full text-sm px-3 py-2"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--lc-text-secondary)] mb-1.5">
              Chapter *
            </label>
            <select
              id="select-chapter"
              value={chapterId}
              onChange={e => setChapterId(e.target.value)}
              disabled={chapters.length === 0}
              className="lc-select w-full text-sm px-3 py-2 disabled:opacity-50"
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
        <div className="lc-card border-[var(--lc-accent-border)] p-6 space-y-4">
          <div className="flex items-center gap-2 text-[var(--lc-accent)]">
            <Layers className="w-5 h-5" />
            <h2 className="text-base font-semibold">অভিন্ন তথ্য / উদ্দীপক (Common Stem Information)</h2>
          </div>
          <p className="text-xs text-[var(--lc-text-secondary)]">
            এই তথ্য বা উদ্দীপকটি একাধিক প্রশ্নের জন্য একবারই সংরক্ষিত হবে এবং অনুশীলনের সময় উপরে প্রদর্শিত হবে।
          </p>

          <div>
            <label className="block text-xs font-medium text-[var(--lc-text-secondary)] mb-1.5">
              Title / শিরোনাম (ঐচ্ছিক)
            </label>
            <input
              type="text"
              value={commonInfoTitle}
              onChange={e => setCommonInfoTitle(e.target.value)}
              placeholder="e.g. অভিন্ন তথ্য ১ বা উদ্দীপক ১"
              className="lc-input w-full text-sm px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[var(--lc-text-secondary)]">
                Passage / Scenario / Information Content *
              </label>
            </div>
            <MathChemistryToolbar
              onInsertMath={(latex, isBlock) => {
                const formatted = isBlock ? `\n$$${latex}$$\n` : `$${latex}$`;
                setCommonInfoContent(prev => prev + formatted);
              }}
              onInsertChemistry={raw => {
                setCommonInfoContent(prev => prev + `\\ce{${raw}}`);
              }}
            />
            <textarea
              rows={4}
              value={commonInfoContent}
              onChange={e => setCommonInfoContent(e.target.value)}
              placeholder="উদ্দীপক বা সাধারণ তথ্যটি এখানে লিখুন... যেমন: একটি বস্তুর ভর 5 kg এবং তার বেগ 10 m/s..."
              className="lc-input w-full text-sm p-3 leading-relaxed font-sans"
            />
            <div className="pt-2">
              <ImageUploader
                images={commonInfoImages}
                onChange={setCommonInfoImages}
                label="উদ্দীপকের চিত্র বা ডায়াগ্রাম (Stimulus Diagram / Images)"
              />
            </div>
          </div>
        </div>
      )}

      {/* MULTIPLE STATEMENT STATEMENTS LIST (When Question Type is MULTIPLE_STATEMENT) */}
      {questionType === 'MULTIPLE_STATEMENT' && (
        <div className="lc-card p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--lc-text-secondary)]">
                বিবৃতিসমূহ (Statements) — i, ii, iii... *
              </label>
              <p className="text-xs text-[var(--lc-text-muted)] mt-0.5">
                Add each statement. They are automatically numbered using Roman numerals (i, ii, iii...).
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddStatement}
              className="lc-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--lc-accent)] border-[var(--lc-accent-border)] bg-[var(--lc-accent-soft)]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Statement
            </button>
          </div>

          <div className="space-y-3">
            {statements.map((stmt, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-[8px] bg-[var(--lc-surface-subtle)] border border-[var(--lc-border)] text-[var(--lc-text-secondary)] font-semibold font-mono text-xs flex items-center justify-center shrink-0">
                  {toRomanNumeral(idx + 1)}.
                </span>
                <input
                  type="text"
                  value={stmt}
                  onChange={e => handleStatementChange(idx, e.target.value)}
                  placeholder={`Statement ${toRomanNumeral(idx + 1)} text...`}
                  className="lc-input flex-1 text-sm px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveStatement(idx)}
                  disabled={statements.length <= 2}
                  className="lc-btn-ghost p-2 text-[var(--lc-text-muted)] hover:text-[var(--lc-error)] disabled:opacity-30 disabled:pointer-events-none"
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
              className="text-xs font-medium text-[var(--lc-accent)] hover:underline flex items-center gap-1.5"
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
          <div className="flex items-center justify-between gap-3 pt-2">
            <div>
              <h2 className="text-base font-semibold text-[var(--lc-text)]">
                উদ্দীপকভিত্তিক প্রশ্নসমূহ (Questions for this Stimulus)
              </h2>
              <p className="text-xs text-[var(--lc-text-muted)]">
                Add each individual question that belongs to this shared passage. Each MCQ is tracked separately.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddGroupQuestion}
              className="lc-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Question
            </button>
          </div>

          {groupQuestions.map((gq, qIdx) => (
            <div
              key={qIdx}
              className="lc-card p-6 space-y-5 relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[var(--lc-border)]">
                <span className="text-sm font-semibold text-[var(--lc-accent)] tabular-nums">
                  প্রশ্ন #{qIdx + 1}
                </span>

                {groupQuestions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveGroupQuestion(qIdx)}
                    className="lc-btn-ghost px-2.5 py-1 text-xs text-[var(--lc-error)] flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Question
                  </button>
                )}
              </div>

              {/* Sub-Question Prompt */}
              <div>
                <label className="block text-xs font-medium text-[var(--lc-text-secondary)] mb-1.5">
                  Question Prompt *
                </label>
                <textarea
                  rows={2}
                  value={gq.question}
                  onChange={e => handleUpdateGroupQuestion(qIdx, { question: e.target.value })}
                  placeholder={`Question #${qIdx + 1} prompt...`}
                  className="lc-input w-full text-sm p-3"
                />
              </div>

              {/* Sub-Question Options */}
              <div className="space-y-3">
                <label className="block text-xs font-medium text-[var(--lc-text-secondary)]">
                  Options & Correct Answer *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(['A', 'B', 'C', 'D'] as const).map(optKey => {
                    const isSelected = gq.correctAnswer === optKey;
                    return (
                      <div
                        key={optKey}
                        className={`flex items-start gap-2.5 p-3 rounded-[10px] border transition ${
                          isSelected
                            ? 'border-[var(--lc-success)] bg-[var(--lc-success-soft)]'
                            : 'border-[var(--lc-border)] bg-[var(--lc-surface-subtle)]'
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer mt-1 shrink-0">
                          <input
                            type="radio"
                            name={`correctAnswer_group_${qIdx}`}
                            checked={isSelected}
                            onChange={() => handleUpdateGroupQuestion(qIdx, { correctAnswer: optKey })}
                            className="w-4 h-4 accent-[var(--lc-success)]"
                          />
                          <span className="font-semibold text-sm text-[var(--lc-text)]">
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
                          className="lc-input flex-1 text-sm bg-[var(--lc-surface)] px-2.5 py-1.5 resize-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sub-Question Explanation */}
              <div>
                <label className="block text-xs font-medium text-[var(--lc-text-secondary)] mb-1.5">
                  Explanation (Optional)
                </label>
                <input
                  type="text"
                  value={gq.explanation || ''}
                  onChange={e => handleUpdateGroupQuestion(qIdx, { explanation: e.target.value })}
                  placeholder="Explanation or derivation for this specific question..."
                  className="lc-input w-full text-sm px-3 py-2"
                />
              </div>

              {/* Sub-Question Flags */}
              <div className="flex flex-wrap items-center gap-5 pt-3 border-t border-[var(--lc-border)]">
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--lc-text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gq.important}
                    onChange={e => handleUpdateGroupQuestion(qIdx, { important: e.target.checked })}
                    className="rounded accent-[var(--lc-warning)]"
                  />
                  <Bookmark className="w-3.5 h-3.5 text-[var(--lc-warning)]" />
                  Important
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--lc-text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gq.veryImportant}
                    onChange={e => handleUpdateGroupQuestion(qIdx, { veryImportant: e.target.checked })}
                    className="rounded accent-[var(--lc-error)]"
                  />
                  <Flame className="w-3.5 h-3.5 text-[var(--lc-error)]" />
                  Very Important
                </label>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--lc-text-secondary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gq.dontUnderstand}
                    onChange={e => handleUpdateGroupQuestion(qIdx, { dontUnderstand: e.target.checked })}
                    className="rounded accent-[var(--lc-accent)]"
                  />
                  <HelpCircle className="w-3.5 h-3.5 text-[var(--lc-accent)]" />
                  Don't Understand
                </label>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* STANDARD, MULTIPLE_STATEMENT, or COMMON_STEM in single-edit mode */
        <div className="lc-card p-6 space-y-6">
          {/* Question Text */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[var(--lc-text-secondary)]">
                Question Prompt *
              </label>
            </div>
            <MathChemistryToolbar
              onInsertMath={handleInsertMathToQuestion}
              onInsertChemistry={handleInsertChemToQuestion}
            />
            <textarea
              id="input-question-text"
              rows={3}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={
                questionType === 'MULTIPLE_STATEMENT'
                  ? 'e.g. নিচের কোনটি সঠিক? বা প্রদত্ত তথ্যের আলোকে কোনটি সত্য?'
                  : 'Type your multiple choice question prompt here... (supports LaTeX $x^2$ and \\ce{H2O})'
              }
              className="lc-input w-full text-sm p-3 font-sans leading-relaxed"
            />
            <div className="pt-1">
              <ImageUploader
                images={images}
                onChange={setImages}
                label="প্রশ্নের চিত্র বা ডায়াগ্রাম (Question Diagram / Figure - Optional)"
              />
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="block text-xs font-medium text-[var(--lc-text-secondary)]">
              Options &amp; Correct Answer *
            </label>
            <p className="text-xs text-[var(--lc-text-muted)]">
              Select the radio button beside the correct answer. You can also attach figure images to individual options.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(['A', 'B', 'C', 'D'] as const).map(optKey => {
                const isSelected = correctAnswer === optKey;
                const optImg = optionImages[optKey];

                return (
                  <div
                    key={optKey}
                    className={`flex flex-col gap-2 p-3 rounded-[10px] border transition ${
                      isSelected
                        ? 'border-[var(--lc-success)] bg-[var(--lc-success-soft)]'
                        : 'border-[var(--lc-border)] bg-[var(--lc-surface-subtle)]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <label className="flex items-center gap-2 cursor-pointer mt-1 shrink-0">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={isSelected}
                          onChange={() => setCorrectAnswer(optKey)}
                          className="w-4 h-4 accent-[var(--lc-success)]"
                        />
                        <span className="font-semibold text-sm text-[var(--lc-text)]">
                          {optKey}
                        </span>
                      </label>
                      <textarea
                        rows={2}
                        value={options[optKey]}
                        onChange={e =>
                          setOptions(prev => ({ ...prev, [optKey]: e.target.value }))
                        }
                        placeholder={`Option ${optKey} text (or formula)...`}
                        className="lc-input flex-1 text-sm bg-[var(--lc-surface)] px-2.5 py-1.5 resize-none"
                      />
                    </div>

                    {/* Option Figure Upload */}
                    <div className="pl-6 flex items-center justify-between gap-2">
                      {optImg ? (
                        <div className="flex items-center gap-2 bg-[var(--lc-surface)] p-1.5 rounded-[8px] border border-[var(--lc-border)]">
                          <img
                            src={optImg.url}
                            alt={`Option ${optKey}`}
                            className="w-9 h-9 object-contain rounded-[6px] border border-[var(--lc-border)]"
                          />
                          <span className="text-[11px] text-[var(--lc-text-muted)] truncate max-w-[110px]">
                            {optImg.caption || `Option ${optKey} Image`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOptionImage(optKey)}
                            className="p-1 text-[var(--lc-error)] hover:opacity-80 ml-1"
                            title="Remove option image"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-[8px] border border-dashed border-[var(--lc-border-strong)] text-[var(--lc-text-secondary)] hover:bg-[var(--lc-surface)] transition">
                          <ImageIcon className="w-3 h-3 text-[var(--lc-accent)]" />
                          <span>Attach Option Figure</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleOptionImageUpload(optKey, file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[var(--lc-text-secondary)]">
                Explanation / Solution Notes (Optional)
              </label>
            </div>
            <MathChemistryToolbar
              onInsertMath={(latex, isBlock) => {
                const formatted = isBlock ? `\n$$${latex}$$\n` : `$${latex}$`;
                setExplanation(prev => prev + formatted);
              }}
              onInsertChemistry={raw => {
                setExplanation(prev => prev + `\\ce{${raw}}`);
              }}
            />
            <textarea
              id="input-explanation"
              rows={2}
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              placeholder="Detailed explanation, formula derivation, or reference..."
              className="lc-input w-full text-sm p-3 leading-relaxed font-sans"
            />
            <div className="pt-1">
              <ImageUploader
                images={explanationImages}
                onChange={setExplanationImages}
                label="ব্যাখ্যার ডায়াগ্রাম বা সমাধান চিত্র (Explanation Diagrams - Optional)"
              />
            </div>
          </div>

          {/* Status & Priority Flags */}
          <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[var(--lc-divider)]">
            <label className="flex items-center gap-2 text-xs font-medium text-[var(--lc-text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={important}
                onChange={e => setImportant(e.target.checked)}
                className="rounded accent-[var(--lc-warning)]"
              />
              <Bookmark className="w-4 h-4 text-[var(--lc-warning)]" />
              Mark Important
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-[var(--lc-text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={veryImportant}
                onChange={e => setVeryImportant(e.target.checked)}
                className="rounded accent-[var(--lc-error)]"
              />
              <Flame className="w-4 h-4 text-[var(--lc-error)]" />
              Mark Very Important
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-[var(--lc-text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={dontUnderstand}
                onChange={e => setDontUnderstand(e.target.checked)}
                className="rounded accent-[var(--lc-accent)]"
              />
              <HelpCircle className="w-4 h-4 text-[var(--lc-accent)]" />
              Mark Don't Understand
            </label>
          </div>
        </div>
      )}

      {/* MULTIPLE SOURCES SECTION */}
      <div className="lc-card p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <label className="block text-sm font-semibold text-[var(--lc-text)] tabular-nums">
              Sources ({sources.length}) *
            </label>
            <p className="text-xs text-[var(--lc-text-muted)]">
              Add one or multiple sources (Board, School, or Guide like Panjaree, Lecture, Lecture Supplement, Royal, Chorcha, eProshnobank).
            </p>
          </div>
          <button
            type="button"
            id="add-source-btn"
            onClick={handleAddSource}
            className="lc-btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[var(--lc-accent)] border-[var(--lc-accent-border)] bg-[var(--lc-accent-soft)]"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Source
          </button>
        </div>

        <div className="space-y-3">
          {sources.map((src, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-[10px] border border-[var(--lc-border)] bg-[var(--lc-surface-subtle)] space-y-2"
            >
              <div className="flex flex-wrap sm:flex-nowrap items-start gap-2.5">
                <div className="w-full sm:w-32 shrink-0">
                  <label className="block text-[11px] font-medium text-[var(--lc-text-muted)] mb-1">
                    Type
                  </label>
                  <select
                    value={src.type}
                    onChange={e => handleUpdateSource(idx, { type: e.target.value })}
                    className="lc-select w-full text-xs font-medium bg-[var(--lc-surface)] px-2.5 py-1.5"
                  >
                    <option value="Board">Board</option>
                    <option value="School">School</option>
                    <option value="Guide">Guide</option>
                  </select>
                </div>

                <div className="flex-1 min-w-[170px]">
                  <label className="block text-[11px] font-medium text-[var(--lc-text-muted)] mb-1">
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
                    className="lc-input w-full text-xs bg-[var(--lc-surface)] px-2.5 py-1.5"
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
                    <label className="block text-[11px] font-medium text-[var(--lc-text-muted)] mb-1">
                      Entry / Q No.
                    </label>
                    <input
                      type="text"
                      value={src.entryNo || ''}
                      onChange={e => handleUpdateSource(idx, { entryNo: e.target.value })}
                      placeholder="e.g. 142"
                      className="lc-input w-full text-xs bg-[var(--lc-surface)] px-2.5 py-1.5 font-mono"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveSource(idx)}
                  className="lc-btn-ghost p-1.5 mt-5 text-[var(--lc-text-muted)] hover:text-[var(--lc-error)]"
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
