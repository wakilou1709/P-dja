'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Brain,
  Clock,
  Trophy,
  Target,
  ChevronRight,
  CheckCircle2,
  XCircle,
  SkipForward,
  RotateCcw,
  Home,
  BookOpen,
  Flame,
  Star,
  ArrowRight,
  Lock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { quizApi, examConfigApi, subscriptionApi } from '@/lib/api';

type Step = 'home' | 'config' | 'playing' | 'results';
type QuizMode = 'PRACTICE' | 'TIMED' | 'COMPETITIVE';

interface Question {
  id: string;
  content: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
  options: string[] | null;
  difficulty: string;
  exam?: { type: string; subject: string; series?: string };
}

interface QuizState {
  attemptId: string;
  quizId: string;
  mode: QuizMode;
  timeLimit: number | null;
  questions: Question[];
  currentIndex: number;
  answers: { questionId: string; answer: string; timeSpent?: number }[];
  streak: number;
  bestStreak: number;
  questionStartTime: number;
  showExplanation: boolean;
  lastAnswerCorrect: boolean | null;
  lastCorrectAnswer: string | null;
  lastExplanation: string | null;
}

interface AttemptResult {
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
  totalQuestions: number;
  isPassed: boolean;
  questionsWithAnswers: any[];
  weakAreas: string[];
  xpGained: number;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const OPTION_COLORS = [
  { base: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.4)', hover: 'rgba(139,92,246,0.2)', text: '#a78bfa' },
  { base: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.4)', hover: 'rgba(6,182,212,0.2)', text: '#22d3ee' },
  { base: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.4)', hover: 'rgba(245,158,11,0.2)', text: '#fbbf24' },
  { base: 'rgba(236,72,153,0.1)', border: 'rgba(236,72,153,0.4)', hover: 'rgba(236,72,153,0.2)', text: '#f472b6' },
];

export default function QuizPage() {
  const [step, setStep] = useState<Step>('home');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [examConfigs, setExamConfigs] = useState<Record<string, any[]>>({});
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config state
  const [selectedMode, setSelectedMode] = useState<QuizMode>('PRACTICE');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [questionLimit, setQuestionLimit] = useState(10);
  const [showPaywall, setShowPaywall] = useState(false);

  // Quiz state
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [hoveredOption, setHoveredOption] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  // Results state
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [showErrorReview, setShowErrorReview] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    subscriptionApi.checkAccess()
      .then((r) => setHasAccess(r.hasAccess))
      .catch(() => setHasAccess(false));
    examConfigApi.getAll()
      .then(setExamConfigs)
      .catch(() => {});
    quizApi.getMyAttempts()
      .then(setAttempts)
      .catch(() => {});
  }, []);

  // Timer logic
  useEffect(() => {
    if (step === 'playing' && quiz?.timeLimit && timeRemaining !== null) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((t) => {
          if (t === null || t <= 1) {
            clearInterval(timerRef.current!);
            handleSubmitAll();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step, quiz?.timeLimit]);

  const handleSelectMode = (mode: QuizMode) => {
    setSelectedMode(mode);
    setStep('config');
  };

  const handleStartQuiz = async () => {
    if (!hasAccess) {
      setShowPaywall(true);
      return;
    }
    if (!selectedExamType) {
      setError('Veuillez sélectionner un type d\'examen');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await quizApi.startAttempt({
        examType: selectedExamType,
        subject: selectedSubject || undefined,
        series: selectedSeries || undefined,
        difficulty: selectedDifficulty || undefined,
        limit: questionLimit,
        mode: selectedMode,
      });

      const newQuiz: QuizState = {
        attemptId: data.attemptId,
        quizId: data.quizId,
        mode: selectedMode,
        timeLimit: data.timeLimit,
        questions: data.questions,
        currentIndex: 0,
        answers: [],
        streak: 0,
        bestStreak: 0,
        questionStartTime: Date.now(),
        showExplanation: false,
        lastAnswerCorrect: null,
        lastCorrectAnswer: null,
        lastExplanation: null,
      };

      setQuiz(newQuiz);
      if (data.timeLimit) {
        setTimeRemaining(data.timeLimit * 60);
      }
      setStep('playing');
      setSelectedOption(null);
      setTextAnswer('');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur lors du chargement du quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = useCallback((answer: string) => {
    if (!quiz) return;
    if (quiz.mode === 'PRACTICE' && quiz.showExplanation) return;

    const timeSpent = Math.floor((Date.now() - quiz.questionStartTime) / 1000);
    const currentQuestion = quiz.questions[quiz.currentIndex];

    setSelectedOption(answer);

    if (quiz.mode === 'PRACTICE') {
      // For practice: show immediate feedback
      const newAnswers = [
        ...quiz.answers,
        { questionId: currentQuestion.id, answer, timeSpent },
      ];

      // We'll get correct answer from questionsWithAnswers after submit
      // For now just show the selection; we'll reveal on next question
      setQuiz({
        ...quiz,
        answers: newAnswers,
        showExplanation: true,
        lastAnswerCorrect: null, // will be revealed on submit
        lastCorrectAnswer: null,
        lastExplanation: null,
      });
    } else {
      // For timed/competitive: just record answer and move
      const newAnswers = [
        ...quiz.answers,
        { questionId: currentQuestion.id, answer, timeSpent },
      ];

      if (quiz.currentIndex < quiz.questions.length - 1) {
        setQuiz({
          ...quiz,
          answers: newAnswers,
          currentIndex: quiz.currentIndex + 1,
          questionStartTime: Date.now(),
          showExplanation: false,
        });
        setSelectedOption(null);
        setTextAnswer('');
      } else {
        setQuiz({ ...quiz, answers: newAnswers });
        handleSubmitAll(newAnswers);
      }
    }
  }, [quiz]);

  const handleNextQuestion = useCallback(() => {
    if (!quiz) return;
    const isLast = quiz.currentIndex >= quiz.questions.length - 1;

    if (isLast) {
      handleSubmitAll();
    } else {
      setQuiz({
        ...quiz,
        currentIndex: quiz.currentIndex + 1,
        showExplanation: false,
        questionStartTime: Date.now(),
        lastAnswerCorrect: null,
      });
      setSelectedOption(null);
      setTextAnswer('');
    }
  }, [quiz]);

  const handleSkip = useCallback(() => {
    if (!quiz || quiz.mode !== 'PRACTICE') return;
    const isLast = quiz.currentIndex >= quiz.questions.length - 1;

    if (isLast) {
      handleSubmitAll();
    } else {
      setQuiz({
        ...quiz,
        currentIndex: quiz.currentIndex + 1,
        showExplanation: false,
        questionStartTime: Date.now(),
      });
      setSelectedOption(null);
      setTextAnswer('');
    }
  }, [quiz]);

  const handleSubmitAll = useCallback(async (overrideAnswers?: any[]) => {
    if (!quiz) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setLoading(true);
    try {
      const answers = overrideAnswers || quiz.answers;
      const data = await quizApi.submitAttempt(quiz.attemptId, { answers });
      setResult(data);

      // Refresh attempts
      quizApi.getMyAttempts().then(setAttempts).catch(() => {});
      setStep('results');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  }, [quiz]);

  const handleTextSubmit = useCallback(() => {
    if (textAnswer.trim()) {
      handleAnswer(textAnswer.trim());
    }
  }, [textAnswer, handleAnswer]);

  const handleAbandon = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setQuiz(null);
    setResult(null);
    setStep('home');
    setSelectedOption(null);
    setTextAnswer('');
    setShowAbandonConfirm(false);
  };

  const handleRestart = () => {
    setQuiz(null);
    setResult(null);
    setStep('config');
    setSelectedOption(null);
    setTextAnswer('');
  };

  // ─── STEP: HOME ────────────────────────────────────────────────────────────
  if (step === 'home') {
    return (
      <div className="space-y-8 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-glow" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Quiz interactifs</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Quiz</h1>
          <p className="text-slate-400 text-sm mt-1">Teste tes connaissances avec des quiz adaptatifs</p>
        </div>

        {hasAccess === false && (
          <div className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.2)' }}>
              <Lock className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Abonne-toi pour accéder aux quiz</p>
              <p className="text-xs text-slate-400 mt-0.5">Les quiz sont disponibles avec l'abonnement Pédja.</p>
            </div>
            <Link href="/subscribe"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
              S'abonner <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              mode: 'PRACTICE' as QuizMode,
              icon: Brain,
              label: 'Entraînement',
              desc: 'Sans minuteur · Explication après chaque réponse',
              color: 'text-purple-400',
              gradient: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(109,40,217,0.05))',
              border: 'rgba(139,92,246,0.3)',
            },
            {
              mode: 'TIMED' as QuizMode,
              icon: Clock,
              label: 'Concours Simulé',
              desc: 'Chrono strict · Conditions réelles',
              color: 'text-cyan-400',
              gradient: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(8,145,178,0.05))',
              border: 'rgba(6,182,212,0.3)',
            },
            {
              mode: 'COMPETITIVE' as QuizMode,
              icon: Trophy,
              label: 'BAC Blanc',
              desc: 'Simulation officielle · Coefficients officiels',
              color: 'text-yellow-400',
              gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05))',
              border: 'rgba(245,158,11,0.3)',
            },
          ].map(({ mode, icon: Icon, label, desc, color, gradient, border }) => (
            <button
              key={mode}
              onClick={() => handleSelectMode(mode)}
              className="text-left p-6 rounded-2xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.99]"
              style={{ background: gradient, border: `1px solid ${border}` }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: gradient, border: `1px solid ${border}` }}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">{label}</h3>
              <p className="text-slate-400 text-sm">{desc}</p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-medium" style={{ color: color.replace('text-', '') }}>
                Commencer <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>

        {/* History */}
        {attempts.length > 0 && (
          <div>
            <h2 className="text-white font-semibold mb-3">Historique récent</h2>
            <div className="space-y-2">
              {attempts.slice(0, 3).map((a) => (
                <div key={a.id} className="neo-card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">{a.quiz?.title || 'Quiz'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {a.correctAnswers}/{a.totalQuestions} correctes · {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${a.score >= 70 ? 'text-green-400' : a.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {Math.round(a.score)}%
                    </p>
                    <p className={`text-xs ${a.isPassed ? 'text-green-400' : 'text-red-400'}`}>
                      {a.isPassed ? 'Réussi' : 'Échoué'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── STEP: CONFIG ───────────────────────────────────────────────────────────
  if (step === 'config') {
    const examTypes = examConfigs['exam_types'] || [];
    const subjects = examConfigs['subjects'] || [];
    const series = examConfigs['series'] || [];
    const modeName = selectedMode === 'PRACTICE' ? 'Entraînement' : selectedMode === 'TIMED' ? 'Concours Simulé' : 'BAC Blanc';

    return (
      <div className="space-y-6 animate-fade-up max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('home')} className="text-slate-400 hover:text-white transition-colors">
            <Home className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Configurer le quiz</h1>
            <p className="text-slate-400 text-sm">Mode : {modeName}</p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="neo-card p-6 space-y-6">
          {/* Exam Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Type d'examen *</label>
            <div className="flex flex-wrap gap-2">
              {examTypes.length > 0 ? examTypes.map((e: any) => (
                <button
                  key={e.value}
                  onClick={() => { setSelectedExamType(e.value); setSelectedSubject(''); setSelectedSeries(''); }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    background: selectedExamType === e.value ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selectedExamType === e.value ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    color: selectedExamType === e.value ? '#a78bfa' : '#94a3b8',
                  }}>
                  {e.label}
                </button>
              )) : ['BAC', 'BEPC', 'CEP', 'CONCOURS_FP', 'LICENCE'].map((t) => (
                <button
                  key={t}
                  onClick={() => { setSelectedExamType(t); setSelectedSubject(''); setSelectedSeries(''); }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    background: selectedExamType === t ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selectedExamType === t ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    color: selectedExamType === t ? '#a78bfa' : '#94a3b8',
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Matière</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSubject('')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                style={{
                  background: !selectedSubject ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${!selectedSubject ? 'rgba(6,182,212,0.6)' : 'rgba(255,255,255,0.1)'}`,
                  color: !selectedSubject ? '#22d3ee' : '#94a3b8',
                }}>
                Toutes
              </button>
              {subjects.length > 0 ? subjects.map((s: any) => (
                <button
                  key={s.value}
                  onClick={() => setSelectedSubject(s.value)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    background: selectedSubject === s.value ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selectedSubject === s.value ? 'rgba(6,182,212,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    color: selectedSubject === s.value ? '#22d3ee' : '#94a3b8',
                  }}>
                  {s.label}
                </button>
              )) : ['Mathématiques', 'SVT', 'Physique-Chimie', 'Français', 'Histoire-Géo', 'Anglais'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSubject(s)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    background: selectedSubject === s ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selectedSubject === s ? 'rgba(6,182,212,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    color: selectedSubject === s ? '#22d3ee' : '#94a3b8',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Series */}
          {(selectedExamType === 'BAC' || selectedExamType === 'BEPC' || selectedMode === 'COMPETITIVE') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Série {selectedMode === 'COMPETITIVE' ? '*' : ''}
              </label>
              <div className="flex flex-wrap gap-2">
                {(series.length > 0 ? series : [
                  { value: 'A', label: 'Série A' },
                  { value: 'B', label: 'Série B' },
                  { value: 'C', label: 'Série C' },
                  { value: 'D', label: 'Série D' },
                  { value: 'E', label: 'Série E' },
                ]).map((s: any) => (
                  <button
                    key={s.value}
                    onClick={() => setSelectedSeries(s.value)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
                    style={{
                      background: selectedSeries === s.value ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${selectedSeries === s.value ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.1)'}`,
                      color: selectedSeries === s.value ? '#fbbf24' : '#94a3b8',
                    }}>
                    {s.label || s.value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Number of questions */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Nombre de questions : <span className="text-white">{questionLimit}</span>
            </label>
            <div className="flex gap-2">
              {[5, 10, 20, 30].map((n) => (
                <button
                  key={n}
                  onClick={() => setQuestionLimit(n)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    background: questionLimit === n ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${questionLimit === n ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    color: questionLimit === n ? '#a78bfa' : '#94a3b8',
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Difficulté</label>
            <div className="flex gap-2">
              {[
                { value: '', label: 'Mixte' },
                { value: 'EASY', label: 'Facile' },
                { value: 'MEDIUM', label: 'Moyen' },
                { value: 'HARD', label: 'Difficile' },
              ].map((d) => (
                <button
                  key={d.value}
                  onClick={() => setSelectedDifficulty(d.value)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    background: selectedDifficulty === d.value ? 'rgba(6,182,212,0.3)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selectedDifficulty === d.value ? 'rgba(6,182,212,0.6)' : 'rgba(255,255,255,0.1)'}`,
                    color: selectedDifficulty === d.value ? '#22d3ee' : '#94a3b8',
                  }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleStartQuiz}
          disabled={loading || !selectedExamType}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>Lancer le quiz <ChevronRight className="w-5 h-5" /></>
          )}
        </button>

        {/* Paywall modal */}
        {showPaywall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)' }}>
            <div className="neo-card p-8 max-w-sm w-full text-center">
              <Lock className="w-12 h-12 text-purple-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Abonnement requis</h2>
              <p className="text-slate-400 text-sm mb-6">Abonne-toi pour accéder aux quiz et à toutes les épreuves.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowPaywall(false)}
                  className="flex-1 py-2 rounded-xl text-slate-400 text-sm border border-slate-600 hover:border-slate-500 transition-colors">
                  Plus tard
                </button>
                <Link href="/subscribe"
                  className="flex-1 py-2 rounded-xl text-white text-sm font-semibold text-center"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
                  S'abonner
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── STEP: PLAYING ──────────────────────────────────────────────────────────
  if (step === 'playing' && quiz) {
    const currentQ = quiz.questions[quiz.currentIndex];
    const progress = ((quiz.currentIndex) / quiz.questions.length) * 100;
    const isLast = quiz.currentIndex === quiz.questions.length - 1;
    const timerIsUrgent = timeRemaining !== null && timeRemaining < 30;

    return (
      <div className="flex flex-col min-h-[calc(100vh-80px)] animate-fade-up">
        {/* Header */}
        <div className="sticky top-0 z-10 pb-4" style={{ background: 'var(--bg-base, #0a0f1e)' }}>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full mb-4 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #7c3aed, #0891b2)',
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">
                <span className="text-white font-bold">{quiz.currentIndex + 1}</span>/{quiz.questions.length}
              </span>
              {quiz.streak > 1 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-bold text-orange-400">{quiz.streak}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {timeRemaining !== null && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg"
                  style={{
                    background: timerIsUrgent ? 'rgba(239,68,68,0.15)' : 'rgba(6,182,212,0.1)',
                    border: `1px solid ${timerIsUrgent ? 'rgba(239,68,68,0.4)' : 'rgba(6,182,212,0.3)'}`,
                  }}>
                  <Clock className={`w-3.5 h-3.5 ${timerIsUrgent ? 'text-red-400' : 'text-cyan-400'}`} />
                  <span className={`text-sm font-mono font-bold ${timerIsUrgent ? 'text-red-400' : 'text-cyan-400'}`}>
                    {Math.floor((timeRemaining || 0) / 60).toString().padStart(2, '0')}:{((timeRemaining || 0) % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}

              <button
                onClick={() => setShowAbandonConfirm(true)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Abandonner
              </button>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 space-y-6">
          <div className="neo-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                {currentQ.type === 'MULTIPLE_CHOICE' ? 'QCM' :
                  currentQ.type === 'TRUE_FALSE' ? 'Vrai/Faux' :
                    currentQ.type === 'SHORT_ANSWER' ? 'Réponse courte' : 'Calcul'}
              </span>
              <span className="text-xs text-slate-500">
                {currentQ.difficulty === 'EASY' ? '⭐' : currentQ.difficulty === 'MEDIUM' ? '⭐⭐' : currentQ.difficulty === 'HARD' ? '⭐⭐⭐' : '⭐⭐⭐⭐'}
              </span>
            </div>
            <p className="text-white text-base leading-relaxed font-medium">{currentQ.content}</p>
          </div>

          {/* Options */}
          {currentQ.type === 'MULTIPLE_CHOICE' && currentQ.options && (
            <div className="space-y-3">
              {currentQ.options.map((option, i) => {
                const label = OPTION_LABELS[i];
                const color = OPTION_COLORS[i];
                const isSelected = selectedOption === label;

                return (
                  <button
                    key={i}
                    onClick={() => !quiz.showExplanation && handleAnswer(label)}
                    onMouseEnter={() => setHoveredOption(i)}
                    onMouseLeave={() => setHoveredOption(null)}
                    disabled={quiz.showExplanation}
                    className="w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all duration-150 disabled:cursor-default"
                    style={{
                      background: isSelected ? color.hover : hoveredOption === i && !quiz.showExplanation ? color.hover : color.base,
                      border: `1px solid ${isSelected ? color.border.replace('0.4', '0.7') : hoveredOption === i && !quiz.showExplanation ? color.border : color.border}`,
                    }}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: isSelected ? color.border : 'rgba(255,255,255,0.06)', color: isSelected ? '#fff' : color.text }}>
                      {label}
                    </div>
                    <span className="text-sm text-slate-200">{option}</span>
                  </button>
                );
              })}
            </div>
          )}

          {currentQ.type === 'TRUE_FALSE' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'true', label: '✓ Vrai', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.4)', text: '#4ade80' },
                { value: 'false', label: '✗ Faux', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.4)', text: '#f87171' },
              ].map(({ value, label, bg, border, text }) => (
                <button
                  key={value}
                  onClick={() => !quiz.showExplanation && handleAnswer(value)}
                  disabled={quiz.showExplanation}
                  className="py-6 rounded-xl text-lg font-bold transition-all duration-150 disabled:cursor-default"
                  style={{
                    background: selectedOption === value ? bg : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${selectedOption === value ? border : 'rgba(255,255,255,0.08)'}`,
                    color: selectedOption === value ? text : '#94a3b8',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {(currentQ.type === 'SHORT_ANSWER' || currentQ.type === 'ESSAY') && (
            <div className="space-y-3">
              {currentQ.type === 'ESSAY' ? (
                <input
                  type="number"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                  disabled={quiz.showExplanation}
                  placeholder="Entrez votre réponse numérique..."
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                />
              ) : (
                <textarea
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  disabled={quiz.showExplanation}
                  placeholder="Entrez votre réponse..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none transition-all resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                />
              )}
              {!quiz.showExplanation && (
                <button
                  onClick={handleTextSubmit}
                  disabled={!textAnswer.trim()}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
                  Valider →
                </button>
              )}
            </div>
          )}

          {/* Practice mode: post-answer explanation */}
          {quiz.mode === 'PRACTICE' && quiz.showExplanation && selectedOption && (
            <div className="neo-card p-5 space-y-3"
              style={{ border: '1px solid rgba(139,92,246,0.3)' }}>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Explication</p>
              <p className="text-slate-300 text-sm">La réponse correcte sera révélée après soumission finale.</p>
              <button
                onClick={handleNextQuestion}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
                {isLast ? 'Terminer le quiz →' : 'Question suivante →'}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 flex justify-between items-center">
          {quiz.mode === 'PRACTICE' && !quiz.showExplanation && (
            <button onClick={handleSkip}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
              <SkipForward className="w-4 h-4" /> Passer
            </button>
          )}
          {quiz.mode !== 'PRACTICE' && (
            <button
              onClick={() => handleSubmitAll()}
              disabled={loading}
              className="ml-auto flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
              {loading && <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />}
              Terminer
            </button>
          )}
        </div>

        {/* Abandon confirm */}
        {showAbandonConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)' }}>
            <div className="neo-card p-8 max-w-sm w-full text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Abandonner le quiz ?</h2>
              <p className="text-slate-400 text-sm mb-6">Ta progression sera perdue.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowAbandonConfirm(false)}
                  className="flex-1 py-2 rounded-xl text-slate-300 text-sm border border-slate-600 hover:border-slate-500 transition-colors">
                  Continuer
                </button>
                <button onClick={handleAbandon}
                  className="flex-1 py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ background: 'rgba(239,68,68,0.7)' }}>
                  Abandonner
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── STEP: RESULTS ──────────────────────────────────────────────────────────
  if (step === 'results' && result) {
    const scoreAngle = (result.score / 100) * 283;
    const errors = result.questionsWithAnswers?.filter((q: any) => !q.isCorrect && !q.isSkipped) || [];
    const bestStreak = quiz?.bestStreak || 0;

    return (
      <div className="space-y-6 animate-fade-up max-w-2xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-1">Résultats</h1>
          <p className="text-slate-400 text-sm">
            {result.isPassed ? '🎉 Félicitations !' : "Continue l'entraînement !"}
          </p>
        </div>

        {/* Score arc */}
        <div className="neo-card p-8 flex flex-col items-center">
          <div className="relative w-40 h-40 mb-4">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" strokeDasharray="283" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke={result.score >= 70 ? '#4ade80' : result.score >= 50 ? '#fbbf24' : '#f87171'}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${scoreAngle} 283`}
                style={{ transition: 'stroke-dasharray 1s ease-out' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white">{result.score}%</span>
              <span className="text-xs text-slate-400">{result.correctAnswers}/{result.totalQuestions}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full">
            <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-green-400">{result.correctAnswers}</p>
              <p className="text-xs text-slate-400">Correctes</p>
            </div>
            <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-red-400">{result.wrongAnswers}</p>
              <p className="text-xs text-slate-400">Fausses</p>
            </div>
            <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)' }}>
              <SkipForward className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-slate-400">{result.skippedQuestions}</p>
              <p className="text-xs text-slate-400">Passées</p>
            </div>
          </div>

          {result.xpGained > 0 && (
            <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">+{result.xpGained} XP gagnés</span>
            </div>
          )}
        </div>

        {/* Weak areas */}
        {result.weakAreas && result.weakAreas.length > 0 && (
          <div className="neo-card p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" /> Points à retravailler
            </h3>
            <div className="flex flex-wrap gap-2">
              {result.weakAreas.map((area: string) => (
                <span key={area} className="px-3 py-1 rounded-full text-xs font-medium"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Review errors */}
        {errors.length > 0 && (
          <div className="neo-card overflow-hidden">
            <button
              onClick={() => setShowErrorReview(!showErrorReview)}
              className="w-full p-5 flex items-center justify-between text-left">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-white">Revoir mes erreurs ({errors.length})</span>
              </div>
              {showErrorReview ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showErrorReview && (
              <div className="border-t border-white/5 divide-y divide-white/5">
                {errors.map((q: any, i: number) => (
                  <div key={q.id || i} className="p-5 space-y-2">
                    <p className="text-sm text-white font-medium">{q.content}</p>
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-red-400">Ta réponse : {q.userAnswer || '(non répondue)'}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-green-400">Bonne réponse : {q.correctAnswer}</p>
                    </div>
                    {q.explanation && (
                      <p className="text-xs text-slate-400 bg-white/[0.03] rounded-lg p-3 mt-1">{q.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleRestart}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', color: '#a78bfa' }}>
            <RotateCcw className="w-4 h-4" /> Rejouer
          </button>
          <button
            onClick={() => setStep('home')}
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
            <Home className="w-4 h-4" /> Menu
          </button>
        </div>
      </div>
    );
  }

  return null;
}
