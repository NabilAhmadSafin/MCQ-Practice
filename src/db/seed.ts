import { db } from './index';
import type { Subject, Chapter, Question } from '../types';

export const INITIAL_SUBJECTS: Subject[] = [
  { id: 'subj-phys', name: 'Physics', order: 1, createdAt: Date.now() - 1000000 },
  { id: 'subj-chem', name: 'Chemistry', order: 2, createdAt: Date.now() - 900000 },
  { id: 'subj-bio', name: 'Biology', order: 3, createdAt: Date.now() - 800000 },
  { id: 'subj-math', name: 'Mathematics', order: 4, createdAt: Date.now() - 700000 }
];

export const INITIAL_CHAPTERS: Chapter[] = [
  // Physics
  { id: 'chap-phys-1', subjectId: 'subj-phys', name: 'Vector', order: 1, createdAt: Date.now() - 600000 },
  { id: 'chap-phys-2', subjectId: 'subj-phys', name: 'Motion', order: 2, createdAt: Date.now() - 590000 },
  { id: 'chap-phys-3', subjectId: 'subj-phys', name: 'Newtonian Mechanics', order: 3, createdAt: Date.now() - 580000 },
  { id: 'chap-phys-4', subjectId: 'subj-phys', name: 'Work, Energy & Power', order: 4, createdAt: Date.now() - 570000 },
  // Chemistry
  { id: 'chap-chem-1', subjectId: 'subj-chem', name: 'Atomic Structure', order: 1, createdAt: Date.now() - 560000 },
  { id: 'chap-chem-2', subjectId: 'subj-chem', name: 'Periodic Table', order: 2, createdAt: Date.now() - 550000 },
  { id: 'chap-chem-3', subjectId: 'subj-chem', name: 'Chemical Bonding', order: 3, createdAt: Date.now() - 540000 },
  // Biology
  { id: 'chap-bio-1', subjectId: 'subj-bio', name: 'Cell Structure & Function', order: 1, createdAt: Date.now() - 530000 },
  { id: 'chap-bio-2', subjectId: 'subj-bio', name: 'Cell Division', order: 2, createdAt: Date.now() - 520000 },
  // Math
  { id: 'chap-math-1', subjectId: 'subj-math', name: 'Matrices & Determinants', order: 1, createdAt: Date.now() - 510000 }
];

