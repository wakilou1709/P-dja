'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Sparkles,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckSquare,
  Square,
  X,
  AlertTriangle,
} from 'lucide-react';
import { adminApi, examsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'ESSAY';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
type ModalMode = 'create' | 'edit' | 'generate' | null;
type GenerateStep = 1 | 2 | 3;

const TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'QCM',
  TRUE_FALSE: 'Vrai/Faux',
  SHORT_ANSWER: 'Réponse ouverte',
  ESSAY: 'Calcul numérique',
};

const DIFF_LABELS: Record<Difficulty, string> = {
  EASY: 'Facile',
  MEDIUM: 'Moyen',
  HARD: 'Difficile',
  EXPERT: 'Expert',
};

const DIFF_COLORS: Record<Difficulty, string> = {
  EASY: 'text-green-400',
  MEDIUM: 'text-yellow-400',
  HARD: 'text-orange-400',
  EXPERT: 'text-red-400',
};

const EMPTY_FORM = {
  examId: '',
  content: '',
  type: 'MULTIPLE_CHOICE' as QuestionType,
  options: ['', '', '', ''],
  correctAnswer: 'A',
  explanation: '',
  difficulty: 'MEDIUM' as Difficulty,
};

const EMPTY_GENERATE = {
  examId: '',
  examType: 'BAC',
  subject: '',
  series: '',
  difficulty: 'MEDIUM',
  count: 5,
  questionTypes: ['MULTIPLE_CHOICE'] as string[],
};

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterExamId, setFilterExamId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate state
  const [generateForm, setGenerateForm] = useState(EMPTY_GENERATE);
  const [generateStep, setGenerateStep] = useState<GenerateStep>(1);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [selectedGenerated, setSelectedGenerated] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
    loadExams();
  }, [page, filterType, filterDifficulty, filterExamId]);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await (adminApi as any).questions.getAll({
        ...(filterType && { type: filterType }),
        ...(filterDifficulty && { difficulty: filterDifficulty }),
        ...(filterExamId && { examId: filterExamId }),
        page,
        limit: 20,
      });
      setQuestions(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError('Erreur lors du chargement des questions');
    } finally {
      setLoading(false);
    }
  };

  const loadExams = async () => {
    try {
      const data = await examsApi.getAll({ limit: 100 });
      setExams(data.data || data || []);
    } catch {}
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
    setModalMode('create');
  };

  const openEdit = (q: any) => {
    setForm({
      examId: q.examId,
      content: q.content,
      type: q.type,
      options: Array.isArray(q.options) ? q.options : ['', '', '', ''],
      correctAnswer: q.correctAnswer || '',
      explanation: q.explanation || '',
      difficulty: q.difficulty,
    });
    setEditingId(q.id);
    setError(null);
    setModalMode('edit');
  };

  const openGenerate = () => {
    setGenerateForm(EMPTY_GENERATE);
    setGenerateStep(1);
    setGeneratedQuestions([]);
    setSelectedGenerated(new Set());
    setError(null);
    setModalMode('generate');
  };

  const handleSave = async () => {
    if (!form.examId || !form.content) {
      setError('Examen et contenu sont requis');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: any = {
        examId: form.examId,
        content: form.content,
        type: form.type,
        correctAnswer: form.correctAnswer,
        explanation: form.explanation || undefined,
        difficulty: form.difficulty,
      };
      if (form.type === 'MULTIPLE_CHOICE') {
        payload.options = form.options.filter((o) => o.trim());
      }

      if (modalMode === 'edit' && editingId) {
        await (adminApi as any).questions.update(editingId, payload);
      } else {
        await (adminApi as any).questions.create(payload);
      }
      setModalMode(null);
      loadQuestions();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await (adminApi as any).questions.delete(id);
      loadQuestions();
    } catch {
      setError('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleGenerate = async () => {
    if (!generateForm.subject) {
      setError('Matière requise');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const data = await (adminApi as any).questions.generate({
        examType: generateForm.examType,
        subject: generateForm.subject,
        series: generateForm.series || undefined,
        difficulty: generateForm.difficulty,
        count: generateForm.count,
        questionTypes: generateForm.questionTypes,
        saveDirectly: false,
      });
      setGeneratedQuestions(data);
      setSelectedGenerated(new Set(data.map((_: any, i: number) => i)));
      setGenerateStep(3);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur lors de la génération IA');
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkSave = async () => {
    if (!generateForm.examId) {
      setError('Sélectionnez un examen pour sauvegarder');
      return;
    }
    const toSave = generatedQuestions
      .filter((_, i) => selectedGenerated.has(i))
      .map((q) => ({
        examId: generateForm.examId,
        content: q.content,
        type: q.type,
        options: q.options || undefined,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || undefined,
        difficulty: generateForm.difficulty,
      }));

    setBulkSaving(true);
    setError(null);
    try {
      await (adminApi as any).questions.bulkCreate({ questions: toSave });
      setModalMode(null);
      loadQuestions();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setBulkSaving(false);
    }
  };

  const filteredQuestions = questions.filter((q) =>
    !searchQuery || q.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Banque de questions</h1>
          <p className="text-slate-400 text-sm mt-0.5">{total} questions au total</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={openGenerate}
            variant="outline"
            className="flex items-center gap-2 border-purple-500/40 text-purple-400 hover:bg-purple-500/10">
            <Sparkles className="w-4 h-4" /> Générer avec l'IA
          </Button>
          <Button
            onClick={openCreate}
            className="flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
            <Plus className="w-4 h-4" /> Nouvelle question
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="pl-9 pr-4 py-2 rounded-xl text-sm text-white placeholder-slate-500 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>

        <Select value={filterType || 'all'} onValueChange={(v) => { setFilterType(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44 bg-white/5 border-white/10 text-slate-300">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterDifficulty || 'all'} onValueChange={(v) => { setFilterDifficulty(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-40 bg-white/5 border-white/10 text-slate-300">
            <SelectValue placeholder="Difficulté" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {(Object.keys(DIFF_LABELS) as Difficulty[]).map((d) => (
              <SelectItem key={d} value={d}>{DIFF_LABELS[d]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="neo-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <p>Aucune question trouvée.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Question', 'Type', 'Difficulté', 'Examen', 'Réponses', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-slate-400 font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredQuestions.map((q) => (
                <tr key={q.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-sm text-white truncate" title={q.content}>
                      {q.content.length > 80 ? q.content.slice(0, 80) + '…' : q.content}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                      {TYPE_LABELS[q.type as QuestionType] || q.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${DIFF_COLORS[q.difficulty as Difficulty] || 'text-slate-400'}`}>
                      {DIFF_LABELS[q.difficulty as Difficulty] || q.difficulty}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-slate-400">
                      {q.exam?.type} {q.exam?.subject && `· ${q.exam.subject}`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {q.timesAnswered > 0 ? `${q.timesCorrect}/${q.timesAnswered}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(q)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeletingId(q.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Page {page} sur {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="border-white/10 text-slate-300 hover:bg-white/5">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="border-white/10 text-slate-300 hover:bg-white/5">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalMode === 'create' || modalMode === 'edit'} onOpenChange={() => setModalMode(null)}>
        <DialogContent className="max-w-2xl bg-slate-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{modalMode === 'edit' ? 'Modifier la question' : 'Nouvelle question'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-xl p-3 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Examen *</Label>
                <Select value={form.examId} onValueChange={(v) => setForm({ ...form, examId: v })}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Sélectionner un examen" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.type} - {e.subject} {e.series ? `(${e.series})` : ''} {e.year ? e.year : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as QuestionType, correctAnswer: '', options: ['', '', '', ''] })}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                      <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Question *</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Texte de la question..."
                className="mt-1 bg-white/5 border-white/10 text-white placeholder-slate-500 resize-none"
                rows={3}
              />
            </div>

            {/* MCQ options */}
            {form.type === 'MULTIPLE_CHOICE' && (
              <div>
                <Label className="text-slate-300 mb-2 block">Options</Label>
                <div className="space-y-2">
                  {['A', 'B', 'C', 'D'].map((letter, i) => (
                    <div key={letter} className="flex items-center gap-2">
                      <button
                        onClick={() => setForm({ ...form, correctAnswer: letter })}
                        className="w-7 h-7 rounded-lg text-xs font-bold flex-shrink-0 transition-all"
                        style={{
                          background: form.correctAnswer === letter ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)',
                          border: `1px solid ${form.correctAnswer === letter ? 'rgba(34,197,94,0.6)' : 'rgba(255,255,255,0.1)'}`,
                          color: form.correctAnswer === letter ? '#4ade80' : '#94a3b8',
                        }}>
                        {letter}
                      </button>
                      <Input
                        value={form.options[i]}
                        onChange={(e) => {
                          const opts = [...form.options];
                          opts[i] = e.target.value;
                          setForm({ ...form, options: opts });
                        }}
                        placeholder={`Option ${letter}`}
                        className="bg-white/5 border-white/10 text-white placeholder-slate-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* True/False */}
            {form.type === 'TRUE_FALSE' && (
              <div>
                <Label className="text-slate-300 mb-2 block">Réponse correcte</Label>
                <div className="flex gap-3">
                  {[{ v: 'true', l: 'Vrai' }, { v: 'false', l: 'Faux' }].map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => setForm({ ...form, correctAnswer: v })}
                      className="flex-1 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: form.correctAnswer === v ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${form.correctAnswer === v ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        color: form.correctAnswer === v ? '#4ade80' : '#94a3b8',
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Short answer / Essay */}
            {(form.type === 'SHORT_ANSWER' || form.type === 'ESSAY') && (
              <div>
                <Label className="text-slate-300">Réponse correcte *</Label>
                <Input
                  type={form.type === 'ESSAY' ? 'text' : 'text'}
                  value={form.correctAnswer}
                  onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                  placeholder={form.type === 'ESSAY' ? 'Résultat numérique...' : 'Réponse attendue...'}
                  className="mt-1 bg-white/5 border-white/10 text-white placeholder-slate-500"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Difficulté</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v as Difficulty })}>
                  <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(DIFF_LABELS) as Difficulty[]).map((d) => (
                      <SelectItem key={d} value={d}>{DIFF_LABELS[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Explication (optionnel)</Label>
              <Textarea
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                placeholder="Explication de la bonne réponse..."
                className="mt-1 bg-white/5 border-white/10 text-white placeholder-slate-500 resize-none"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalMode(null)} className="border-white/10 text-slate-300">
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={saving}
              style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {modalMode === 'edit' ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Modal */}
      <Dialog open={modalMode === 'generate'} onOpenChange={() => setModalMode(null)}>
        <DialogContent className="max-w-2xl bg-slate-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" /> Générer avec l'IA
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-2 py-1">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                  style={{
                    background: generateStep >= s ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${generateStep >= s ? 'rgba(139,92,246,0.7)' : 'rgba(255,255,255,0.1)'}`,
                    color: generateStep >= s ? '#a78bfa' : '#64748b',
                  }}>
                  {s}
                </div>
                {s < 3 && <div className="flex-1 h-px w-12" style={{ background: 'rgba(255,255,255,0.08)' }} />}
              </div>
            ))}
            <span className="ml-2 text-xs text-slate-400">
              {generateStep === 1 ? 'Configuration' : generateStep === 2 ? 'Génération...' : 'Révision'}
            </span>
          </div>

          {error && (
            <div className="rounded-xl p-3 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
              {error}
            </div>
          )}

          {/* Step 1: Config */}
          {generateStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Type d'examen</Label>
                  <Select value={generateForm.examType} onValueChange={(v) => setGenerateForm({ ...generateForm, examType: v })}>
                    <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['BAC', 'BEPC', 'CEP', 'CONCOURS_FP', 'LICENCE'].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Série</Label>
                  <Input
                    value={generateForm.series}
                    onChange={(e) => setGenerateForm({ ...generateForm, series: e.target.value })}
                    placeholder="D, C, A..."
                    className="mt-1 bg-white/5 border-white/10 text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Matière *</Label>
                <Input
                  value={generateForm.subject}
                  onChange={(e) => setGenerateForm({ ...generateForm, subject: e.target.value })}
                  placeholder="ex: Mathématiques, SVT, Physique-Chimie..."
                  className="mt-1 bg-white/5 border-white/10 text-white placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Difficulté</Label>
                  <Select value={generateForm.difficulty} onValueChange={(v) => setGenerateForm({ ...generateForm, difficulty: v })}>
                    <SelectTrigger className="mt-1 bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DIFF_LABELS) as Difficulty[]).map((d) => (
                        <SelectItem key={d} value={d}>{DIFF_LABELS[d]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Nombre (max 10)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={generateForm.count}
                    onChange={(e) => setGenerateForm({ ...generateForm, count: parseInt(e.target.value) || 1 })}
                    className="mt-1 bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300 mb-2 block">Types de questions</Label>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => {
                    const selected = generateForm.questionTypes.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => {
                          const types = selected
                            ? generateForm.questionTypes.filter((x) => x !== t)
                            : [...generateForm.questionTypes, t];
                          setGenerateForm({ ...generateForm, questionTypes: types.length ? types : [t] });
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: selected ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${selected ? 'rgba(139,92,246,0.6)' : 'rgba(255,255,255,0.1)'}`,
                          color: selected ? '#a78bfa' : '#94a3b8',
                        }}>
                        {TYPE_LABELS[t]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Generating */}
          {generateStep === 2 && (
            <div className="py-16 text-center">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">Génération en cours...</p>
              <p className="text-slate-400 text-sm mt-1">Claude génère {generateForm.count} questions de qualité</p>
            </div>
          )}

          {/* Step 3: Review */}
          {generateStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300 mb-1 block">Examen de destination *</Label>
                <Select value={generateForm.examId} onValueChange={(v) => setGenerateForm({ ...generateForm, examId: v })}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Sélectionner l'examen cible" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.type} - {e.subject} {e.series ? `(${e.series})` : ''} {e.year || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-slate-400">
                {selectedGenerated.size}/{generatedQuestions.length} question(s) sélectionnée(s) · Décochez pour exclure
              </p>

              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {generatedQuestions.map((q, i) => (
                  <div key={i}
                    className="p-4 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: selectedGenerated.has(i) ? 'rgba(139,92,246,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${selectedGenerated.has(i) ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    }}
                    onClick={() => {
                      const s = new Set(selectedGenerated);
                      if (s.has(i)) s.delete(i); else s.add(i);
                      setSelectedGenerated(s);
                    }}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex-shrink-0">
                        {selectedGenerated.has(i)
                          ? <CheckSquare className="w-4 h-4 text-purple-400" />
                          : <Square className="w-4 h-4 text-slate-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }}>
                            {TYPE_LABELS[q.type as QuestionType] || q.type}
                          </span>
                        </div>
                        <p className="text-sm text-white">{q.content}</p>
                        {q.options && (
                          <div className="mt-1 space-y-0.5">
                            {q.options.map((opt: string, j: number) => (
                              <p key={j} className={`text-xs ${['A', 'B', 'C', 'D'][j] === q.correctAnswer ? 'text-green-400' : 'text-slate-400'}`}>
                                {['A', 'B', 'C', 'D'][j]}. {opt}
                              </p>
                            ))}
                          </div>
                        )}
                        {q.type !== 'MULTIPLE_CHOICE' && (
                          <p className="text-xs text-green-400 mt-1">Réponse : {q.correctAnswer}</p>
                        )}
                        {q.explanation && (
                          <p className="text-xs text-slate-500 mt-1 italic">{q.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalMode(null)} className="border-white/10 text-slate-300">
              Annuler
            </Button>
            {generateStep === 1 && (
              <Button
                onClick={async () => {
                  setGenerateStep(2);
                  await handleGenerate();
                }}
                disabled={generating || !generateForm.subject}
                style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
                {generating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Générer →
              </Button>
            )}
            {generateStep === 3 && (
              <Button
                onClick={handleBulkSave}
                disabled={bulkSaving || selectedGenerated.size === 0 || !generateForm.examId}
                style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
                {bulkSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Sauvegarder {selectedGenerated.size} question(s)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent className="max-w-sm bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" /> Supprimer la question ?
            </DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)} className="border-white/10 text-slate-300">
              Annuler
            </Button>
            <Button onClick={() => deletingId && handleDelete(deletingId)}
              style={{ background: 'rgba(239,68,68,0.8)' }}>
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
