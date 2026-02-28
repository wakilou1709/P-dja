'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Trash2, School, GraduationCap, ArrowLeft, Calendar, Upload, FileText, ChevronRight, Briefcase, BookOpen, CheckCircle, RefreshCw, Sparkles, AlertTriangle, Eye, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { adminApi, examsApi, examConfigApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ViewMode = 'structures' | 'series' | 'faculties' | 'niveaux' | 'years' | 'epreuves';

interface Structure {
  type: 'national' | 'university';
  id: string;
  label: string;
  description?: string;
}

interface ConfigItem {
  id: string;
  value: string;
  label: string;
  description?: string;
  extra?: any;
}

export default function AdminExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation state
  const [viewMode, setViewMode] = useState<ViewMode>('structures');
  const [selectedStructure, setSelectedStructure] = useState<Structure | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [selectedNiveau, setSelectedNiveau] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Config lists — chargées depuis la base de données
  const [examTypes,        setExamTypes]        = useState<ConfigItem[]>([]);
  const [universities,     setUniversities]     = useState<ConfigItem[]>([]);
  const [faculties,        setFaculties]        = useState<ConfigItem[]>([]);
  const [bacSeries,        setBacSeries]        = useState<ConfigItem[]>([]);
  const [universityLevels, setUniversityLevels] = useState<ConfigItem[]>([]);
  const [configLoading,    setConfigLoading]    = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'structure' | 'faculty' | 'series' | 'niveau' | 'year' | 'epreuve'>('structure');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [structureForm, setStructureForm] = useState({ label: '', description: '' });
  const [facultyForm, setFacultyForm] = useState('');
  const [seriesForm, setSeriesForm] = useState({ value: '', description: '' });
  const [niveauForm, setNiveauForm] = useState({ value: '', label: '', description: '' });
  const [yearForm, setYearForm] = useState(new Date().getFullYear());

  // Années ajoutées manuellement (persistées dans localStorage)
  const [addedYears, setAddedYears] = useState<Array<{
    structureType: 'national' | 'university';
    structureId: string;
    series: string | null;
    faculty: string | null;
    niveau: string | null;
    year: number;
  }>>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('pedja_admin_years') || '[]');
      } catch { return []; }
    }
    return [];
  });

  const [examForm, setExamForm] = useState({
    type: 'CEP',
    series: '',
    university: 'NONE',
    faculty: '',
    niveau: '',
    year: new Date().getFullYear(),
    subject: '',
    title: '',
    description: '',
    difficulty: 'MEDIUM',
    duration: 120,
  });

  // Correction IA state
  const [generatingCorrectionId, setGeneratingCorrectionId] = useState<string | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<{ id: string; ok: boolean } | null>(null);

  // PDF upload state
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUploadStep, setPdfUploadStep] = useState<'idle' | 'uploading' | 'preview'>('idle');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDragOver, setPdfDragOver] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const [extractedContent, setExtractedContent] = useState<any>(null);
  const [extractedCorrection, setExtractedCorrection] = useState<any>(null);
  const [extractedPdfUrl, setExtractedPdfUrl] = useState('');
  const [pdfIsScanned, setPdfIsScanned] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchExams();
    fetchConfigs();
  }, []);

  useEffect(() => { localStorage.setItem('pedja_admin_years', JSON.stringify(addedYears)); }, [addedYears]);

  const fetchConfigs = async () => {
    setConfigLoading(true);
    try {
      // Auto-seed si la table est vide
      await examConfigApi.seed().catch(() => {});
      const data = await examConfigApi.getAll();
      setExamTypes(data.examType ?? []);
      setUniversities(data.university ?? []);
      setFaculties(data.faculty ?? []);
      setBacSeries(data.bacSeries ?? []);
      setUniversityLevels(data.niveau ?? []);
    } catch (e) {
      console.error('Failed to load exam configs:', e);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await examsApi.getAll();
      setExams(response);
      return response;
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get series for BAC
  const getBacSeries = () => bacSeries;

  // Get faculties for selected university
  const getFacultiesForUniversity = (): ConfigItem[] => {
    if (!selectedStructure || selectedStructure.type !== 'university') return [];
    // Retourner les facultés scoped à cette université ou globales (sans extra.university)
    return faculties.filter(f =>
      !f.extra?.university || f.extra.university === selectedStructure.id
    );
  };

  // Get niveaux for selected faculty
  const getNiveauxForFaculty = () => universityLevels;

  // Get years based on current selection
  const getYears = () => {
    let filteredExams = exams;

    if (selectedStructure?.type === 'national') {
      if (selectedStructure.id === 'BAC' && selectedSeries) {
        filteredExams = exams.filter(
          e => e.type === 'BAC' && e.series === selectedSeries && e.university === 'NONE'
        );
      } else {
        filteredExams = exams.filter(
          e => e.type === selectedStructure.id && e.university === 'NONE'
        );
      }
    } else if (selectedStructure?.type === 'university') {
      filteredExams = exams.filter(e => e.university === selectedStructure.id);
      if (selectedFaculty) {
        filteredExams = filteredExams.filter(e => e.faculty === selectedFaculty);
      }
      if (selectedNiveau) {
        filteredExams = filteredExams.filter(e => e.niveau === selectedNiveau);
      }
    }

    const examYears = filteredExams.map(e => e.year).filter((y: any) => y != null) as number[];

    // Inclure les années ajoutées manuellement pour ce contexte
    const manualYears = addedYears
      .filter(ay =>
        ay.structureType === selectedStructure?.type &&
        ay.structureId === selectedStructure?.id &&
        ay.series === selectedSeries &&
        ay.faculty === selectedFaculty &&
        ay.niveau === selectedNiveau
      )
      .map(ay => ay.year);

    return Array.from(new Set([...examYears, ...manualYears])).sort((a, b) => b - a);
  };

  // Get exams for current selection
  const getCurrentExams = () => {
    if (!selectedYear) return [];

    let filteredExams = exams.filter(e => e.year === selectedYear);

    if (selectedStructure?.type === 'national') {
      filteredExams = filteredExams.filter(e => e.type === selectedStructure.id && e.university === 'NONE');
      if (selectedSeries) {
        filteredExams = filteredExams.filter(e => e.series === selectedSeries);
      }
    } else if (selectedStructure?.type === 'university') {
      filteredExams = filteredExams.filter(e => e.university === selectedStructure.id);
      if (selectedFaculty) {
        filteredExams = filteredExams.filter(e => e.faculty === selectedFaculty);
      }
      if (selectedNiveau) {
        filteredExams = filteredExams.filter(e => e.niveau === selectedNiveau);
      }
    }

    return filteredExams;
  };

  // Handlers
  const handleSelectStructure = (structure: Structure) => {
    setSelectedStructure(structure);
    setSelectedSeries(null);
    setSelectedFaculty(null);
    setSelectedNiveau(null);
    setSelectedYear(null);

    if (structure.type === 'national' && structure.id === 'BAC') {
      setViewMode('series');
    } else if (structure.type === 'university') {
      setViewMode('faculties');
    } else {
      setViewMode('years');
    }
  };

  const handleSelectSeries = (series: string) => {
    setSelectedSeries(series);
    setViewMode('years');
  };

  const handleSelectFaculty = (facultyValue: string) => {
    setSelectedFaculty(facultyValue);
    setViewMode('niveaux');
  };

  const handleSelectNiveau = (niveau: string) => {
    setSelectedNiveau(niveau);
    setViewMode('years');
  };

  const handleSelectYear = (year: number) => {
    setSelectedYear(year);
    setViewMode('epreuves');
  };

  const handleBack = () => {
    if (viewMode === 'epreuves') {
      setSelectedYear(null);
      if (selectedNiveau) {
        setViewMode('years');
      } else if (selectedFaculty) {
        setViewMode('niveaux');
      } else if (selectedSeries) {
        setViewMode('years');
      } else {
        setViewMode('years');
      }
    } else if (viewMode === 'years') {
      if (selectedNiveau) {
        setSelectedNiveau(null);
        setViewMode('niveaux');
      } else if (selectedFaculty) {
        setSelectedFaculty(null);
        setViewMode('faculties');
      } else if (selectedSeries) {
        setSelectedSeries(null);
        setViewMode('series');
      } else {
        setSelectedStructure(null);
        setViewMode('structures');
      }
    } else if (viewMode === 'niveaux') {
      setSelectedFaculty(null);
      setViewMode('faculties');
    } else if (viewMode === 'faculties') {
      setSelectedStructure(null);
      setViewMode('structures');
    } else if (viewMode === 'series') {
      setSelectedStructure(null);
      setViewMode('structures');
    }
  };

  const handleAddStructure = (type: 'national' | 'university') => {
    setStructureForm({ label: '', description: '' });
    setModalType('structure');
    setSelectedItem({ type });
    setModalOpen(true);
  };

  const handleDeleteStructure = async (structure: Structure) => {
    const item = structure.type === 'national'
      ? examTypes.find(t => t.value === structure.id)
      : universities.find(u => u.value === structure.id);

    const structureName = item?.label || structure.id;
    if (!confirm(`Supprimer "${structureName}" ?\n\nATTENTION : Toutes les épreuves associées seront supprimées.`)) {
      return;
    }

    try {
      if (item?.id) await examConfigApi.remove(item.id);
      setAddedYears(prev => prev.filter(ay =>
        !(ay.structureType === structure.type && ay.structureId === structure.id)
      ));
      await fetchConfigs();
    } catch (e) {
      console.error('Failed to delete structure:', e);
    }
  };

  // ── Structure Edit ────────────────────────────────────────────────────────
  const handleEditStructure = (structure: Structure) => {
    const item = structure.type === 'national'
      ? examTypes.find(t => t.value === structure.id)
      : universities.find(u => u.value === structure.id);
    setStructureForm({ label: item?.label || '', description: item?.description || '' });
    setSelectedItem({ ...structure, editing: true, configId: item?.id });
    setModalType('structure');
    setModalOpen(true);
  };

  // ── Series handlers ──────────────────────────────────────────────────────
  const handleAddSeries = () => {
    setSeriesForm({ value: '', description: '' });
    setSelectedItem(null);
    setModalType('series');
    setModalOpen(true);
  };
  const handleEditSeries = (s: ConfigItem) => {
    setSeriesForm({ value: s.value, description: s.description || '' });
    setSelectedItem(s);
    setModalType('series');
    setModalOpen(true);
  };
  const handleDeleteSeries = async (s: ConfigItem) => {
    if (!confirm(`Supprimer la Série ${s.value} ?`)) return;
    try {
      await examConfigApi.remove(s.id);
      setAddedYears(prev => prev.filter(ay => ay.series !== s.value));
      await fetchConfigs();
    } catch (e) {
      console.error('Failed to delete series:', e);
    }
  };

  // ── Niveau handlers ───────────────────────────────────────────────────────
  const handleAddNiveau = () => {
    setNiveauForm({ value: '', label: '', description: '' });
    setSelectedItem(null);
    setModalType('niveau');
    setModalOpen(true);
  };
  const handleEditNiveau = (n: ConfigItem) => {
    setNiveauForm({ value: n.value, label: n.label, description: n.description || '' });
    setSelectedItem(n);
    setModalType('niveau');
    setModalOpen(true);
  };
  const handleDeleteNiveau = async (n: ConfigItem) => {
    if (!confirm(`Supprimer le niveau "${n.label}" ?`)) return;
    try {
      await examConfigApi.remove(n.id);
      setAddedYears(prev => prev.filter(ay => ay.niveau !== n.value));
      await fetchConfigs();
    } catch (e) {
      console.error('Failed to delete niveau:', e);
    }
  };

  // ── Faculty handlers ──────────────────────────────────────────────────────
  const handleAddFaculty = () => {
    setFacultyForm('');
    setSelectedItem(null);
    setModalType('faculty');
    setModalOpen(true);
  };
  const handleEditFaculty = (faculty: ConfigItem) => {
    setFacultyForm(faculty.label);
    setSelectedItem(faculty);
    setModalType('faculty');
    setModalOpen(true);
  };
  const handleDeleteFaculty = async (faculty: ConfigItem) => {
    if (!confirm(`Supprimer la faculté "${faculty.label}" ?`)) return;
    try {
      await examConfigApi.remove(faculty.id);
      setAddedYears(prev => prev.filter(ay => ay.faculty !== faculty.value));
      await fetchConfigs();
    } catch (e) {
      console.error('Failed to delete faculty:', e);
    }
  };

  const handleAddYear = () => {
    setYearForm(new Date().getFullYear());
    setModalType('year');
    setModalOpen(true);
  };

  const handleDeleteYear = async (year: number) => {
    if (!confirm(`Supprimer l'année ${year} ?\n\nToutes les épreuves de cette année seront supprimées.`)) {
      return;
    }

    try {
      // Filtrer les épreuves de cette année selon le contexte actuel
      let examsToDelete = exams.filter(e => e.year === year);
      if (selectedStructure?.type === 'national') {
        examsToDelete = examsToDelete.filter(e => e.type === selectedStructure.id && e.university === 'NONE');
        if (selectedSeries) examsToDelete = examsToDelete.filter(e => e.series === selectedSeries);
      } else if (selectedStructure?.type === 'university') {
        examsToDelete = examsToDelete.filter(e => e.university === selectedStructure.id);
        if (selectedFaculty) examsToDelete = examsToDelete.filter(e => e.faculty === selectedFaculty);
        if (selectedNiveau) examsToDelete = examsToDelete.filter(e => e.niveau === selectedNiveau);
      }

      await Promise.all(examsToDelete.map(exam => adminApi.deleteExam(exam.id)));

      // Supprimer l'année des années ajoutées manuellement
      setAddedYears(prev => prev.filter(ay => !(
        ay.structureType === selectedStructure?.type &&
        ay.structureId === selectedStructure?.id &&
        ay.series === selectedSeries &&
        ay.faculty === selectedFaculty &&
        ay.niveau === selectedNiveau &&
        ay.year === year
      )));

      fetchExams();
    } catch (error) {
      console.error('Failed to delete year:', error);
    }
  };

  // PDF upload handlers
  const handleOpenPdfModal = () => {
    setPdfModalOpen(true);
    setPdfUploadStep('idle');
    setPdfFile(null);
    setPdfUploadError(null);
    setExtractedContent(null);
    setExtractedCorrection(null);
    setExtractedPdfUrl('');
    setPdfIsScanned(false);
  };

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPdfDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setPdfUploadError(null);
    } else {
      setPdfUploadError('Seuls les fichiers PDF sont acceptés.');
    }
  };

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFile(file);
      setPdfUploadError(null);
    }
  };

  const handleExtractPdf = async () => {
    if (!pdfFile) return;
    setPdfUploadStep('uploading');
    setPdfUploadError(null);
    try {
      const result = await adminApi.uploadExamPdf(pdfFile);
      setExtractedContent(result.content);
      setExtractedCorrection(result.correction ?? null);
      setExtractedPdfUrl(result.pdfUrl);
      setPdfIsScanned(result.isScanned);
      setPdfUploadStep('preview');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Erreur lors du traitement';
      setPdfUploadError(msg);
      setPdfUploadStep('idle');
    }
  };

  const handleUsePdfContent = () => {
    setPdfModalOpen(false);
    setSelectedItem(null);
    setExamForm({
      type: selectedStructure?.type === 'national'
        ? selectedStructure.id
        : (selectedStructure?.type === 'university' ? 'LICENCE' : 'CEP'),
      series: selectedSeries || '',
      university: selectedStructure?.type === 'university' ? selectedStructure.id : 'NONE',
      faculty: selectedFaculty || '',
      niveau: selectedNiveau || '',
      year: selectedYear || new Date().getFullYear(),
      subject: '',
      title: '',
      description: '',
      difficulty: 'MEDIUM',
      duration: extractedContent?.duration || 120,
    });
    setModalType('epreuve');
    setModalOpen(true);
  };

  const handleAddEpreuve = () => {
    setSelectedItem(null);
    setExamForm({
      type: selectedStructure?.type === 'national'
        ? selectedStructure.id
        : (selectedStructure?.type === 'university' ? 'LICENCE' : 'CEP'),
      series: selectedSeries || '',
      university: selectedStructure?.type === 'university' ? selectedStructure.id : 'NONE',
      faculty: selectedFaculty || '',
      niveau: selectedNiveau || '',
      year: selectedYear || new Date().getFullYear(),
      subject: '',
      title: '',
      description: '',
      difficulty: 'MEDIUM',
      duration: 120,
    });
    setModalType('epreuve');
    setModalOpen(true);
  };

  const handleEditEpreuve = (exam: any) => {
    setSelectedItem(exam);
    setExamForm({
      type: exam.type,
      series: exam.series || '',
      university: exam.university || 'NONE',
      faculty: exam.faculty || '',
      niveau: exam.niveau || '',
      year: exam.year,
      subject: exam.subject,
      title: exam.title,
      description: exam.description || '',
      difficulty: exam.difficulty,
      duration: exam.duration || 120,
    });
    setModalType('epreuve');
    setModalOpen(true);
  };

  const handleDeleteEpreuve = async (exam: any) => {
    if (!confirm(`Supprimer l'épreuve "${exam.subject}" ?`)) return;

    try {
      await adminApi.deleteExam(exam.id);
      fetchExams();
    } catch (error) {
      console.error('Failed to delete exam:', error);
    }
  };

  const handleGenerateCorrection = async (examId: string) => {
    setGeneratingCorrectionId(examId);
    setCorrectionStatus(null);
    try {
      await adminApi.generateCorrection(examId);
      setCorrectionStatus({ id: examId, ok: true });
      fetchExams();
    } catch (error) {
      console.error('Failed to generate correction:', error);
      setCorrectionStatus({ id: examId, ok: false });
    } finally {
      setGeneratingCorrectionId(null);
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setSaving(true);
    try {
      if (modalType === 'structure') {
        if (!structureForm.label.trim()) {
          setSubmitError('Le nom est obligatoire.');
          setSaving(false);
          return;
        }
        if (selectedItem?.editing) {
          // Modifier la config existante
          if (selectedItem.configId) {
            await examConfigApi.update(selectedItem.configId, {
              label: structureForm.label.trim(),
              description: structureForm.description.trim(),
            });
          }
        } else {
          // Ajouter une nouvelle config
          const newValue = structureForm.label.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
          await examConfigApi.create({
            category: selectedItem?.type === 'national' ? 'examType' : 'university',
            value: newValue,
            label: structureForm.label.trim(),
            description: structureForm.description.trim(),
          });
        }
        await fetchConfigs();

      } else if (modalType === 'series') {
        const val = seriesForm.value.trim().toUpperCase();
        if (!val) { setSubmitError('La lettre de série est obligatoire.'); setSaving(false); return; }

        if (selectedItem?.id) {
          // Modifier
          const oldVal = selectedItem.value;
          await examConfigApi.update(selectedItem.id, {
            value: val,
            label: `Série ${val}`,
            description: seriesForm.description.trim(),
          });
          if (oldVal !== val) {
            const affected = exams.filter(e => e.type === 'BAC' && e.series === oldVal);
            await Promise.all(affected.map(e => adminApi.updateExam(e.id, { series: val })));
            setAddedYears(prev => prev.map(ay => ay.series === oldVal ? { ...ay, series: val } : ay));
            await fetchExams();
          }
        } else {
          // Ajouter
          await examConfigApi.create({
            category: 'bacSeries',
            value: val,
            label: `Série ${val}`,
            description: seriesForm.description.trim(),
          });
        }
        await fetchConfigs();

      } else if (modalType === 'niveau') {
        const val = niveauForm.value.trim().toUpperCase();
        if (!val) { setSubmitError('Le code du niveau est obligatoire.'); setSaving(false); return; }

        if (selectedItem?.id) {
          // Modifier
          const oldVal = selectedItem.value;
          await examConfigApi.update(selectedItem.id, {
            value: val,
            label: niveauForm.label.trim() || val,
            description: niveauForm.description.trim(),
          });
          if (oldVal !== val) {
            const affected = exams.filter(e => e.niveau === oldVal);
            await Promise.all(affected.map(e => adminApi.updateExam(e.id, { niveau: val })));
            setAddedYears(prev => prev.map(ay => ay.niveau === oldVal ? { ...ay, niveau: val } : ay));
            await fetchExams();
          }
        } else {
          // Ajouter
          await examConfigApi.create({
            category: 'niveau',
            value: val,
            label: niveauForm.label.trim() || val,
            description: niveauForm.description.trim(),
          });
        }
        await fetchConfigs();

      } else if (modalType === 'faculty') {
        const newLabel = facultyForm.trim();
        if (!newLabel) { setSubmitError('Le nom de la faculté est obligatoire.'); setSaving(false); return; }

        if (selectedItem?.id) {
          // Modifier — valeur = label (cohérent avec le seed)
          const oldValue = selectedItem.value;
          await examConfigApi.update(selectedItem.id, {
            value: newLabel,
            label: newLabel,
          });
          if (oldValue !== newLabel) {
            const affected = exams.filter(e => e.faculty === oldValue);
            await Promise.all(affected.map(e => adminApi.updateExam(e.id, { faculty: newLabel })));
            setAddedYears(prev => prev.map(ay => ay.faculty === oldValue ? { ...ay, faculty: newLabel } : ay));
            await fetchExams();
          }
        } else {
          // Ajouter — valeur = label (cohérent avec le seed)
          await examConfigApi.create({
            category: 'faculty',
            value: newLabel,
            label: newLabel,
            extra: selectedStructure ? { university: selectedStructure.id } : undefined,
          });
        }
        await fetchConfigs();

      } else if (modalType === 'year') {
        // Persister l'année dans le contexte actuel
        const newEntry = {
          structureType: selectedStructure!.type,
          structureId: selectedStructure!.id,
          series: selectedSeries,
          faculty: selectedFaculty,
          niveau: selectedNiveau,
          year: yearForm,
        };
        setAddedYears(prev => {
          const exists = prev.some(ay =>
            ay.structureType === newEntry.structureType &&
            ay.structureId === newEntry.structureId &&
            ay.series === newEntry.series &&
            ay.faculty === newEntry.faculty &&
            ay.niveau === newEntry.niveau &&
            ay.year === newEntry.year
          );
          return exists ? prev : [...prev, newEntry];
        });
        setSelectedYear(yearForm);
        setViewMode('epreuves');

      } else if (modalType === 'epreuve') {
        if (!examForm.subject.trim()) {
          setSubmitError('La matière est obligatoire.');
          setSaving(false);
          return;
        }

        // Build clean payload — omit empty strings for optional fields
        const data: Record<string, any> = {
          type: examForm.type,
          subject: examForm.subject.trim(),
          title: (examForm.title || `${examForm.subject} ${examForm.year}`).trim(),
          year: examForm.year,
          difficulty: examForm.difficulty,
        };
        if (examForm.duration) data.duration = examForm.duration;
        if (examForm.description?.trim()) data.description = examForm.description.trim();
        if (examForm.series) data.series = examForm.series;
        if (examForm.faculty) data.faculty = examForm.faculty;
        if (examForm.niveau) data.niveau = examForm.niveau;
        data.university = examForm.university || 'NONE';

        // If we have extracted PDF content, include it
        if (extractedContent && !selectedItem) {
          data.content = extractedContent;
        }
        if (extractedCorrection && !selectedItem) {
          data.correction = extractedCorrection;
        }
        if (extractedPdfUrl && !selectedItem) {
          data.pdfUrl = extractedPdfUrl;
        }

        if (selectedItem) {
          await adminApi.updateExam(selectedItem.id, data);
        } else {
          await adminApi.createExam(data);
        }
        // Reset PDF content after use
        setExtractedContent(null);
        setExtractedCorrection(null);
        setExtractedPdfUrl('');
        fetchExams();
      }

      setModalOpen(false);
    } catch (error: any) {
      console.error('Failed to save:', error);
      const msg = error?.response?.data?.message || error?.message || 'Une erreur est survenue.';
      setSubmitError(Array.isArray(msg) ? msg.join(' — ') : msg);
    } finally {
      setSaving(false);
    }
  };

  const years = getYears();
  const currentExams = getCurrentExams();

  // Build breadcrumb
  const breadcrumb = [];
  breadcrumb.push({ label: 'Structures', onClick: () => { setSelectedStructure(null); setViewMode('structures'); } });
  if (selectedStructure) {
    breadcrumb.push({ label: selectedStructure.label, onClick: () => handleSelectStructure(selectedStructure) });
  }
  if (selectedSeries) {
    breadcrumb.push({ label: `Série ${selectedSeries}`, onClick: () => handleSelectSeries(selectedSeries) });
  }
  if (selectedFaculty) {
    const facLabel = faculties.find(f => f.value === selectedFaculty)?.label || selectedFaculty;
    breadcrumb.push({ label: facLabel, onClick: () => handleSelectFaculty(selectedFaculty) });
  }
  if (selectedNiveau) {
    breadcrumb.push({ label: selectedNiveau, onClick: () => handleSelectNiveau(selectedNiveau) });
  }
  if (selectedYear) {
    breadcrumb.push({ label: selectedYear.toString(), onClick: () => {} });
  }

  return (
    <div className="space-y-6">
      {/* Header with Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          {viewMode !== 'structures' && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="border-slate-600 bg-slate-700 hover:bg-slate-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour
            </Button>
          )}
          <div className="flex items-center gap-2 text-sm">
            {breadcrumb.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="w-4 h-4 text-gray-600" />}
                <button
                  onClick={item.onClick}
                  className={`${
                    index === breadcrumb.length - 1
                      ? 'text-white font-semibold'
                      : 'text-gray-400 hover:text-white transition'
                  }`}
                >
                  {item.label}
                </button>
              </div>
            ))}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white">
          {viewMode === 'structures' && 'Structures d\'Examens'}
          {viewMode === 'series' && 'Séries du Baccalauréat'}
          {viewMode === 'faculties' && 'Facultés'}
          {viewMode === 'niveaux' && 'Niveaux'}
          {viewMode === 'years' && 'Années'}
          {viewMode === 'epreuves' && `Épreuves ${selectedYear}`}
        </h1>
        <p className="text-gray-400 mt-2">
          {viewMode === 'structures' && 'Gérer les types d\'examens nationaux et les universités'}
          {viewMode === 'series' && 'Sélectionnez une série pour continuer'}
          {viewMode === 'faculties' && 'Sélectionnez une faculté'}
          {viewMode === 'niveaux' && 'Sélectionnez un niveau'}
          {viewMode === 'years' && 'Sélectionnez une année pour voir ses épreuves'}
          {viewMode === 'epreuves' && `${currentExams.length} épreuve(s) disponible(s)`}
        </p>
      </div>

      {/* Structures View */}
      {viewMode === 'structures' && (
        <div className="space-y-8">
          {/* Examens Nationaux */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <School className="w-5 h-5 text-purple-400" />
                Examens Nationaux
              </h2>
              <Button
                onClick={() => handleAddStructure('national')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter Type
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {examTypes.map((type) => {
                const count = exams.filter(e => e.type === type.value && e.university === 'NONE').length;
                return (
                  <Card
                    key={type.value}
                    className="bg-slate-800 border-slate-700 hover:border-purple-500 transition-all cursor-pointer group"
                    onClick={() => handleSelectStructure({ type: 'national', id: type.value, label: type.label, description: type.description })}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white flex items-center gap-2">
                            <School className="w-5 h-5 text-purple-400" />
                            {type.label}
                          </CardTitle>
                          <CardDescription className="text-gray-400 mt-1">
                            {type.description}
                          </CardDescription>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditStructure({ type: 'national', id: type.value, label: type.label, description: type.description })}
                            className="border-slate-500 bg-slate-600 hover:bg-slate-500 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteStructure({ type: 'national', id: type.value, label: type.label })}
                            className="bg-red-600 hover:bg-red-700 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">{count} épreuve(s)</span>
                        <ChevronRight className="w-5 h-5 text-purple-400 group-hover:translate-x-1 transition" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Universités */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-cyan-400" />
                Universités
              </h2>
              <Button
                onClick={() => handleAddStructure('university')}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter Université
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {universities.map((uni) => {
                const count = exams.filter(e => e.university === uni.value).length;
                return (
                  <Card
                    key={uni.value}
                    className="bg-slate-800 border-slate-700 hover:border-cyan-500 transition-all cursor-pointer group"
                    onClick={() => handleSelectStructure({ type: 'university', id: uni.value, label: uni.label })}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-cyan-600/20 rounded-lg flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">{uni.label}</h3>
                            <p className="text-sm text-gray-400">{count} épreuve(s)</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditStructure({ type: 'university', id: uni.value, label: uni.label })}
                              className="border-slate-500 bg-slate-600 hover:bg-slate-500 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteStructure({ type: 'university', id: uni.value, label: uni.label })}
                              className="bg-red-600 hover:bg-red-700 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <ChevronRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Series View (BAC only) */}
      {viewMode === 'series' && (
        <div>
          <div className="flex justify-end mb-6">
            <Button onClick={handleAddSeries} className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter Série
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getBacSeries().map((series) => {
            const count = exams.filter(e => e.type === 'BAC' && e.series === series.value).length;
            return (
              <Card
                key={series.value}
                className="bg-gradient-to-br from-purple-600 to-purple-700 border-purple-500 hover:shadow-xl hover:shadow-purple-500/30 transition-all cursor-pointer group relative"
                onClick={() => handleSelectSeries(series.value)}
              >
                <CardContent className="p-6">
                  <div className="absolute top-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditSeries(series)}
                      className="border-white/30 bg-white/10 hover:bg-white/20 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Edit className="w-3 h-3 text-white" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteSeries(series)}
                      className="bg-red-600 hover:bg-red-700 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-6xl font-bold text-white/20 mb-4">Série {series.value}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{series.description}</h3>
                  <div className="flex items-center justify-between">
                    <p className="text-purple-200 text-sm">{count} épreuve(s)</p>
                    <ChevronRight className="w-5 h-5 text-white" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        </div>
      )}

      {/* Faculties View */}
      {viewMode === 'faculties' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <Button
              onClick={handleAddFaculty}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter Faculté
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getFacultiesForUniversity().map((faculty) => {
              const count = exams.filter(e => e.university === selectedStructure?.id && e.faculty === faculty.value).length;
              return (
                <Card
                  key={faculty.value}
                  className="bg-slate-800 border-slate-700 hover:border-emerald-500 transition-all cursor-pointer group"
                  onClick={() => handleSelectFaculty(faculty.value)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{faculty.label}</h3>
                          <p className="text-sm text-gray-400">{count} épreuve(s)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditFaculty(faculty)}
                            className="border-slate-500 bg-slate-600 hover:bg-slate-500 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteFaculty(faculty)}
                            className="bg-red-600 hover:bg-red-700 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <ChevronRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Niveaux View */}
      {viewMode === 'niveaux' && (
        <div>
          <div className="flex justify-end mb-6">
            <Button onClick={handleAddNiveau} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter Niveau
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {getNiveauxForFaculty().map((niveau) => {
            const count = exams.filter(
              e => e.university === selectedStructure?.id &&
                   e.faculty === selectedFaculty &&
                   e.niveau === niveau.value
            ).length;
            return (
              <Card
                key={niveau.value}
                className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-all cursor-pointer group relative"
                onClick={() => handleSelectNiveau(niveau.value)}
              >
                <CardContent className="p-6">
                  <div className="absolute top-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditNiveau(niveau)}
                      className="border-slate-500 bg-slate-600 hover:bg-slate-500 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteNiveau(niveau)}
                      className="bg-red-600 hover:bg-red-700 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg">{niveau.label}</h3>
                      <p className="text-sm text-gray-400">{niveau.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-400">{count} épreuve(s)</span>
                    <ChevronRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
          </div>
        </div>
      )}

      {/* Years View */}
      {viewMode === 'years' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <Button
              onClick={handleAddYear}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter Année
            </Button>
          </div>

          {years.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-16 text-center">
                <Calendar className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Aucune année disponible</h3>
                <p className="text-gray-400 mb-6">Ajoutez une année pour commencer à créer des épreuves</p>
                <Button
                  onClick={handleAddYear}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une Année
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {years.map((year) => {
                let yearExams = exams.filter(e => e.year === year);

                if (selectedStructure?.type === 'national') {
                  yearExams = yearExams.filter(e => e.type === selectedStructure.id && e.university === 'NONE');
                  if (selectedSeries) {
                    yearExams = yearExams.filter(e => e.series === selectedSeries);
                  }
                } else if (selectedStructure?.type === 'university') {
                  yearExams = yearExams.filter(e => e.university === selectedStructure.id);
                  if (selectedFaculty) {
                    yearExams = yearExams.filter(e => e.faculty === selectedFaculty);
                  }
                  if (selectedNiveau) {
                    yearExams = yearExams.filter(e => e.niveau === selectedNiveau);
                  }
                }

                return (
                  <Card
                    key={year}
                    className="bg-slate-800 border-slate-700 hover:border-green-500 transition-all cursor-pointer group relative"
                    onClick={() => handleSelectYear(year)}
                  >
                    <CardContent className="p-6 text-center">
                      <Calendar className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-white">{year}</div>
                      <div className="text-xs text-gray-400 mt-1">{yearExams.length} épreuve(s)</div>
                      <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteYear(year)}
                          className="bg-red-600 hover:bg-red-700 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Epreuves View */}
      {viewMode === 'epreuves' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div></div>
            <div className="flex gap-2">
              <Button
                onClick={handleAddEpreuve}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter Épreuve
              </Button>
              <Button
                variant="outline"
                className="border-purple-500 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300"
                onClick={handleOpenPdfModal}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Upload PDF + IA
              </Button>
            </div>
          </div>

          {currentExams.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-16 text-center">
                <FileText className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Aucune épreuve</h3>
                <p className="text-gray-400 mb-6">Ajoutez des épreuves pour {selectedYear}</p>
                <Button
                  onClick={handleAddEpreuve}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une Épreuve
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentExams.map((exam) => (
                <Card key={exam.id} className="bg-slate-800 border-slate-700 group">
                  <CardHeader className="bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border-b border-slate-700">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-white text-base">{exam.subject}</CardTitle>
                        <CardDescription className="text-gray-400 mt-1">
                          {exam.type} {exam.series && `Série ${exam.series}`} {exam.niveau && `- ${exam.niveau}`}
                        </CardDescription>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        exam.difficulty === 'EASY' ? 'bg-green-600' :
                        exam.difficulty === 'MEDIUM' ? 'bg-yellow-600' :
                        'bg-red-600'
                      } text-white`}>
                        {exam.difficulty}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2 mb-4">
                      {exam.faculty && (
                        <div className="text-sm text-cyan-400">
                          {faculties.find(f => f.value === exam.faculty)?.label || exam.faculty}
                        </div>
                      )}
                      <div className="text-sm text-gray-400">⏱️ {exam.duration || 0} minutes</div>
                      <div className="text-sm text-gray-400">📝 {exam.totalQuestions || 0} questions</div>
                      {exam.correction && (
                        <div className="text-xs text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Correction IA disponible
                        </div>
                      )}
                    </div>
                    {correctionStatus != null && correctionStatus.id === exam.id && (
                      <p className={`text-xs mb-2 ${correctionStatus.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                        {correctionStatus.ok ? '✓ Correction générée !' : '✗ Erreur lors de la génération'}
                      </p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Link href={`/exams/${exam.id}`} target="_blank" className="flex-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full border-purple-500 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Voir
                        </Button>
                      </Link>
                      {exam.pdfUrl && (
                        <a
                          href={`http://localhost:4000${exam.pdfUrl}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-cyan-500 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateCorrection(exam.id)}
                        disabled={generatingCorrectionId === exam.id || !exam.content}
                        title={!exam.content ? "Upload d'abord le PDF" : exam.correction ? 'Regénérer la correction IA' : 'Générer la correction IA'}
                        className="border-emerald-500 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 disabled:opacity-40"
                      >
                        {generatingCorrectionId === exam.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditEpreuve(exam)}
                        className="border-slate-600 bg-slate-700 hover:bg-slate-600"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteEpreuve(exam)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setSubmitError(null); }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {modalType === 'structure' && (selectedItem?.editing ? 'Modifier la Structure' : 'Ajouter une Structure')}
              {modalType === 'series' && (selectedItem ? 'Modifier la Série' : 'Ajouter une Série BAC')}
              {modalType === 'niveau' && (selectedItem ? 'Modifier le Niveau' : 'Ajouter un Niveau')}
              {modalType === 'faculty' && (selectedItem ? 'Modifier la Faculté' : 'Ajouter une Faculté')}
              {modalType === 'year' && 'Ajouter une Année'}
              {modalType === 'epreuve' && (selectedItem ? 'Modifier l\'Épreuve' : 'Ajouter une Épreuve')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {modalType === 'structure' && (
              <>
                <div>
                  <Label className="text-gray-400">Nom *</Label>
                  <Input
                    value={structureForm.label}
                    onChange={(e) => setStructureForm({ ...structureForm, label: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Ex: MASTER, Université de Koudougou"
                  />
                </div>
                {selectedItem?.type === 'national' && (
                  <div>
                    <Label className="text-gray-400">Description</Label>
                    <Input
                      value={structureForm.description}
                      onChange={(e) => setStructureForm({ ...structureForm, description: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="Ex: Master (M1, M2)"
                    />
                  </div>
                )}
              </>
            )}

            {modalType === 'series' && (
              <>
                <div>
                  <Label className="text-gray-400">Lettre de la Série *</Label>
                  <Input
                    value={seriesForm.value}
                    onChange={(e) => setSeriesForm({ ...seriesForm, value: e.target.value.toUpperCase() })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Ex: H, TI, G2..."
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label className="text-gray-400">Description</Label>
                  <Input
                    value={seriesForm.description}
                    onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Ex: Techniques Industrielles"
                  />
                </div>
              </>
            )}

            {modalType === 'niveau' && (
              <>
                <div>
                  <Label className="text-gray-400">Code du Niveau *</Label>
                  <Input
                    value={niveauForm.value}
                    onChange={(e) => setNiveauForm({ ...niveauForm, value: e.target.value.toUpperCase() })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Ex: L3, M2, DUT..."
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label className="text-gray-400">Intitulé</Label>
                  <Input
                    value={niveauForm.label}
                    onChange={(e) => setNiveauForm({ ...niveauForm, label: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Ex: Licence 3"
                  />
                </div>
                <div>
                  <Label className="text-gray-400">Description</Label>
                  <Input
                    value={niveauForm.description}
                    onChange={(e) => setNiveauForm({ ...niveauForm, description: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Ex: 3ème année de Licence"
                  />
                </div>
              </>
            )}

            {modalType === 'faculty' && (
              <div>
                <Label className="text-gray-400">Nom de la Faculté *</Label>
                <Input
                  value={facultyForm}
                  onChange={(e) => setFacultyForm(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="Ex: Faculté des Sciences Juridiques"
                />
              </div>
            )}

            {modalType === 'year' && (
              <div>
                <Label className="text-gray-400">Année *</Label>
                <Input
                  type="number"
                  value={yearForm}
                  onChange={(e) => setYearForm(parseInt(e.target.value))}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                />
              </div>
            )}

            {modalType === 'epreuve' && (
              <>
                {extractedContent && !selectedItem && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                    pdfIsScanned
                      ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                      : 'bg-green-500/10 border border-green-500/30 text-green-400'
                  }`}>
                    {pdfIsScanned
                      ? <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      : <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    }
                    {pdfIsScanned
                      ? 'PDF scanné — le fichier sera associé à cette épreuve (sans structuration)'
                      : 'Contenu PDF structuré sera associé à cette épreuve'
                    }
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Matière *</Label>
                    <Input
                      value={examForm.subject}
                      onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="Ex: Mathématiques"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-400">Difficulté</Label>
                    <Select
                      value={examForm.difficulty}
                      onValueChange={(value) => setExamForm({ ...examForm, difficulty: value })}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EASY">Facile</SelectItem>
                        <SelectItem value="MEDIUM">Moyen</SelectItem>
                        <SelectItem value="HARD">Difficile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-400">Durée (minutes)</Label>
                  <Input
                    type="number"
                    value={examForm.duration}
                    onChange={(e) => setExamForm({ ...examForm, duration: parseInt(e.target.value) })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                  />
                </div>

                <div>
                  <Label className="text-gray-400">Description</Label>
                  <Textarea
                    value={examForm.description}
                    onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Description de l'épreuve..."
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex-col items-stretch gap-2">
            {submitError && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded px-3 py-2">
                {submitError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-slate-600 bg-slate-700 hover:bg-slate-600"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving}
                className="bg-purple-600 hover:bg-purple-700 min-w-[90px]"
              >
                {saving ? 'Sauvegarde…' : (
                  selectedItem && modalType !== 'year' ? 'Modifier' : 'Ajouter'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Upload Modal */}
      <Dialog open={pdfModalOpen} onOpenChange={(open) => { setPdfModalOpen(open); if (!open) { setPdfUploadStep('idle'); setPdfFile(null); setPdfUploadError(null); } }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Upload PDF + Structuration IA
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Uploadez un PDF d&apos;épreuve — l&apos;IA extraira et structurera le contenu automatiquement
            </DialogDescription>
          </DialogHeader>

          {pdfUploadStep === 'idle' && (
            <div className="space-y-4 py-4">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setPdfDragOver(true); }}
                onDragLeave={() => setPdfDragOver(false)}
                onDrop={handlePdfDrop}
                onClick={() => pdfInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  pdfDragOver
                    ? 'border-purple-400 bg-purple-500/10'
                    : pdfFile
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-slate-600 bg-slate-700/50 hover:border-purple-500 hover:bg-purple-500/5'
                }`}
              >
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handlePdfFileSelect}
                />
                {pdfFile ? (
                  <>
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-green-400 font-semibold">{pdfFile.name}</p>
                    <p className="text-gray-400 text-sm mt-1">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <FileText className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-white font-semibold">Glissez votre PDF ici</p>
                    <p className="text-gray-400 text-sm mt-1">ou cliquez pour sélectionner</p>
                    <p className="text-gray-500 text-xs mt-3">Format PDF · Max 20 MB</p>
                  </>
                )}
              </div>

              {pdfUploadError && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded px-3 py-2">
                  {pdfUploadError}
                </p>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setPdfModalOpen(false)} className="border-slate-600 bg-slate-700 hover:bg-slate-600">
                  Annuler
                </Button>
                <Button
                  onClick={handleExtractPdf}
                  disabled={!pdfFile}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Extraire avec IA
                </Button>
              </DialogFooter>
            </div>
          )}

          {pdfUploadStep === 'uploading' && (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
              <p className="text-white font-semibold">Extraction en cours...</p>
              <p className="text-gray-400 text-sm">Analyse et structuration du PDF (quelques secondes)</p>
            </div>
          )}

          {pdfUploadStep === 'preview' && extractedContent && (
            <div className="space-y-4 py-4">
              {/* Success / scanned banner */}
              {pdfIsScanned ? (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-400 font-semibold">PDF scanné détecté</p>
                    <p className="text-gray-400 text-sm">
                      Le texte n&apos;a pas pu être extrait automatiquement. Vous pouvez quand même associer le PDF à cette épreuve.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                  <div>
                    <p className="text-green-400 font-semibold">PDF analysé et reconstruit par l&apos;IA ✨</p>
                    <p className="text-gray-400 text-sm">
                      {extractedContent.fullContent ? 'Contenu fidèle généré' : `${extractedContent.sections?.length || 0} section(s) détectée(s)`}
                      {extractedContent.totalPoints ? ` · ${extractedContent.totalPoints} pts` : ''}
                      {extractedContent.duration ? ` · ${extractedContent.duration} min` : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Preview — aperçu du rendu étudiant */}
              {!pdfIsScanned && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Aperçu du rendu étudiant</p>
                  <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-700 bg-slate-950">
                    {extractedContent.fullContent ? (
                      /* ── Rendu fullContent : fidèle à l'affichage étudiant ── */
                      <div className="p-4 space-y-3">
                        {/* Mini header */}
                        <div className="rounded-xl overflow-hidden" style={{ background: 'linear-gradient(135deg,rgba(79,70,229,.12),rgba(6,182,212,.07))', border: '1px solid rgba(139,92,246,.22)' }}>
                          <div className="px-4 py-3 text-center" style={{ borderBottom: '1px solid rgba(255,255,255,.05)' }}>
                            <p className="text-[10px] font-black text-white uppercase tracking-widest" style={{ textDecoration: 'underline', textUnderlineOffset: '4px', textDecorationColor: 'rgba(139,92,246,.5)' }}>
                              {extractedContent.fullContent.split('\n').find((l: string) => /^[EÉ]PREUVE/.test(l.trim()))?.trim() || 'ÉPREUVE'}
                            </p>
                          </div>
                          <div className="flex justify-center gap-6 px-4 py-2 text-[10px]">
                            {extractedContent.duration && <span className="text-slate-400">Durée : <strong className="text-white">{extractedContent.duration} min</strong></span>}
                            {extractedContent.totalPoints && <span className="text-slate-400">Total : <strong className="text-white">{extractedContent.totalPoints} pts</strong></span>}
                          </div>
                        </div>
                        {/* Contenu brut scrollable */}
                        <p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap font-mono px-1">
                          {extractedContent.fullContent.slice(0, 1200)}{extractedContent.fullContent.length > 1200 ? '\n…' : ''}
                        </p>
                      </div>
                    ) : (
                      /* ── Fallback sections list ── */
                      <div className="p-4 space-y-3">
                        {extractedContent.instructions?.map((ins: string, i: number) => (
                          <p key={i} className="text-xs text-gray-300">• {ins}</p>
                        ))}
                        {extractedContent.sections?.map((section: any, i: number) => (
                          <div key={i} className="border border-slate-700 rounded-lg p-3">
                            <p className="text-sm font-semibold text-purple-400">{section.title}</p>
                            {section.preamble && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{section.preamble}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setPdfUploadStep('idle'); setPdfFile(null); }}
                  className="border-slate-600 bg-slate-700 hover:bg-slate-600"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Re-uploader
                </Button>
                <Button onClick={handleUsePdfContent} className="bg-purple-600 hover:bg-purple-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {pdfIsScanned ? 'Associer ce PDF à une épreuve' : 'Utiliser ce contenu'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