export const INITIAL_QUESTIONS: Question[] = [
  // Physics: Vector
  {
    id: 'q-phys-vec-1',
    subjectId: 'subj-phys',
    chapterId: 'chap-phys-1',
    question: 'Which of the following is a pure vector quantity?',
    options: {
      A: 'Kinetic Energy',
      B: 'Linear Momentum',
      C: 'Electric Potential',
      D: 'Temperature'
    },
    correctAnswer: 'B',
    explanation: 'Linear momentum p = mv has both magnitude and direction, whereas energy, potential, and temperature are scalar quantities.',
    sources: [
      { type: 'Board', name: 'Dhaka Board 2024' },
      { type: 'Guide', name: 'Panjaree' }
    ],
    sourceTypes: ['Board', 'Guide'],
    guides: ['Panjaree'],
    important: true,
    veryImportant: false,
    dontUnderstand: false,
    createdAt: Date.now() - 400000,
    updatedAt: Date.now() - 400000
  },
  {
    id: 'q-phys-vec-2',
    subjectId: 'subj-phys',
    chapterId: 'chap-phys-1',
    question: 'If the dot product of two non-zero vectors A and B is zero (A · B = 0), what is the angle between them?',
    options: {
      A: '0°',
      B: '45°',
      C: '90°',
      D: '180°'
    },
    correctAnswer: 'C',
    explanation: 'A · B = |A||B| cos(θ). Since |A| ≠ 0 and |B| ≠ 0, cos(θ) must equal 0, which corresponds to θ = 90° (perpendicular vectors).',
    sources: [
      { type: 'Board', name: 'Rajshahi Board 2023' },
      { type: 'Guide', name: 'Lecture' }
    ],
    sourceTypes: ['Board', 'Guide'],
    guides: ['Lecture'],
    important: false,
    veryImportant: true,
    dontUnderstand: false,
    createdAt: Date.now() - 390000,
    updatedAt: Date.now() - 390000
  },
  {
    id: 'q-phys-vec-3',
    subjectId: 'subj-phys',
    chapterId: 'chap-phys-1',
    question: 'What is the magnitude of the unit vector along the vector A = 3i + 4j?',
    options: {
      A: '5',
      B: '1',
      C: '7',
      D: '25'
    },
    correctAnswer: 'B',
    explanation: 'By definition, the magnitude of any unit vector is always exactly 1.',
    sources: [
      { type: 'School', name: 'Notre Dame College' },
      { type: 'Guide', name: 'Royal' }
    ],
    sourceTypes: ['School', 'Guide'],
    guides: ['Royal'],
    important: false,
    veryImportant: false,
    dontUnderstand: true,
    createdAt: Date.now() - 380000,
    updatedAt: Date.now() - 380000
  },
  // Physics: Motion
  {
    id: 'q-phys-mot-1',
    subjectId: 'subj-phys',
    chapterId: 'chap-phys-2',
    question: 'What is the trajectory of a projectile launched at an angle θ (0° < θ < 90°) to the horizontal under uniform gravity?',
    options: {
      A: 'Straight line',
      B: 'Parabola',
      C: 'Hyperbola',
      D: 'Ellipse'
    },
    correctAnswer: 'B',
    explanation: 'The horizontal motion is uniform while the vertical motion is subject to constant gravitational acceleration, yielding the parabolic trajectory y = x tan(θ) - (g / (2 v₀² cos²(θ))) x².',
    sources: [
      { type: 'Board', name: 'Cumilla Board 2023' },
      { type: 'Guide', name: 'Chorcha' }
    ],
    sourceTypes: ['Board', 'Guide'],
    guides: ['Chorcha'],
    important: true,
    veryImportant: false,
    dontUnderstand: false,
    createdAt: Date.now() - 370000,
    updatedAt: Date.now() - 370000
  },
  {
    id: 'q-phys-mot-2',
    subjectId: 'subj-phys',
    chapterId: 'chap-phys-2',
    question: 'At what angle of projection is the horizontal range of a projectile maximum?',
    options: {
      A: '30°',
      B: '45°',
      C: '60°',
      D: '90°'
    },
    correctAnswer: 'B',
    explanation: 'Range R = (v₀² sin 2θ) / g. The maximum value of sin 2θ is 1 when 2θ = 90°, hence θ = 45°.',
    sources: [
      { type: 'School', name: 'Dhaka College' },
      { type: 'Guide', name: 'eProshnobank' }
    ],
    sourceTypes: ['School', 'Guide'],
    guides: ['eProshnobank'],
    important: false,
    veryImportant: false,
    dontUnderstand: false,
    createdAt: Date.now() - 360000,
    updatedAt: Date.now() - 360000
  },
  // Chemistry: Atomic Structure
  {
    id: 'q-chem-atom-1',
    subjectId: 'subj-chem',
    chapterId: 'chap-chem-1',
    question: 'What is the maximum number of electrons that can be accommodated in a subshell with azimuthal quantum number l = 2?',
    options: {
      A: '2',
      B: '6',
      C: '10',
      D: '14'
    },
    correctAnswer: 'C',
    explanation: 'For any subshell, maximum electrons = 2(2l + 1). For l = 2 (d-subshell), maximum electrons = 2(2×2 + 1) = 10.',
    sources: [
      { type: 'Board', name: 'Sylhet Board 2022' },
      { type: 'Guide', name: 'Panjaree' }
    ],
    sourceTypes: ['Board', 'Guide'],
    guides: ['Panjaree'],
    important: true,
    veryImportant: true,
    dontUnderstand: false,
    createdAt: Date.now() - 350000,
    updatedAt: Date.now() - 350000
  },
  {
    id: 'q-chem-atom-2',
    subjectId: 'subj-chem',
    chapterId: 'chap-chem-1',
    question: 'Which of the following principles forbids two electrons in an atom from having all four identical quantum numbers?',
    options: {
      A: 'Aufbau Principle',
      B: "Hund's Rule",
      C: 'Pauli Exclusion Principle',
      D: "Heisenberg's Uncertainty Principle"
    },
    correctAnswer: 'C',
    explanation: 'Pauli Exclusion Principle states that no two electrons in an atom can have the exact same four quantum numbers (n, l, m, s).',
    sources: [
      { type: 'School', name: 'Rajuk Uttara Model College' },
      { type: 'Guide', name: 'Lecture' }
    ],
    sourceTypes: ['School', 'Guide'],
    guides: ['Lecture'],
    important: false,
    veryImportant: true,
    dontUnderstand: false,
    createdAt: Date.now() - 340000,
    updatedAt: Date.now() - 340000
  },
  // Biology: Cell Structure
  {
    id: 'q-bio-cell-1',
    subjectId: 'subj-bio',
    chapterId: 'chap-bio-1',
    question: 'Which organelle is universally termed the "Powerhouse of the Cell"?',
    options: {
      A: 'Golgi Apparatus',
      B: 'Ribosome',
      C: 'Mitochondria',
      D: 'Lysosome'
    },
    correctAnswer: 'C',
    explanation: 'Mitochondria generate the majority of cellular adenosine triphosphate (ATP) through cellular respiration.',
    sources: [
      { type: 'Board', name: 'Dinajpur Board 2024' },
      { type: 'Guide', name: 'Royal' }
    ],
    sourceTypes: ['Board', 'Guide'],
    guides: ['Royal'],
    important: false,
    veryImportant: false,
    dontUnderstand: false,
    createdAt: Date.now() - 330000,
    updatedAt: Date.now() - 330000
  },
  {
    id: 'q-bio-cell-2',
    subjectId: 'subj-bio',
    chapterId: 'chap-bio-1',
    question: 'Which organelle contains hydrolytic enzymes responsible for intracellular digestion and autolysis?',
    options: {
      A: 'Centrosome',
      B: 'Lysosome',
      C: 'Peroxisome',
      D: 'Chloroplast'
    },
    correctAnswer: 'B',
    explanation: 'Lysosomes contain acid hydrolases that break down waste materials and cellular debris.',
    sources: [
      { type: 'Board', name: 'Chattogram Board 2023' },
      { type: 'Guide', name: 'eProshnobank' }
    ],
    sourceTypes: ['Board', 'Guide'],
    guides: ['eProshnobank'],
    important: true,
    veryImportant: false,
    dontUnderstand: true,
    createdAt: Date.now() - 320000,
    updatedAt: Date.now() - 320000
  },
  // Mathematics: Matrices
  {
    id: 'q-math-mat-1',
    subjectId: 'subj-math',
    chapterId: 'chap-math-1',
    question: 'If the determinant of a square matrix A is zero (|A| = 0), what is matrix A called?',
    options: {
      A: 'Singular Matrix',
      B: 'Non-Singular Matrix',
      C: 'Scalar Matrix',
      D: 'Identity Matrix'
    },
    correctAnswer: 'A',
    explanation: 'A matrix with |A| = 0 has no inverse and is defined as a Singular matrix.',
    sources: [
      { type: 'Board', name: 'Barishal Board 2024' },
      { type: 'Guide', name: 'Panjaree' }
    ],
    sourceTypes: ['Board', 'Guide'],
    guides: ['Panjaree'],
    important: true,
    veryImportant: false,
    dontUnderstand: false,
    createdAt: Date.now() - 310000,
    updatedAt: Date.now() - 310000
  },
  {
    id: 'q-math-mat-2',
    subjectId: 'subj-math',
    chapterId: 'chap-math-1',
    question: 'For two invertible matrices A and B of the same order, what is (AB)⁻¹ equal to?',
    options: {
      A: 'A⁻¹ B⁻¹',
      B: 'B⁻¹ A⁻¹',
      C: 'A B⁻¹',
      D: 'B A⁻¹'
    },
    correctAnswer: 'B',
    explanation: 'The reversal rule for matrix inversion states that (AB)⁻¹ = B⁻¹ A⁻¹.',
    sources: [
      { type: 'School', name: 'St. Joseph Higher Secondary School' },
      { type: 'Guide', name: 'Chorcha' }
    ],
    sourceTypes: ['School', 'Guide'],
    guides: ['Chorcha'],
    important: true,
    veryImportant: true,
    dontUnderstand: true,
    createdAt: Date.now() - 300000,
    updatedAt: Date.now() - 300000
  }
];

