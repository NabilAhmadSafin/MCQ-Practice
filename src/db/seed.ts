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
    sourceType: 'Board',
    sourceName: 'Dhaka Board 2024',
    important: true,
    veryImportant: false,
    dontUnderstand: false,
    difficulty: 'Easy',
    tags: ['conceptual', 'momentum'],
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
    sourceType: 'Board',
    sourceName: 'Rajshahi Board 2023',
    important: false,
    veryImportant: true,
    dontUnderstand: false,
    difficulty: 'Easy',
    tags: ['formula', 'dot-product'],
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
    sourceType: 'Guide',
    sourceName: 'Panjeri Physics 1st Paper',
    important: false,
    veryImportant: false,
    dontUnderstand: true,
    difficulty: 'Medium',
    tags: ['trap', 'unit-vector'],
    createdAt: Date.now() - 380000,
    updatedAt: Date.now() - 380000
  },
  // Physics: Motion
  {
    id: 'q-phys-mot-1',
    subjectId: 'subj-phys',
    chapterId: 'chap-phys-2',
    question: 'What is the SI unit of acceleration?',
    options: {
      A: 'm/s',
      B: 'm·s',
      C: 'm/s²',
      D: 'kg·m/s'
    },
    correctAnswer: 'C',
    explanation: 'Acceleration is defined as the rate of change of velocity with respect to time: a = dv/dt, so its SI unit is meters per second squared (m/s²).',
    sourceType: 'Board',
    sourceName: 'Chittagong Board 2023',
    important: false,
    veryImportant: false,
    dontUnderstand: false,
    difficulty: 'Easy',
    tags: ['formula', 'units'],
    createdAt: Date.now() - 370000,
    updatedAt: Date.now() - 370000
  },
  {
    id: 'q-phys-mot-2',
    subjectId: 'subj-phys',
    chapterId: 'chap-phys-2',
    question: 'A car accelerates uniformly from rest at 2 m/s² for 5 seconds. What distance does it cover?',
    options: {
      A: '10 m',
      B: '25 m',
      C: '50 m',
      D: '100 m'
    },
    correctAnswer: 'B',
    explanation: 'Using s = ut + 0.5 * a * t² with u = 0: s = 0.5 * 2 * (5²) = 25 meters.',
    sourceType: 'School',
    sourceName: 'Notre Dame College Test 2024',
    important: true,
    veryImportant: true,
    dontUnderstand: false,
    difficulty: 'Medium',
    tags: ['calculation', 'kinematics'],
    createdAt: Date.now() - 360000,
    updatedAt: Date.now() - 360000
  },
  {
    id: 'q-phys-mot-3',
    subjectId: 'subj-phys',
    chapterId: 'chap-phys-2',
    question: 'At what launch angle does an ideal projectile achieve maximum horizontal range over level ground?',
    options: {
      A: '30°',
      B: '45°',
      C: '60°',
      D: '90°'
    },
    correctAnswer: 'B',
    explanation: 'Range R = (v² sin(2θ)) / g. The maximum occurs when sin(2θ) = 1, giving 2θ = 90°, hence θ = 45°.',
    sourceType: 'Board',
    sourceName: 'Dhaka Board 2022',
    important: true,
    veryImportant: false,
    dontUnderstand: false,
    difficulty: 'Easy',
    tags: ['projectile', 'conceptual'],
    createdAt: Date.now() - 350000,
    updatedAt: Date.now() - 350000
  },
  // Chemistry: Atomic Structure
  {
    id: 'q-chem-atom-1',
    subjectId: 'subj-chem',
    chapterId: 'chap-chem-1',
    question: 'Which quantum number determines the shape of an electron atomic orbital?',
    options: {
      A: 'Principal Quantum Number (n)',
      B: 'Azimuthal / Angular Momentum Quantum Number (l)',
      C: 'Magnetic Quantum Number (m)',
      D: 'Spin Quantum Number (s)'
    },
    correctAnswer: 'B',
    explanation: 'The azimuthal quantum number (l) designates the subshell and defines orbital angular momentum and geometric shape (e.g. s is spherical, p is dumbbell).',
    sourceType: 'Board',
    sourceName: 'Dhaka Board 2024',
    important: true,
    veryImportant: true,
    dontUnderstand: false,
    difficulty: 'Medium',
    tags: ['quantum-numbers', 'conceptual'],
    createdAt: Date.now() - 340000,
    updatedAt: Date.now() - 340000
  },
  {
    id: 'q-chem-atom-2',
    subjectId: 'subj-chem',
    chapterId: 'chap-chem-1',
    question: 'What is the maximum number of electrons that can be accommodated in a shell with principal quantum number n = 3?',
    options: {
      A: '8',
      B: '14',
      C: '18',
      D: '32'
    },
    correctAnswer: 'C',
    explanation: 'The maximum capacity of any principal shell is given by 2n². For n = 3, 2 * (3²) = 2 * 9 = 18 electrons.',
    sourceType: 'Guide',
    sourceName: 'Royal Chemistry 1st Paper',
    important: false,
    veryImportant: false,
    dontUnderstand: false,
    difficulty: 'Easy',
    tags: ['formula', 'electrons'],
    createdAt: Date.now() - 330000,
    updatedAt: Date.now() - 330000
  },
  // Chemistry: Periodic Table
  {
    id: 'q-chem-per-1',
    subjectId: 'subj-chem',
    chapterId: 'chap-chem-2',
    question: 'Which element possesses the highest electronegativity value on the Pauling scale?',
    options: {
      A: 'Oxygen (O)',
      B: 'Chlorine (Cl)',
      C: 'Fluorine (F)',
      D: 'Nitrogen (N)'
    },
    correctAnswer: 'C',
    explanation: 'Fluorine has an electronegativity value of approximately 3.98 (commonly rounded to 4.0), making it the most electronegative element.',
    sourceType: 'Board',
    sourceName: 'Comilla Board 2023',
    important: true,
    veryImportant: false,
    dontUnderstand: false,
    difficulty: 'Easy',
    tags: ['periodic-trends', 'frequent'],
    createdAt: Date.now() - 320000,
    updatedAt: Date.now() - 320000
  },
  // Biology: Cell
  {
    id: 'q-bio-cell-1',
    subjectId: 'subj-bio',
    chapterId: 'chap-bio-1',
    question: 'Which cellular organelle is universally referred to as the powerhouse of the cell?',
    options: {
      A: 'Ribosome',
      B: 'Golgi Apparatus',
      C: 'Mitochondrion',
      D: 'Lysosome'
    },
    correctAnswer: 'C',
    explanation: 'Mitochondria produce the majority of cellular adenosine triphosphate (ATP) through oxidative phosphorylation.',
    sourceType: 'Board',
    sourceName: 'Sylhet Board 2024',
    important: false,
    veryImportant: false,
    dontUnderstand: false,
    difficulty: 'Easy',
    tags: ['cell-biology'],
    createdAt: Date.now() - 310000,
    updatedAt: Date.now() - 310000
  },
  // Mathematics
  {
    id: 'q-math-mat-1',
    subjectId: 'subj-math',
    chapterId: 'chap-math-1',
    question: 'If matrix A has dimension 3×2 and matrix B has dimension 2×4, what is the dimension of the product AB?',
    options: {
      A: '2×2',
      B: '3×4',
      C: '4×3',
      D: 'Multiplication is undefined'
    },
    correctAnswer: 'B',
    explanation: 'For (m × k) multiplied by (k × n), the inner dimensions match (2 = 2) and the resulting matrix dimension is (m × n) = 3 × 4.',
    sourceType: 'Model Test',
    sourceName: 'Engineering Admission Model Test 2024',
    important: true,
    veryImportant: true,
    dontUnderstand: true,
    difficulty: 'Medium',
    tags: ['matrix', 'calculation'],
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
