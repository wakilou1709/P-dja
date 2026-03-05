// Store éphémère pour la session quiz (non persisté entre app launches)

export interface QuizQuestion {
  id: string;
  content: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  options: string[] | null;
  difficulty: string;
  imageUrl?: string;
  exam?: { type: string; subject: string; series?: string };
}

export interface QuizSession {
  attemptId: string;
  mode: 'PRACTICE' | 'TIMED' | 'COMPETITIVE';
  timeLimit: number | null; // en minutes
  questions: QuizQuestion[];
  startedAt: number; // timestamp ms
}

export interface QuizAnswer {
  questionId: string;
  answer: string;
  timeSpent: number; // en secondes
}

export interface QuizResult {
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  totalQuestions: number;
  isPassed: boolean;
  questionsWithAnswers: Array<{
    id: string;
    content: string;
    type: string;
    options: string[] | null;
    userAnswer: string | null;
    isCorrect: boolean;
    isSkipped: boolean;
    correctAnswer: string;
    explanation?: string;
  }>;
  weakAreas: string[];
  xpGained: number;
}

let _session: QuizSession | null = null;
let _result: QuizResult | null = null;

export const quizStore = {
  setSession: (s: QuizSession) => { _session = s; },
  getSession: () => _session,
  setResult: (r: QuizResult) => { _result = r; },
  getResult: () => _result,
  clear: () => { _session = null; _result = null; },
};