let isSeedingInProgress = false;

export async function seedDatabaseIfEmpty(): Promise<boolean> {
  if (isSeedingInProgress) return false;
  isSeedingInProgress = true;

  try {
    const subjectCount = await db.subjects.count();
    if (subjectCount === 0) {
      await db.transaction('rw', [db.subjects, db.chapters, db.questions], async () => {
        const countInside = await db.subjects.count();
        if (countInside === 0) {
          await db.subjects.bulkPut(INITIAL_SUBJECTS);
          await db.chapters.bulkPut(INITIAL_CHAPTERS);
          await db.questions.bulkPut(INITIAL_QUESTIONS);
        }
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error seeding database:', err);
    return false;
  } finally {
    isSeedingInProgress = false;
  }
}

export async function forceResetAndSeed(): Promise<void> {
  await db.transaction('rw', [db.subjects, db.chapters, db.questions, db.attempts, db.sessions], async () => {
    await db.subjects.clear();
    await db.chapters.clear();
    await db.questions.clear();
    await db.attempts.clear();
    await db.sessions.clear();

    await db.subjects.bulkPut(INITIAL_SUBJECTS);
    await db.chapters.bulkPut(INITIAL_CHAPTERS);
    await db.questions.bulkPut(INITIAL_QUESTIONS);
  });
}
