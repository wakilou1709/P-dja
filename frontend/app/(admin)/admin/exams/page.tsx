'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Trash2, School, GraduationCap, ArrowLeft, Calendar, FileText, ChevronRight, Briefcase, BookOpen, CheckCircle, RefreshCw, Sparkles, AlertTriangle, Eye, ExternalLink, Building2, Award, Brain, MapPin, Layers, FolderInput } from 'lucide-react';
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
type MainTab = 'national' | 'concours' | 'secondaire' | 'universite' | 'prepa' | 'custom';
type SchoolViewMode = 'schools' | 'classes' | 'school_epreuves';
const CLASS_ORDER = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'];
const HARDCODED_CONCOURS = ['CONCOURS_FP', 'PMK'];

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

interface CustomCatDef {
  id: string;
  slug: string;
  name: string;
  color: string;
  levels: string[]; // e.g. ['Établissement', 'Classe'] — 1 to 3 levels
}

export default function AdminExamsPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Tab state
  const [mainTab, setMainTab] = useState<MainTab>('national');

  const switchTab = (tab: MainTab) => {
    setMainTab(tab);
    setViewMode('structures');
    setSelectedStructure(null);
    setSelectedSeries(null);
    setSelectedFaculty(null);
    setSelectedNiveau(null);
    setSelectedYear(null);
    setSchoolViewMode('schools');
    setSelectedSchool(null);
    setSelectedClass(null);
    setCustomSels([null, null, null]);
    setCustomViewDepth(0);
    setCustomSelectedYear(null);
  };

  const switchCustomTab = (cat: CustomCatDef) => {
    setMainTab('custom');
    setSelectedCustomCat(cat);
    setCustomSels([null, null, null]);
    setCustomViewDepth(0);
    setCustomSelectedYear(null);
    // Reset other tab state
    setViewMode('structures');
    setSelectedStructure(null);
    setSelectedSeries(null);
    setSelectedFaculty(null);
    setSelectedNiveau(null);
    setSelectedYear(null);
    setSchoolViewMode('schools');
    setSelectedSchool(null);
    setSelectedClass(null);
  };

  // Navigation state
  const [viewMode, setViewMode] = useState<ViewMode>('structures');
  const [selectedStructure, setSelectedStructure] = useState<Structure | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [selectedNiveau, setSelectedNiveau] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Config lists — chargées depuis la base de données
  const [examTypes,           setExamTypes]           = useState<ConfigItem[]>([]);
  const [universities,        setUniversities]        = useState<ConfigItem[]>([]);
  const [faculties,           setFaculties]           = useState<ConfigItem[]>([]);
  const [bacSeries,           setBacSeries]           = useState<ConfigItem[]>([]);
  const [universityLevels,    setUniversityLevels]    = useState<ConfigItem[]>([]);
  const [schools,             setSchools]             = useState<ConfigItem[]>([]);
  const [concoursCategories,  setConcoursCategories]  = useState<Record<string, ConfigItem[]>>({});
  const [configLoading,       setConfigLoading]       = useState(true);

  // School navigation state
  const [schoolViewMode, setSchoolViewMode] = useState<SchoolViewMode>('schools');
  const [selectedSchool, setSelectedSchool] = useState<ConfigItem | null>(null);
  const [selectedClass,  setSelectedClass]  = useState<string | null>(null);
  const [schoolForm,     setSchoolForm]     = useState('');

  // Prépa state
  const [prepClasses, setPrepClasses] = useState<any[]>([]);
  const [prepLoading, setPrepLoading] = useState(false);
  const [selectedPrepClass, setSelectedPrepClass] = useState<any | null>(null);
  const [selectedPrepYear, setSelectedPrepYear] = useState<number | null>(null);
  const [prepExams, setPrepExams] = useState<any[]>([]);
  const [prepView, setPrepView] = useState<'classes' | 'years' | 'epreuves'>('classes');
  const [prepClassForm, setPrepClassForm] = useState({ name: '', city: '', region: '', description: '' });
  const [prepExamForm, setPrepExamForm] = useState({
    subject: '', title: '', year: new Date().getFullYear(),
    difficulty: 'MEDIUM', duration: 120, description: '',
  });

  // Modal states
  // Custom categories state
  const [customCatDefs, setCustomCatDefs] = useState<CustomCatDef[]>([]);
  const [customLevelItems, setCustomLevelItems] = useState<Record<string, ConfigItem[]>>({});
  const [selectedCustomCat, setSelectedCustomCat] = useState<CustomCatDef | null>(null);
  const [customSels, setCustomSels] = useState<Array<string | null>>([null, null, null]);
  const [customViewDepth, setCustomViewDepth] = useState(0); // 0=L0,1=L1,2=L2,3=years,4=epreuves
  const [customSelectedYear, setCustomSelectedYear] = useState<number | null>(null);
  const [catDefForm, setCatDefForm] = useState({ name: '', color: '#8b5cf6', levels: ['Niveau'] });
  const [levelItemForm, setLevelItemForm] = useState({ label: '', levelIndex: 0 });
  const [pendingLevelContext, setPendingLevelContext] = useState<{ slug: string; levelIndex: number } | null>(null);
  const [pendingCustomContext, setPendingCustomContext] = useState<{ slug: string; sels: Array<string | null> } | null>(null);
  const [pendingConcoursContext, setPendingConcoursContext] = useState<{ type: string; series: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'structure' | 'faculty' | 'series' | 'niveau' | 'year' | 'epreuve' | 'school' | 'prepClass' | 'prepExam' | 'catDef' | 'levelItem'>('structure');
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
    country: 'BF',
  });
  const [pdfCountry, setPdfCountry] = useState('BF');

  // Correction IA state
  const [generatingCorrectionId, setGeneratingCorrectionId] = useState<string | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<{ id: string; ok: boolean } | null>(null);

  // PDF upload state
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfUploadStep, setPdfUploadStep] = useState<'idle' | 'creating' | 'created' | 'error'>('idle');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDragOver, setPdfDragOver] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const [autoCreatedExam, setAutoCreatedExam] = useState<any>(null);
  const [autoHasCorrection, setAutoHasCorrection] = useState(false);
  const [creatingStep, setCreatingStep] = useState(0); // 0-3
  // legacy state kept for edit form pre-fill
  const [extractedContent, setExtractedContent] = useState<any>(null);
  const [extractedCorrection, setExtractedCorrection] = useState<any>(null);
  const [extractedPdfUrl] = useState('');
  const [pdfIsScanned] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const creatingTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    fetchExams();
    fetchConfigs();
    fetchPrepClasses();
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
      setSchools(data.school ?? []);
      // Concours categories — keys like 'concours_cat_CONCOURS_FP'
      const concoursCats: Record<string, ConfigItem[]> = {};
      Object.entries(data).forEach(([k, v]) => {
        if (k.startsWith('concours_cat_')) concoursCats[k] = v as ConfigItem[];
      });
      setConcoursCategories(concoursCats);
      // Custom category definitions
      const rawDefs: any[] = data.categoryDef ?? [];
      const defs: CustomCatDef[] = rawDefs.map((c) => ({
        id: c.id,
        slug: c.value,
        name: c.label,
        color: c.extra?.color ?? '#8b5cf6',
        levels: c.extra?.levels ?? ['Niveau'],
      }));
      setCustomCatDefs(defs);
      // Load level items for each custom cat
      const levelItems: Record<string, ConfigItem[]> = {};
      for (const def of defs) {
        for (let i = 0; i < def.levels.length; i++) {
          const key = `cdef_${def.slug}_L${i}`;
          levelItems[key] = data[key] ?? [];
        }
      }
      setCustomLevelItems(levelItems);
    } catch (e) {
      console.error('Failed to load exam configs:', e);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchPrepClasses = async () => {
    setPrepLoading(true);
    try {
      const data = await adminApi.prepClasses.getAll();
      setPrepClasses(data);
    } catch (e) {
      console.error('Failed to load prep classes:', e);
    } finally {
      setPrepLoading(false);
    }
  };

  const fetchPrepExams = async (prepClassId: string, prepYear: number) => {
    try {
      const data = await examsApi.getPrepClassExams(prepClassId, prepYear);
      setPrepExams(data);
    } catch (e) {
      console.error('Failed to load prep exams:', e);
    }
  };

  const fetchExams = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await examsApi.getAll();
      setExams(response);
      return response;
    } catch (error: any) {
      console.error('Failed to fetch exams:', error);
      setFetchError(error?.response?.data?.message || error?.message || 'Impossible de charger les épreuves');
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

  // School helpers
  const getSchoolClasses = (): string[] => {
    if (!selectedSchool) return [];
    const examClasses = exams
      .filter(e => e.university === selectedSchool.value && (e.type === 'COMPOSITION' || e.type === 'DEVOIR'))
      .map((e: any) => e.faculty)
      .filter(Boolean) as string[];
    const extra = examClasses.filter(c => !CLASS_ORDER.includes(c));
    return [...CLASS_ORDER, ...Array.from(new Set(extra))];
  };

  const getSchoolExams = () => {
    if (!selectedSchool || !selectedClass) return [];
    return exams.filter(e =>
      e.university === selectedSchool.value &&
      e.faculty === selectedClass &&
      (e.type === 'COMPOSITION' || e.type === 'DEVOIR')
    );
  };

  // Custom category helpers
  const getCustomLevelItemsFor = (slug: string, levelIndex: number): ConfigItem[] =>
    customLevelItems[`cdef_${slug}_L${levelIndex}`] ?? [];

  const getCustomYears = (): number[] => {
    if (!selectedCustomCat) return [];
    const slug = selectedCustomCat.slug;
    let filtered = exams.filter(e => e.type === `CUSTOM_${slug}`);
    if (customSels[0]) filtered = filtered.filter(e => e.university === customSels[0]);
    if (customSels[1]) filtered = filtered.filter(e => e.faculty === customSels[1]);
    if (customSels[2]) filtered = filtered.filter(e => e.niveau === customSels[2]);
    return Array.from(new Set(filtered.map((e: any) => e.year).filter(Boolean))).sort((a: number, b: number) => b - a);
  };

  const getCustomExams = () => {
    if (!selectedCustomCat || customSelectedYear === null) return [];
    const slug = selectedCustomCat.slug;
    let filtered = exams.filter(e => e.type === `CUSTOM_${slug}` && e.year === customSelectedYear);
    if (customSels[0]) filtered = filtered.filter(e => e.university === customSels[0]);
    if (customSels[1]) filtered = filtered.filter(e => e.faculty === customSels[1]);
    if (customSels[2]) filtered = filtered.filter(e => e.niveau === customSels[2]);
    return filtered;
  };

  // Concours helpers
  const isConcoursValue = (value: string) =>
    HARDCODED_CONCOURS.includes(value) || examTypes.some(t => t.value === value && t.extra?.kind === 'concours');

  const getConcoursCategories = (): ConfigItem[] => {
    if (!selectedStructure) return [];
    return concoursCategories[`concours_cat_${selectedStructure.id}`] ?? [];
  };

  // Get years based on current selection
  const getYears = () => {
    let filteredExams = exams;

    if (selectedStructure?.type === 'national') {
      if (isConcoursValue(selectedStructure.id)) {
        // Concours: l'institution est dans university (GN, ENAM…), pas besoin de university=NONE
        filteredExams = exams.filter(e => e.type === selectedStructure.id);
      } else {
        // Examens nationaux (BAC, BEPC, CEP…): university est toujours NONE
        filteredExams = exams.filter(e => e.type === selectedStructure.id && e.university === 'NONE');
      }
      if (selectedSeries) {
        filteredExams = filteredExams.filter(e => e.series === selectedSeries);
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
      if (isConcoursValue(selectedStructure.id)) {
        filteredExams = filteredExams.filter(e => e.type === selectedStructure.id);
      } else {
        filteredExams = filteredExams.filter(e => e.type === selectedStructure.id && e.university === 'NONE');
      }
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
    } else if (structure.type === 'national' && isConcoursValue(structure.id)) {
      setViewMode('series');
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
    setSelectedNiveau(null);
    // Si aucune épreuve de cette faculté n'a de niveau → passer directement aux années
    const facultyExams = exams.filter(
      e => e.university === selectedStructure?.id && e.faculty === facultyValue
    );
    const hasAnyNiveau = facultyExams.some(e => e.niveau);
    setViewMode(hasAnyNiveau ? 'niveaux' : 'years');
  };

  const handleSelectNiveau = (niveau: string) => {
    setSelectedNiveau(niveau);
    setViewMode('years');
  };

  const handleSelectYear = (year: number) => {
    setSelectedYear(year);
    setViewMode('epreuves');
  };

  // School handlers
  const handleSelectSchool = (school: ConfigItem) => {
    setSelectedSchool(school);
    setSelectedClass(null);
    setSchoolViewMode('classes');
  };

  const handleSelectClass = (className: string) => {
    setSelectedClass(className);
    setSchoolViewMode('school_epreuves');
  };

  const handleSchoolBack = () => {
    if (schoolViewMode === 'school_epreuves') {
      setSelectedClass(null);
      setSchoolViewMode('classes');
    } else if (schoolViewMode === 'classes') {
      setSelectedSchool(null);
      setSchoolViewMode('schools');
    }
  };

  const handleAddSchool = () => {
    setSchoolForm('');
    setSelectedItem(null);
    setModalType('school');
    setModalOpen(true);
  };

  const handleEditSchool = (school: ConfigItem) => {
    setSchoolForm(school.label);
    setSelectedItem(school);
    setModalType('school');
    setModalOpen(true);
  };

  const handleDeleteSchool = async (school: ConfigItem) => {
    if (!confirm(`Supprimer l'établissement "${school.label}" ?\n\nATTENTION : Toutes les épreuves associées seront supprimées.`)) return;
    try {
      await examConfigApi.remove(school.id);
      await fetchConfigs();
    } catch (e) {
      console.error('Failed to delete school:', e);
    }
  };

  const handleAddSchoolEpreuve = () => { handleOpenPdfModal(); };

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

  const handleAddStructure = (type: 'national' | 'university' | 'concours') => {
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
    // For concours categories: prefill description with the label (display name)
    if (mainTab === 'concours') {
      setSeriesForm({ value: s.value, description: s.label });
    } else {
      setSeriesForm({ value: s.value, description: s.description || '' });
    }
    setSelectedItem(s);
    setModalType('series');
    setModalOpen(true);
  };
  const handleDeleteSeries = async (s: ConfigItem) => {
    const isConcours = mainTab === 'concours';
    const label = isConcours ? s.label : `Série ${s.value}`;
    if (!confirm(`Supprimer la catégorie "${label}" ?\n\nLes épreuves associées ne seront pas supprimées.`)) return;
    try {
      await examConfigApi.remove(s.id);
      setAddedYears(prev => prev.filter(ay => ay.series !== s.value));
      await fetchConfigs();
    } catch (e) {
      console.error('Failed to delete series/category:', e);
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
        if (isConcoursValue(selectedStructure.id)) {
          examsToDelete = examsToDelete.filter(e => e.type === selectedStructure.id);
        } else {
          examsToDelete = examsToDelete.filter(e => e.type === selectedStructure.id && e.university === 'NONE');
        }
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
    creatingTimers.current.forEach(clearTimeout);
    creatingTimers.current = [];
    setPdfModalOpen(true);
    setPdfUploadStep('idle');
    setPdfFile(null);
    setPdfUploadError(null);
    setAutoCreatedExam(null);
    setAutoHasCorrection(false);
    setCreatingStep(0);
    setExtractedContent(null);
    setExtractedCorrection(null);
    // Track concours+category context for post-upload patching
    if (mainTab === 'concours' && selectedSeries && selectedStructure) {
      setPendingConcoursContext({ type: selectedStructure.id, series: selectedSeries });
    } else {
      setPendingConcoursContext(null);
    }
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
    setPdfUploadStep('creating');
    setPdfUploadError(null);
    setCreatingStep(0);

    // Animate steps progressively while the API call runs
    creatingTimers.current = [
      setTimeout(() => setCreatingStep(1), 2500),
      setTimeout(() => setCreatingStep(2), 9000),
      setTimeout(() => setCreatingStep(3), 28000),
    ];

    try {
      const result = await adminApi.uploadAndCreateExam(pdfFile, pdfCountry);
      creatingTimers.current.forEach(clearTimeout);
      creatingTimers.current = [];
      setCreatingStep(4);
      setAutoCreatedExam(result.exam);
      setAutoHasCorrection(result.hasCorrection);
      setExtractedContent(result.exam.content);
      setExtractedCorrection(result.exam.correction ?? null);
      // If we're in custom cat context, re-type the exam
      const ctxSnapshot = pendingCustomContext;
      setPendingCustomContext(null);
      const concoursCtx = pendingConcoursContext;
      setPendingConcoursContext(null);
      let examToNavigate = result.exam;
      if (ctxSnapshot) {
        const patchData: Record<string, any> = {
          type: `CUSTOM_${ctxSnapshot.slug}`,
          university: ctxSnapshot.sels[0] || result.exam.university || 'NONE',
          faculty: ctxSnapshot.sels[1] || result.exam.faculty || undefined,
          niveau: ctxSnapshot.sels[2] || result.exam.niveau || undefined,
        };
        try {
          await adminApi.updateExam(result.exam.id, patchData);
          examToNavigate = { ...result.exam, ...patchData };
        } catch {}
      } else if (concoursCtx) {
        // Patch type and series for concours category context
        const patchData: Record<string, any> = {
          type: concoursCtx.type,
          series: concoursCtx.series,
        };
        try {
          await adminApi.updateExam(result.exam.id, patchData);
          examToNavigate = { ...result.exam, ...patchData };
        } catch {}
      }
      await fetchExams();
      navigateToExam(examToNavigate);
      setPdfModalOpen(false);
    } catch (error: any) {
      creatingTimers.current.forEach(clearTimeout);
      creatingTimers.current = [];
      const msg = error?.response?.data?.message || error?.message || 'Erreur lors du traitement';
      setPdfUploadError(msg);
      setPdfUploadStep('error');
    }
  };


  const handleAddEpreuve = () => { handleOpenPdfModal(); };

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
      country: exam.country || 'BF',
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

  // PrepClass handlers
  const handleAddPrepClass = () => {
    setPrepClassForm({ name: '', city: '', region: '', description: '' });
    setSelectedItem(null);
    setModalType('prepClass');
    setModalOpen(true);
  };

  const handleEditPrepClass = (pc: any) => {
    setPrepClassForm({ name: pc.name, city: pc.city, region: pc.region || '', description: pc.description || '' });
    setSelectedItem(pc);
    setModalType('prepClass');
    setModalOpen(true);
  };

  const handleDeletePrepClass = async (pc: any) => {
    if (!confirm(`Supprimer la classe prépa "${pc.name}" ?\n\nATTENTION : Toutes les épreuves associées seront détachées.`)) return;
    try {
      await adminApi.prepClasses.remove(pc.id);
      await fetchPrepClasses();
      if (selectedPrepClass?.id === pc.id) {
        setSelectedPrepClass(null);
        setPrepView('classes');
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleAddPrepExam = () => { handleOpenPdfModal(); };

  // Custom category handlers
  const handleOpenCatDefModal = (existing?: CustomCatDef) => {
    if (existing) {
      setCatDefForm({ name: existing.name, color: existing.color, levels: [...existing.levels] });
      setSelectedItem({ ...existing, editing: true });
    } else {
      setCatDefForm({ name: '', color: '#8b5cf6', levels: ['Niveau'] });
      setSelectedItem(null);
    }
    setModalType('catDef');
    setModalOpen(true);
  };

  const handleDeleteCatDef = async (cat: CustomCatDef) => {
    if (!confirm(`Supprimer la catégorie "${cat.name}" ?\n\nATTENTION : Toutes les épreuves et niveaux associés seront supprimés.`)) return;
    try {
      await examConfigApi.remove(cat.id);
      // Also remove all level item configs for this cat
      for (let i = 0; i < cat.levels.length; i++) {
        const items = getCustomLevelItemsFor(cat.slug, i);
        await Promise.all(items.map(item => examConfigApi.remove(item.id)));
      }
      if (selectedCustomCat?.slug === cat.slug) {
        setMainTab('national');
        setSelectedCustomCat(null);
      }
      await fetchConfigs();
    } catch (e) {
      console.error('Failed to delete cat def:', e);
    }
  };

  const handleOpenLevelItemModal = (slug: string, levelIndex: number, existing?: ConfigItem) => {
    setPendingLevelContext({ slug, levelIndex });
    if (existing) {
      setLevelItemForm({ label: existing.label, levelIndex });
      setSelectedItem(existing);
    } else {
      setLevelItemForm({ label: '', levelIndex });
      setSelectedItem(null);
    }
    setModalType('levelItem');
    setModalOpen(true);
  };

  const handleDeleteLevelItem = async (slug: string, levelIndex: number, item: ConfigItem) => {
    if (!confirm(`Supprimer "${item.label}" ?`)) return;
    try {
      await examConfigApi.remove(item.id);
      await fetchConfigs();
    } catch (e) {
      console.error('Failed to delete level item:', e);
    }
  };

  const handleCustomSelectLevel = (levelIndex: number, value: string) => {
    const newSels = [...customSels] as Array<string | null>;
    newSels[levelIndex] = value;
    // Clear deeper selections
    for (let i = levelIndex + 1; i < 3; i++) newSels[i] = null;
    setCustomSels(newSels);
    setCustomViewDepth(levelIndex + 1);
    setCustomSelectedYear(null);
  };

  const handleCustomSelectYear = (year: number) => {
    setCustomSelectedYear(year);
    const numLevels = selectedCustomCat?.levels.length ?? 0;
    setCustomViewDepth(numLevels + 1); // epreuves
  };

  const handleCustomBack = () => {
    const numLevels = selectedCustomCat?.levels.length ?? 0;
    if (customViewDepth === numLevels + 1) {
      // from epreuves → years
      setCustomSelectedYear(null);
      setCustomViewDepth(numLevels);
    } else if (customViewDepth === numLevels) {
      // from years → last level or top
      if (numLevels === 0) {
        setCustomViewDepth(0);
      } else {
        const newSels = [...customSels] as Array<string | null>;
        newSels[numLevels - 1] = null;
        setCustomSels(newSels);
        setCustomViewDepth(numLevels - 1);
      }
    } else if (customViewDepth > 0) {
      const newSels = [...customSels] as Array<string | null>;
      newSels[customViewDepth - 1] = null;
      setCustomSels(newSels);
      setCustomViewDepth(customViewDepth - 1);
    }
  };

  const handleAddCustomEpreuve = () => {
    if (selectedCustomCat) {
      setPendingCustomContext({ slug: selectedCustomCat.slug, sels: [...customSels] });
    }
    handleOpenPdfModal();
  };

  const navigateToExam = (exam: any) => {
    if (!exam) return;
    // Handle custom category types
    if (exam.type?.startsWith('CUSTOM_')) {
      const slug = exam.type.replace('CUSTOM_', '');
      const catDef = customCatDefs.find(c => c.slug === slug);
      if (catDef) {
        setMainTab('custom');
        setSelectedCustomCat(catDef);
        const newSels: Array<string | null> = [
          exam.university && exam.university !== 'NONE' ? exam.university : null,
          exam.faculty || null,
          exam.niveau || null,
        ];
        setCustomSels(newSels);
        setCustomSelectedYear(exam.year || null);
        const numLevels = catDef.levels.length;
        setCustomViewDepth(numLevels + 1); // go directly to epreuves
      }
      return;
    }
    const allConcoursValues = [
      ...HARDCODED_CONCOURS,
      ...examTypes.filter(t => t.extra?.kind === 'concours').map(t => t.value),
    ];
    if (exam.type === 'COMPOSITION' || exam.type === 'DEVOIR') {
      const school = schools.find(s => s.value === exam.university);
      if (school) {
        setMainTab('secondaire');
        setSelectedSchool(school);
        setSelectedClass(exam.faculty || null);
        setSchoolViewMode(exam.faculty ? 'school_epreuves' : 'classes');
      }
      return;
    }
    if (exam.university && exam.university !== 'NONE') {
      const uni = universities.find(u => u.value === exam.university);
      if (uni) {
        setMainTab('universite');
        setSelectedStructure({ type: 'university', id: uni.value, label: uni.label });
        setSelectedFaculty(exam.faculty || null);
        setSelectedNiveau(exam.niveau || null);
        setSelectedSeries(null);
        setSelectedYear(exam.year || null);
        setViewMode('epreuves');
      }
      return;
    }
    const examType = examTypes.find(t => t.value === exam.type);
    if (examType) {
      setMainTab(allConcoursValues.includes(exam.type) ? 'concours' : 'national');
      setSelectedStructure({ type: 'national', id: examType.value, label: examType.label, description: examType.description });
      // For BAC: series = bac series letter. For concours: series = category value
      setSelectedSeries(exam.series || null);
      setSelectedFaculty(null);
      setSelectedNiveau(null);
      setSelectedYear(exam.year || null);
      setViewMode('epreuves');
    }
  };

  const handleEditPrepExam = (exam: any) => {
    setPrepExamForm({ subject: exam.subject, title: exam.title, year: exam.year, difficulty: exam.difficulty, duration: exam.duration || 120, description: exam.description || '' });
    setSelectedItem(exam);
    setModalType('prepExam');
    setModalOpen(true);
  };

  const handleDeletePrepExam = async (exam: any) => {
    if (!confirm(`Supprimer l'épreuve "${exam.subject}" ?`)) return;
    try {
      await adminApi.deleteExam(exam.id);
      if (selectedPrepClass && selectedPrepYear) {
        await fetchPrepExams(selectedPrepClass.id, selectedPrepYear);
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Erreur lors de la suppression');
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
          const isConcours = selectedItem?.type === 'concours';
          await examConfigApi.create({
            category: selectedItem?.type === 'university' ? 'university' : 'examType',
            value: newValue,
            label: structureForm.label.trim(),
            description: structureForm.description.trim(),
            extra: isConcours ? { kind: 'concours' } : undefined,
          });
        }
        await fetchConfigs();

      } else if (modalType === 'series') {
        if (mainTab === 'concours') {
          // Concours category — label is in seriesForm.description, value is auto-slug
          const label = seriesForm.description.trim();
          if (!label) { setSubmitError('Le nom de la catégorie est obligatoire.'); setSaving(false); return; }
          const val = label.toUpperCase().replace(/[^A-Z0-9]/g, '_');

          if (selectedItem?.id) {
            const oldVal = selectedItem.value;
            await examConfigApi.update(selectedItem.id, { value: val, label, description: '' });
            if (oldVal !== val) {
              const affected = exams.filter(e => e.type === selectedStructure?.id && e.series === oldVal);
              await Promise.all(affected.map(e => adminApi.updateExam(e.id, { series: val })));
              setAddedYears(prev => prev.map(ay => ay.series === oldVal ? { ...ay, series: val } : ay));
              await fetchExams();
            }
          } else {
            await examConfigApi.create({
              category: `concours_cat_${selectedStructure?.id}`,
              value: val,
              label,
              description: '',
            });
          }
        } else {
          // BAC series
          const val = seriesForm.value.trim().toUpperCase();
          if (!val) { setSubmitError('La lettre de série est obligatoire.'); setSaving(false); return; }

          if (selectedItem?.id) {
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
            await examConfigApi.create({
              category: 'bacSeries',
              value: val,
              label: `Série ${val}`,
              description: seriesForm.description.trim(),
            });
          }
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

      } else if (modalType === 'school') {
        const newLabel = schoolForm.trim();
        if (!newLabel) { setSubmitError("Le nom de l'établissement est obligatoire."); setSaving(false); return; }
        if (selectedItem?.id) {
          const oldValue = selectedItem.value;
          await examConfigApi.update(selectedItem.id, { value: newLabel, label: newLabel });
          if (oldValue !== newLabel) {
            const affected = exams.filter(e => e.university === oldValue);
            await Promise.all(affected.map(e => adminApi.updateExam(e.id, { university: newLabel })));
            await fetchExams();
          }
        } else {
          await examConfigApi.create({ category: 'school', value: newLabel, label: newLabel });
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
        data.country = examForm.country || 'BF';

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
        // pdfUrl no longer stored
        fetchExams();
      }

      if (modalType === 'prepClass') {
        if (!prepClassForm.name.trim() || !prepClassForm.city.trim()) {
          setSubmitError('Le nom et la ville sont obligatoires.');
          setSaving(false);
          return;
        }
        const data = {
          name: prepClassForm.name.trim(),
          city: prepClassForm.city.trim(),
          region: prepClassForm.region.trim() || undefined,
          description: prepClassForm.description.trim() || undefined,
        };
        if (selectedItem?.id) {
          await adminApi.prepClasses.update(selectedItem.id, data);
        } else {
          await adminApi.prepClasses.create(data);
        }
        await fetchPrepClasses();
      } else if (modalType === 'prepExam') {
        if (!prepExamForm.subject.trim() || !selectedPrepClass || !selectedPrepYear) {
          setSubmitError('La matière est obligatoire.');
          setSaving(false);
          return;
        }
        const data: any = {
          subject: prepExamForm.subject.trim(),
          title: (prepExamForm.title || prepExamForm.subject).trim(),
          year: prepExamForm.year,
          difficulty: prepExamForm.difficulty,
          duration: prepExamForm.duration,
          prepYear: selectedPrepYear,
        };
        if (prepExamForm.description.trim()) data.description = prepExamForm.description.trim();
        if (extractedContent && !selectedItem) data.content = extractedContent;
        if (extractedCorrection && !selectedItem) data.correction = extractedCorrection;
        if (extractedPdfUrl && !selectedItem) data.pdfUrl = extractedPdfUrl;

        if (selectedItem?.id) {
          await adminApi.updateExam(selectedItem.id, data);
        } else {
          await adminApi.prepClasses.createExam(selectedPrepClass.id, data);
        }
        setExtractedContent(null);
        setExtractedCorrection(null);
        // pdfUrl no longer stored
        await fetchPrepExams(selectedPrepClass.id, selectedPrepYear);
      }

      if (modalType === 'catDef') {
        const name = catDefForm.name.trim();
        if (!name) { setSubmitError('Le nom est obligatoire.'); setSaving(false); return; }
        const levels = catDefForm.levels.filter(l => l.trim()).map(l => l.trim());
        if (levels.length === 0) { setSubmitError('Au moins un niveau est requis.'); setSaving(false); return; }
        const slug = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
        if (selectedItem?.editing && selectedItem?.id) {
          await examConfigApi.update(selectedItem.id, {
            label: name,
            extra: { color: catDefForm.color, levels },
          });
        } else {
          await examConfigApi.create({
            category: 'categoryDef',
            value: slug,
            label: name,
            extra: { color: catDefForm.color, levels },
          });
        }
        await fetchConfigs();
      }

      if (modalType === 'levelItem' && pendingLevelContext) {
        const label = levelItemForm.label.trim();
        if (!label) { setSubmitError('Le nom est obligatoire.'); setSaving(false); return; }
        const catKey = `cdef_${pendingLevelContext.slug}_L${pendingLevelContext.levelIndex}`;
        if (selectedItem?.id) {
          await examConfigApi.update(selectedItem.id, { value: label, label });
        } else {
          await examConfigApi.create({ category: catKey, value: label, label });
        }
        await fetchConfigs();
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

  // Build import URL — encodes current navigation context so the import page can pre-fill it
  const importUrl = (() => {
    const params = new URLSearchParams();
    if (mainTab === 'universite' && selectedStructure?.type === 'university') {
      params.set('tab', 'universite');
      params.set('university', selectedStructure.id);
      if (selectedFaculty) params.set('faculty', selectedFaculty);
    } else if (mainTab === 'national' && selectedStructure) {
      params.set('tab', 'national');
      params.set('type', selectedStructure.id);
      if (selectedSeries) params.set('series', selectedSeries);
    } else if (mainTab === 'concours' && selectedStructure) {
      params.set('tab', 'concours');
      params.set('type', selectedStructure.id); // CONCOURS_FP ou PMK
      if (selectedSeries) params.set('series', selectedSeries); // catégorie (ex: OFFICIERS)
    } else if (mainTab === 'secondaire' && selectedSchool) {
      params.set('tab', 'secondaire');
      params.set('school', selectedSchool.value);
      if (selectedClass) params.set('faculty', selectedClass);
    }
    const qs = params.toString();
    return qs ? `/admin/import?${qs}` : '/admin/import';
  })();

  // Build breadcrumb
  // Concours dynamiques : legacy hardcodés + nouveaux marqués extra.kind='concours'
  const concoursValues = [
    ...HARDCODED_CONCOURS,
    ...examTypes.filter(t => t.extra?.kind === 'concours').map(t => t.value),
  ];

  const breadcrumb = [];
  breadcrumb.push({ label: 'Structures', onClick: () => { setSelectedStructure(null); setViewMode('structures'); } });
  if (selectedStructure) {
    breadcrumb.push({ label: selectedStructure.label, onClick: () => handleSelectStructure(selectedStructure) });
  }
  if (selectedSeries) {
    const seriesLabel = mainTab === 'concours'
      ? (getConcoursCategories().find(c => c.value === selectedSeries)?.label ?? selectedSeries)
      : `Série ${selectedSeries}`;
    breadcrumb.push({ label: seriesLabel, onClick: () => handleSelectSeries(selectedSeries) });
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
      {/* Import batch button */}
      <div className="flex justify-end">
        <Link href={importUrl}>
          <Button className="bg-emerald-600 hover:bg-emerald-700">
            <FolderInput className="w-4 h-4 mr-2" />Importation par lot
            {importUrl !== '/admin/import' && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-white/20 font-normal">
                contexte actif
              </span>
            )}
          </Button>
        </Link>
      </div>

      {/* Erreur de chargement des épreuves */}
      {fetchError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-red-400">{fetchError}</p>
          <Button size="sm" variant="outline" onClick={fetchExams} className="border-red-500/40 text-red-400 hover:bg-red-500/20 text-xs h-7">
            <RefreshCw className="w-3 h-3 mr-1" />Réessayer
          </Button>
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-4">
        <button
          onClick={() => switchTab('national')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mainTab === 'national'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <School className="w-4 h-4" />
          Examens nationaux
        </button>
        <button
          onClick={() => switchTab('concours')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mainTab === 'concours'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Award className="w-4 h-4" />
          Concours nationaux
        </button>
        <button
          onClick={() => switchTab('secondaire')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mainTab === 'secondaire'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Collèges &amp; Lycées
        </button>
        <button
          onClick={() => switchTab('universite')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mainTab === 'universite'
              ? 'bg-cyan-600 text-white'
              : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Universités
        </button>
        <button
          onClick={() => { switchTab('prepa'); setPrepView('classes'); setSelectedPrepClass(null); setSelectedPrepYear(null); setPrepExams([]); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mainTab === 'prepa'
              ? 'bg-violet-600 text-white'
              : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Brain className="w-4 h-4" />
          Classes Prépa
        </button>

        {/* Custom category tabs */}
        {customCatDefs.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => switchCustomTab(cat)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mainTab === 'custom' && selectedCustomCat?.slug === cat.slug
                ? 'text-white'
                : 'bg-slate-800 text-gray-400 hover:text-white hover:bg-slate-700'
            }`}
            style={mainTab === 'custom' && selectedCustomCat?.slug === cat.slug
              ? { background: cat.color } : {}}
          >
            <Layers className="w-4 h-4" />
            {cat.name}
          </button>
        ))}

        {/* "+" button to add custom category */}
        <button
          onClick={() => handleOpenCatDefModal()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-purple-600 border border-purple-500 text-white hover:bg-purple-700"
          title="Ajouter une catégorie personnalisée"
        >
          <Plus className="w-4 h-4" />
          Catégorie
        </button>
      </div>

      {/* === CLASSES PRÉPA === */}
      {mainTab === 'prepa' && (
        <div className="space-y-6">
          {/* Liste des classes prépa */}
          {prepView === 'classes' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-white">Classes Préparatoires</h1>
                  <p className="text-gray-400 mt-1">Gérer les classes prépa et leurs épreuves</p>
                </div>
                <Button onClick={handleAddPrepClass} className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" />Ajouter une classe prépa
                </Button>
              </div>
              {prepLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                </div>
              ) : prepClasses.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Brain className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p>Aucune classe prépa. Cliquez sur "Ajouter" pour commencer.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {prepClasses.map((pc) => (
                    <Card key={pc.id} className="bg-slate-800 border-slate-700 hover:border-violet-500/50 transition-all">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                            <Brain className="w-5 h-5 text-violet-400" />
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEditPrepClass(pc)} className="h-7 w-7 p-0 text-gray-400 hover:text-white">
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeletePrepClass(pc)} className="h-7 w-7 p-0 text-gray-400 hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <CardTitle className="text-white text-base mt-2">{pc.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 text-gray-400">
                          <MapPin className="w-3 h-3" />
                          {pc.city}{pc.region ? ` · ${pc.region}` : ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{pc._count?.exams ?? 0} épreuve(s)</span>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPrepClass(pc);
                              setSelectedPrepYear(null);
                              setPrepView('years');
                            }}
                            className="bg-violet-600 hover:bg-violet-700 h-7 text-xs"
                          >
                            Gérer <ChevronRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sélection d'année */}
          {prepView === 'years' && selectedPrepClass && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Button variant="outline" onClick={() => { setPrepView('classes'); setSelectedPrepClass(null); }} className="border-slate-600 bg-slate-700 hover:bg-slate-600">
                  <ArrowLeft className="w-4 h-4 mr-2" />Retour
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-white">{selectedPrepClass.name}</h1>
                  <p className="text-gray-400 text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" />{selectedPrepClass.city}{selectedPrepClass.region ? ` · ${selectedPrepClass.region}` : ''}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((year) => (
                  <button
                    key={year}
                    onClick={() => { setSelectedPrepYear(year); fetchPrepExams(selectedPrepClass.id, year); setPrepView('epreuves'); }}
                    className="bg-slate-800 border border-slate-700 hover:border-violet-500/50 rounded-xl p-8 text-center group transition-all"
                  >
                    <div className="w-14 h-14 rounded-xl bg-violet-500/20 flex items-center justify-center mx-auto mb-4">
                      <Layers className="w-7 h-7 text-violet-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-1">Année {year}</h3>
                    <p className="text-gray-400 text-sm">
                      {year === 1 ? 'Première année' : 'Deuxième année'}
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-1 text-violet-400 text-sm group-hover:gap-2 transition-all">
                      Voir les épreuves <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Épreuves d'une classe prépa */}
          {prepView === 'epreuves' && selectedPrepClass && selectedPrepYear && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => { setPrepView('years'); setSelectedPrepYear(null); setPrepExams([]); }} className="border-slate-600 bg-slate-700 hover:bg-slate-600">
                    <ArrowLeft className="w-4 h-4 mr-2" />Retour
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold text-white">{selectedPrepClass.name} — Année {selectedPrepYear}</h1>
                    <p className="text-gray-400 text-sm">{prepExams.length} épreuve(s)</p>
                  </div>
                </div>
                <Button onClick={handleAddPrepExam} className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4 mr-2" />Ajouter une épreuve
                </Button>
              </div>
              {prepExams.length === 0 ? (
                <div className="text-center py-16 text-gray-400 border border-slate-700 rounded-xl">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                  <p>Aucune épreuve pour Année {selectedPrepYear}. Cliquez sur "Ajouter épreuve".</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {prepExams.map((exam) => (
                    <div key={exam.id} className="relative group rounded-xl border border-slate-700/60 bg-slate-900 hover:border-violet-500/50 transition-all duration-200 overflow-hidden"
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                      <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-violet-500 to-purple-500" />
                      <div className="p-4 pl-5">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-white font-bold text-sm leading-snug">{exam.subject}</h3>
                          <div className="flex gap-1 flex-shrink-0">
                            <Button size="sm" onClick={() => handleEditPrepExam(exam)}
                              className="h-6 w-6 p-0 bg-slate-800 border border-slate-600 hover:bg-slate-700 hover:border-slate-500 text-slate-300 hover:text-white">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" onClick={() => handleDeletePrepExam(exam)}
                              className="h-6 w-6 p-0 bg-red-500/10 border border-red-500/25 hover:bg-red-500/25 hover:border-red-400/50 text-red-400 hover:text-red-300">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/20 text-violet-200 border border-violet-500/30">An {exam.prepYear}</span>
                          {exam.year && <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-200 bg-slate-700 border border-slate-600">{exam.year}</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="text-slate-300">⏱ {exam.duration ?? '—'} min</span>
                          {exam.hasContent && <span className="text-purple-300 font-semibold">IA ✓</span>}
                          {exam.pdfUrl && <span className="text-emerald-300 font-semibold">PDF ✓</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Custom Category Tab ─────────────────────────────────────────────── */}
      {mainTab === 'custom' && selectedCustomCat && (() => {
        const cat = selectedCustomCat;
        const numLevels = cat.levels.length;
        const isYearsView = customViewDepth === numLevels;
        const isEpreuvesView = customViewDepth === numLevels + 1;
        const currentLevelIndex = Math.min(customViewDepth, numLevels - 1);
        const levelItems = getCustomLevelItemsFor(cat.slug, currentLevelIndex);
        const years = getCustomYears();
        const catExams = getCustomExams();

        // Build breadcrumb labels for current selections
        const breadcrumbParts: string[] = [];
        for (let i = 0; i < numLevels && i < customViewDepth; i++) {
          const sel = customSels[i];
          if (sel) {
            const item = getCustomLevelItemsFor(cat.slug, i).find(x => x.value === sel);
            breadcrumbParts.push(item?.label ?? sel);
          }
        }
        if (customSelectedYear) breadcrumbParts.push(customSelectedYear.toString());

        return (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {customViewDepth > 0 && (
                    <Button variant="outline" onClick={handleCustomBack} className="border-slate-600 bg-slate-700 hover:bg-slate-600">
                      <ArrowLeft className="w-4 h-4 mr-2" />Retour
                    </Button>
                  )}
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <button onClick={() => { setCustomViewDepth(0); setCustomSels([null, null, null]); setCustomSelectedYear(null); }}
                      className={customViewDepth === 0 ? 'text-white font-semibold' : 'text-gray-400 hover:text-white transition'}>
                      {cat.name}
                    </button>
                    {breadcrumbParts.map((part, i) => (
                      <span key={i} className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                        <span className={i === breadcrumbParts.length - 1 ? 'text-white font-semibold' : 'text-gray-400'}>{part}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => handleOpenCatDefModal(cat)}
                    className="text-gray-400 hover:text-white h-8 w-8 p-0">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDeleteCatDef(cat)}
                    className="text-gray-400 hover:text-red-400 h-8 w-8 p-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white">
                {isEpreuvesView ? `Épreuves ${customSelectedYear}` : isYearsView ? 'Années' : cat.levels[customViewDepth] ?? cat.name}
              </h1>
              <p className="text-gray-400 mt-1">
                {isEpreuvesView ? `${catExams.length} épreuve(s)`
                  : isYearsView ? 'Sélectionnez une année'
                  : customViewDepth === 0 ? `Gérer les ${cat.levels[0]}`
                  : `Sélectionnez ${cat.levels[customViewDepth]}`}
              </p>
            </div>

            {/* Level items view */}
            {!isYearsView && !isEpreuvesView && (
              <div>
                <div className="flex justify-end mb-4">
                  <Button onClick={() => handleOpenLevelItemModal(cat.slug, customViewDepth)}
                    className="text-white" style={{ background: cat.color }}>
                    <Plus className="w-4 h-4 mr-2" />Ajouter {cat.levels[customViewDepth]}
                  </Button>
                </div>
                {levelItems.length === 0 ? (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-16 text-center">
                      <Layers className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">Aucun élément</h3>
                      <p className="text-gray-400 mb-6">Ajoutez des éléments pour "{cat.levels[customViewDepth]}"</p>
                      <Button onClick={() => handleOpenLevelItemModal(cat.slug, customViewDepth)}
                        className="text-white" style={{ background: cat.color }}>
                        <Plus className="w-4 h-4 mr-2" />Ajouter
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {levelItems.map((item) => {
                      const count = (() => {
                        let f = exams.filter(e => e.type === `CUSTOM_${cat.slug}`);
                        const fieldNames = ['university', 'faculty', 'niveau'] as const;
                        for (let i = 0; i < customViewDepth; i++) {
                          if (customSels[i]) f = f.filter(e => (e as any)[fieldNames[i]] === customSels[i]);
                        }
                        return f.filter(e => (e as any)[fieldNames[currentLevelIndex]] === item.value).length;
                      })();
                      return (
                        <Card key={item.id} className="bg-slate-800 border-slate-700 hover:border-purple-500/50 transition-all cursor-pointer group"
                          onClick={() => handleCustomSelectLevel(currentLevelIndex, item.value)}>
                          <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: `${cat.color}22` }}>
                                  <Layers className="w-5 h-5" style={{ color: cat.color }} />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-white">{item.label}</h3>
                                  <p className="text-sm text-gray-400">{count} épreuve(s)</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                <Button size="sm" variant="ghost"
                                  onClick={() => handleOpenLevelItemModal(cat.slug, currentLevelIndex, item)}
                                  className="h-7 w-7 p-0 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition">
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost"
                                  onClick={() => handleDeleteLevelItem(cat.slug, currentLevelIndex, item)}
                                  className="h-7 w-7 p-0 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:translate-x-1 transition"
                                  style={{ color: cat.color }} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Years view */}
            {isYearsView && (
              <div>
                {years.length === 0 ? (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-16 text-center">
                      <Calendar className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">Aucune année</h3>
                      <p className="text-gray-400">Ajoutez une épreuve pour voir les années disponibles.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {years.map((year) => {
                      let cnt = exams.filter((e: any) => e.type === `CUSTOM_${cat.slug}` && e.year === year);
                      if (customSels[0]) cnt = cnt.filter((e: any) => e.university === customSels[0]);
                      if (customSels[1]) cnt = cnt.filter((e: any) => e.faculty === customSels[1]);
                      if (customSels[2]) cnt = cnt.filter((e: any) => e.niveau === customSels[2]);
                      return (
                        <Card key={year} className="bg-slate-800 border-slate-700 hover:border-green-500 transition-all cursor-pointer group"
                          onClick={() => handleCustomSelectYear(year)}>
                          <CardContent className="p-6 text-center">
                            <Calendar className="w-8 h-8 text-green-400 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-white">{year}</div>
                            <div className="text-xs text-gray-400 mt-1">{cnt.length} épreuve(s)</div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Epreuves view */}
            {isEpreuvesView && (
              <div>
                <div className="flex justify-end mb-4">
                  <Button onClick={handleAddCustomEpreuve} className="text-white" style={{ background: cat.color }}>
                    <Plus className="w-4 h-4 mr-2" />Ajouter une épreuve
                  </Button>
                </div>
                {catExams.length === 0 ? (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-16 text-center">
                      <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">Aucune épreuve</h3>
                      <p className="text-gray-400 mb-4">Ajoutez des épreuves pour {customSelectedYear}</p>
                      <Button onClick={handleAddCustomEpreuve} className="text-white" style={{ background: cat.color }}>
                        <Plus className="w-4 h-4 mr-2" />Ajouter une épreuve
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {catExams.map((exam) => (
                      <div key={exam.id} className="relative group rounded-xl border border-slate-700/60 bg-slate-900 hover:border-purple-500/50 transition-all duration-200 overflow-hidden"
                        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                        <div className="absolute inset-y-0 left-0 w-[2px]" style={{ background: cat.color }} />
                        <div className="p-4 pl-5">
                          <h3 className="text-white font-bold text-sm leading-snug mb-2">{exam.subject}</h3>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {exam.year && <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-200 bg-slate-700 border border-slate-600">{exam.year}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-3">
                            <span className="text-slate-300">⏱ {exam.duration || 0} min</span>
                            {exam.hasCorrection && <span className="flex items-center gap-1 text-emerald-300 font-semibold"><CheckCircle className="w-3 h-3" />Corrigé IA</span>}
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                            <Link href={`/exams/${exam.id}`} className="flex-1">
                              <Button size="sm" className="w-full h-7 text-xs bg-purple-600/25 border border-purple-500/40 hover:bg-purple-600/40 text-purple-100 font-medium">
                                <Eye className="w-3 h-3 mr-1" />Voir
                              </Button>
                            </Link>
                            <Button size="sm" onClick={() => handleGenerateCorrection(exam.id)} disabled={generatingCorrectionId === exam.id || !exam.hasContent}
                              className="h-7 w-7 p-0 bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600/35 text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed">
                              {generatingCorrectionId === exam.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            </Button>
                            <Button size="sm" onClick={() => handleEditEpreuve(exam)}
                              className="h-7 w-7 p-0 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-300 hover:text-white">
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button size="sm" onClick={() => handleDeleteEpreuve(exam)}
                              className="h-7 w-7 p-0 bg-red-500/10 border border-red-500/25 hover:bg-red-500/25 text-red-400 hover:text-red-300">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {mainTab !== 'secondaire' && mainTab !== 'prepa' && mainTab !== 'custom' && <>
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
          {viewMode === 'structures' && mainTab === 'national'   && 'Examens Nationaux'}
          {viewMode === 'structures' && mainTab === 'concours'   && 'Concours Nationaux'}
          {viewMode === 'structures' && mainTab === 'universite' && 'Universités'}
          {viewMode === 'series'    && mainTab === 'concours' && `Catégories — ${selectedStructure?.label}`}
          {viewMode === 'series'    && mainTab !== 'concours' && 'Séries du Baccalauréat'}
          {viewMode === 'faculties' && 'Facultés'}
          {viewMode === 'niveaux'   && 'Niveaux'}
          {viewMode === 'years'     && 'Années'}
          {viewMode === 'epreuves'  && `Épreuves ${selectedYear}`}
        </h1>
        <p className="text-gray-400 mt-2">
          {viewMode === 'structures' && mainTab === 'national'   && 'Gérer les types d\'examens nationaux'}
          {viewMode === 'structures' && mainTab === 'concours'   && 'Gérer les concours nationaux'}
          {viewMode === 'structures' && mainTab === 'universite' && 'Gérer les universités'}
          {viewMode === 'series' && mainTab === 'concours' && 'Sélectionnez une catégorie pour continuer'}
          {viewMode === 'series' && mainTab !== 'concours' && 'Sélectionnez une série pour continuer'}
          {viewMode === 'faculties' && 'Sélectionnez une faculté'}
          {viewMode === 'niveaux' && 'Sélectionnez un niveau'}
          {viewMode === 'years' && 'Sélectionnez une année pour voir ses épreuves'}
          {viewMode === 'epreuves' && `${currentExams.length} épreuve(s) disponible(s)`}
        </p>
      </div>

      {/* Structures View */}
      {viewMode === 'structures' && (
        <div>

          {/* Examens Nationaux */}
          {mainTab === 'national' && (
            <div>
              <div className="flex justify-end mb-6">
                <Button onClick={() => handleAddStructure('national')} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />Ajouter Type
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {examTypes.filter(t => !concoursValues.includes(t.value)).map((type) => {
                  const count = exams.filter(e => e.type === type.value && e.university === 'NONE').length;
                  return (
                    <Card key={type.value} className="bg-slate-800 border-slate-700 hover:border-purple-500 transition-all cursor-pointer group"
                      onClick={() => handleSelectStructure({ type: 'national', id: type.value, label: type.label, description: type.description })}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-white flex items-center gap-2"><School className="w-5 h-5 text-purple-400" />{type.label}</CardTitle>
                            <CardDescription className="text-gray-400 mt-1">{type.description}</CardDescription>
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => handleEditStructure({ type: 'national', id: type.value, label: type.label, description: type.description })} className="border-slate-500 bg-slate-600 hover:bg-slate-500 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"><Edit className="w-3 h-3" /></Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteStructure({ type: 'national', id: type.value, label: type.label })} className="bg-red-600 hover:bg-red-700 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3 h-3" /></Button>
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
          )}

          {/* Concours Nationaux */}
          {mainTab === 'concours' && (
            <div>
              <div className="flex justify-end mb-6">
                <Button onClick={() => handleAddStructure('concours')} className="bg-rose-600 hover:bg-rose-700">
                  <Plus className="w-4 h-4 mr-2" />Ajouter Concours
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {examTypes.filter(t => concoursValues.includes(t.value)).map((type) => {
                  // Les concours ont university !== 'NONE' → ne pas filtrer sur university
                  const count = exams.filter(e => e.type === type.value).length;
                  return (
                    <Card key={type.value} className="bg-slate-800 border-slate-700 hover:border-rose-500 transition-all cursor-pointer group"
                      onClick={() => handleSelectStructure({ type: 'national', id: type.value, label: type.label, description: type.description })}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-white flex items-center gap-2"><Award className="w-5 h-5 text-rose-400" />{type.label}</CardTitle>
                            <CardDescription className="text-gray-400 mt-1">{type.description}</CardDescription>
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => handleEditStructure({ type: 'national', id: type.value, label: type.label, description: type.description })} className="border-slate-500 bg-slate-600 hover:bg-slate-500 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"><Edit className="w-3 h-3" /></Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDeleteStructure({ type: 'national', id: type.value, label: type.label })} className="bg-red-600 hover:bg-red-700 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">{count} épreuve(s)</span>
                          <ChevronRight className="w-5 h-5 text-rose-400 group-hover:translate-x-1 transition" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Universités */}
          {mainTab === 'universite' && (
          <div>
            <div className="flex justify-end mb-6">
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
          )}
        </div>
      )}

      {/* Series View (BAC) / Categories View (Concours) */}
      {viewMode === 'series' && mainTab !== 'concours' && (
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

      {/* Categories View (Concours nationaux) */}
      {viewMode === 'series' && mainTab === 'concours' && (
        <div>
          <div className="flex justify-end mb-6">
            <Button onClick={handleAddSeries} className="bg-rose-600 hover:bg-rose-700">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter Catégorie
            </Button>
          </div>
          {getConcoursCategories().length === 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-16 text-center">
                <Layers className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Aucune catégorie définie</h3>
                <p className="text-gray-400 mb-6">
                  Ajoutez des catégories pour organiser les épreuves par niveau<br />
                  (ex: Officiers, Sous-officiers, Gardiens de la paix…)
                </p>
                <Button onClick={handleAddSeries} className="bg-rose-600 hover:bg-rose-700">
                  <Plus className="w-4 h-4 mr-2" />Ajouter une catégorie
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getConcoursCategories().map((cat) => {
                const count = exams.filter(e => e.type === selectedStructure?.id && e.series === cat.value).length;
                return (
                  <Card
                    key={cat.value}
                    className="bg-slate-800 border-slate-700 hover:border-rose-500 transition-all cursor-pointer group relative"
                    onClick={() => handleSelectSeries(cat.value)}
                  >
                    <CardContent className="p-6">
                      <div className="absolute top-2 right-2 flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditSeries(cat)}
                          className="border-slate-500 bg-slate-600 hover:bg-slate-500 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteSeries(cat)}
                          className="bg-red-600 hover:bg-red-700 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <div className="w-12 h-12 bg-rose-600/20 rounded-xl flex items-center justify-center mb-4">
                        <Award className="w-6 h-6 text-rose-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">{cat.label}</h3>
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-gray-400 text-sm">{count} épreuve(s)</p>
                        <ChevronRight className="w-5 h-5 text-rose-400 group-hover:translate-x-1 transition" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
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
                  if (isConcoursValue(selectedStructure.id)) {
                    yearExams = yearExams.filter(e => e.type === selectedStructure.id);
                  } else {
                    yearExams = yearExams.filter(e => e.type === selectedStructure.id && e.university === 'NONE');
                  }
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
            <Button
              onClick={handleAddEpreuve}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une épreuve
            </Button>
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
                <div key={exam.id} className="relative group rounded-xl border border-slate-700/60 bg-slate-900 hover:border-purple-500/50 transition-all duration-200 overflow-hidden"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                  {/* Accent bar */}
                  <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-purple-500 to-cyan-500" />
                  <div className="p-4 pl-5">
                    {/* Subject */}
                    <h3 className="text-white font-bold text-sm leading-snug mb-2">{exam.subject}</h3>
                    {/* Badges */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-500/30 tracking-wide">{exam.type}</span>
                      {exam.series && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/20 text-blue-200 border border-blue-500/30">
                          {mainTab === 'concours'
                            ? (getConcoursCategories().find(c => c.value === exam.series)?.label ?? exam.series)
                            : `Série ${exam.series}`}
                        </span>
                      )}
                      {exam.niveau && <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-200 bg-slate-700 border border-slate-600">{exam.niveau}</span>}
                    </div>
                    {/* Info */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-3">
                      {exam.faculty && <span className="text-cyan-300 font-medium">{faculties.find(f => f.value === exam.faculty)?.label || exam.faculty}</span>}
                      <span className="text-slate-300">⏱ {exam.duration || 0} min</span>
                      {exam.correction && <span className="flex items-center gap-1 text-emerald-300 font-semibold"><CheckCircle className="w-3 h-3" />Corrigé IA</span>}
                    </div>
                    {correctionStatus != null && correctionStatus.id === exam.id && (
                      <p className={`text-xs mb-2 font-medium ${correctionStatus.ok ? 'text-emerald-300' : 'text-red-400'}`}>
                        {correctionStatus.ok ? '✓ Correction générée !' : '✗ Erreur lors de la génération'}
                      </p>
                    )}
                    {/* Actions */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                      <Link href={`/exams/${exam.id}`} className="flex-1">
                        <Button size="sm" className="w-full h-7 text-xs bg-purple-600/25 border border-purple-500/40 hover:bg-purple-600/40 hover:border-purple-400/60 text-purple-100 font-medium">
                          <Eye className="w-3 h-3 mr-1" />Voir
                        </Button>
                      </Link>
                      <Button size="sm" onClick={() => handleGenerateCorrection(exam.id)} disabled={generatingCorrectionId === exam.id || !exam.hasContent}
                        title={!exam.hasContent ? "Upload d'abord le PDF" : exam.hasCorrection ? 'Regénérer la correction IA' : 'Générer la correction IA'}
                        className="h-7 w-7 p-0 bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600/35 hover:border-emerald-400/60 text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed">
                        {generatingCorrectionId === exam.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      </Button>
                      <Button size="sm" onClick={() => handleEditEpreuve(exam)}
                        className="h-7 w-7 p-0 bg-slate-800 border border-slate-600 hover:bg-slate-700 hover:border-slate-500 text-slate-300 hover:text-white">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button size="sm" onClick={() => handleDeleteEpreuve(exam)}
                        className="h-7 w-7 p-0 bg-red-500/10 border border-red-500/25 hover:bg-red-500/25 hover:border-red-400/50 text-red-400 hover:text-red-300">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      </>}

      {/* ── Collèges & Lycées ─────────────────────────────────────────────── */}
      {mainTab === 'secondaire' && <>
        {/* Secondaire Header */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            {schoolViewMode !== 'schools' && (
              <Button
                variant="outline"
                onClick={handleSchoolBack}
                className="border-slate-600 bg-slate-700 hover:bg-slate-600"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
            )}
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => { setSchoolViewMode('schools'); setSelectedSchool(null); setSelectedClass(null); }}
                className={schoolViewMode === 'schools' ? 'text-white font-semibold' : 'text-gray-400 hover:text-white transition'}
              >
                Établissements
              </button>
              {selectedSchool && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                  <button
                    onClick={() => { setSchoolViewMode('classes'); setSelectedClass(null); }}
                    className={schoolViewMode === 'classes' ? 'text-white font-semibold' : 'text-gray-400 hover:text-white transition'}
                  >
                    {selectedSchool.label}
                  </button>
                </>
              )}
              {selectedClass && (
                <>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                  <span className="text-white font-semibold">{selectedClass}</span>
                </>
              )}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">
            {schoolViewMode === 'schools' && 'Collèges & Lycées'}
            {schoolViewMode === 'classes' && selectedSchool?.label}
            {schoolViewMode === 'school_epreuves' && `Épreuves — ${selectedClass}`}
          </h1>
          <p className="text-gray-400 mt-2">
            {schoolViewMode === 'schools' && 'Gérer les établissements scolaires et leurs épreuves'}
            {schoolViewMode === 'classes' && 'Sélectionnez une classe pour voir ses épreuves'}
            {schoolViewMode === 'school_epreuves' && `${getSchoolExams().length} épreuve(s) disponible(s)`}
          </p>
        </div>

        {/* Schools View */}
        {schoolViewMode === 'schools' && (
          <div>
            <div className="flex justify-end mb-6">
              <Button onClick={handleAddSchool} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter Établissement
              </Button>
            </div>
            {schools.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-16 text-center">
                  <Building2 className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Aucun établissement</h3>
                  <p className="text-gray-400 mb-6">Ajoutez un collège ou lycée pour commencer</p>
                  <Button onClick={handleAddSchool} className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un Établissement
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schools.map((school) => {
                  const count = exams.filter(e => e.university === school.value && (e.type === 'COMPOSITION' || e.type === 'DEVOIR')).length;
                  return (
                    <Card
                      key={school.id}
                      className="bg-slate-800 border-slate-700 hover:border-amber-500 transition-all cursor-pointer group"
                      onClick={() => handleSelectSchool(school)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-amber-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-white">{school.label}</h3>
                              <p className="text-sm text-gray-400">{count} épreuve(s)</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditSchool(school)}
                                className="border-slate-500 bg-slate-600 hover:bg-slate-500 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteSchool(school)}
                                className="bg-red-600 hover:bg-red-700 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            <ChevronRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Classes View */}
        {schoolViewMode === 'classes' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {getSchoolClasses().map((classe) => {
                const count = exams.filter(e =>
                  e.university === selectedSchool?.value &&
                  e.faculty === classe &&
                  (e.type === 'COMPOSITION' || e.type === 'DEVOIR')
                ).length;
                return (
                  <Card
                    key={classe}
                    className="bg-slate-800 border-slate-700 hover:border-amber-500 transition-all cursor-pointer group"
                    onClick={() => handleSelectClass(classe)}
                  >
                    <CardContent className="p-6 text-center">
                      <BookOpen className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                      <div className="text-2xl font-bold text-white mb-1">{classe}</div>
                      <div className="text-xs text-gray-400">{count} épreuve(s)</div>
                      <ChevronRight className="w-5 h-5 text-amber-400 mx-auto mt-3 group-hover:translate-x-1 transition" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* School Épreuves View */}
        {schoolViewMode === 'school_epreuves' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div />
              <Button onClick={handleAddSchoolEpreuve} className="bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une épreuve
              </Button>
            </div>

            {getSchoolExams().length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-16 text-center">
                  <FileText className="w-20 h-20 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Aucune épreuve</h3>
                  <p className="text-gray-400 mb-6">Ajoutez des épreuves pour la classe {selectedClass}</p>
                  <Button onClick={handleAddSchoolEpreuve} className="bg-amber-600 hover:bg-amber-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une Épreuve
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getSchoolExams().map((exam) => (
                  <div key={exam.id} className="relative group rounded-xl border border-slate-700/60 bg-slate-900 hover:border-amber-500/50 transition-all duration-200 overflow-hidden"
                    style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                    <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-amber-500 to-orange-500" />
                    <div className="p-4 pl-5">
                      <h3 className="text-white font-bold text-sm leading-snug mb-2">{exam.subject}</h3>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30 tracking-wide">{exam.type}</span>
                        {exam.year && <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-200 bg-slate-700 border border-slate-600">{exam.year}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-3">
                        <span className="text-slate-300">⏱ {exam.duration || 0} min</span>
                        {exam.correction && <span className="flex items-center gap-1 text-emerald-300 font-semibold"><CheckCircle className="w-3 h-3" />Corrigé IA</span>}
                      </div>
                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                        <Link href={`/exams/${exam.id}`} className="flex-1">
                          <Button size="sm" className="w-full h-7 text-xs bg-amber-600/25 border border-amber-500/40 hover:bg-amber-600/40 hover:border-amber-400/60 text-amber-100 font-medium">
                            <Eye className="w-3 h-3 mr-1" />Voir
                          </Button>
                        </Link>
                        <Button size="sm" onClick={() => handleGenerateCorrection(exam.id)} disabled={generatingCorrectionId === exam.id || !exam.hasContent}
                          title={!exam.hasContent ? "Upload d'abord le PDF" : 'Générer la correction IA'}
                          className="h-7 w-7 p-0 bg-emerald-600/15 border border-emerald-500/30 hover:bg-emerald-600/35 hover:border-emerald-400/60 text-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed">
                          {generatingCorrectionId === exam.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        </Button>
                        <Button size="sm" onClick={() => handleEditEpreuve(exam)}
                          className="h-7 w-7 p-0 bg-slate-800 border border-slate-600 hover:bg-slate-700 hover:border-slate-500 text-slate-300 hover:text-white">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button size="sm" onClick={() => handleDeleteEpreuve(exam)}
                          className="h-7 w-7 p-0 bg-red-500/10 border border-red-500/25 hover:bg-red-500/25 hover:border-red-400/50 text-red-400 hover:text-red-300">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </>}

      {/* Modals */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setSubmitError(null); }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {modalType === 'structure' && (selectedItem?.editing
                ? 'Modifier'
                : selectedItem?.type === 'concours'   ? 'Ajouter un Concours'
                : selectedItem?.type === 'university' ? 'Ajouter une Université'
                : 'Ajouter un Type d\'Examen')}
              {modalType === 'series' && mainTab === 'concours' && (selectedItem ? 'Modifier la Catégorie' : 'Ajouter une Catégorie')}
              {modalType === 'series' && mainTab !== 'concours' && (selectedItem ? 'Modifier la Série' : 'Ajouter une Série BAC')}
              {modalType === 'niveau' && (selectedItem ? 'Modifier le Niveau' : 'Ajouter un Niveau')}
              {modalType === 'faculty' && (selectedItem ? 'Modifier la Faculté' : 'Ajouter une Faculté')}
              {modalType === 'school' && (selectedItem ? "Modifier l'Établissement" : 'Ajouter un Établissement')}
              {modalType === 'year' && 'Ajouter une Année'}
              {modalType === 'epreuve' && (selectedItem ? 'Modifier l\'Épreuve' : 'Ajouter une Épreuve')}
              {modalType === 'prepClass' && (selectedItem ? 'Modifier la Classe Prépa' : 'Ajouter une Classe Prépa')}
              {modalType === 'prepExam' && (selectedItem ? 'Modifier l\'Épreuve Prépa' : `Ajouter une Épreuve — Année ${selectedPrepYear}`)}
              {modalType === 'catDef' && (selectedItem?.editing ? 'Modifier la catégorie' : 'Nouvelle catégorie d\'examens')}
              {modalType === 'levelItem' && (selectedItem?.id ? `Modifier l'élément` : `Ajouter ${pendingLevelContext ? (customCatDefs.find(c => c.slug === pendingLevelContext.slug)?.levels[pendingLevelContext.levelIndex] ?? 'Élément') : 'Élément'}`)}
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
                {selectedItem?.type !== 'university' && (
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

            {modalType === 'series' && mainTab !== 'concours' && (
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

            {modalType === 'series' && mainTab === 'concours' && (
              <div>
                <Label className="text-gray-400">Nom de la catégorie *</Label>
                <Input
                  value={seriesForm.description}
                  onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="Ex: Officiers, Sous-officiers, Gardiens de la paix…"
                  autoFocus
                />
                <p className="text-gray-500 text-xs mt-2">
                  Un identifiant sera généré automatiquement à partir du nom.
                </p>
              </div>
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

            {modalType === 'school' && (
              <div>
                <Label className="text-gray-400">Nom de l&apos;Établissement *</Label>
                <Input
                  value={schoolForm}
                  onChange={(e) => setSchoolForm(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="Ex: Prytanée Militaire de Kadiogo, Collège de la Salle"
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

                <div className="grid grid-cols-2 gap-4">
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
                    <Label className="text-gray-400">Pays</Label>
                    <select value={examForm.country} onChange={e => setExamForm({ ...examForm, country: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded-md px-3 py-2 mt-2 text-sm">
                      {[['BF','🇧🇫 Burkina Faso'],['CI',"🇨🇮 Côte d'Ivoire"],['SN','🇸🇳 Sénégal'],['ML','🇲🇱 Mali'],['NE','🇳🇪 Niger'],['TG','🇹🇬 Togo'],['BJ','🇧🇯 Bénin'],['GN','🇬🇳 Guinée'],['GH','🇬🇭 Ghana'],['NG','🇳🇬 Nigeria']].map(([c,l]) => (
                        <option key={c} value={c}>{l}</option>
                      ))}
                    </select>
                  </div>
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

            {/* ─── Modal Classe Prépa ─── */}
            {modalType === 'prepClass' && (
              <>
                <div>
                  <Label className="text-gray-400">Nom de la classe prépa *</Label>
                  <Input
                    value={prepClassForm.name}
                    onChange={(e) => setPrepClassForm({ ...prepClassForm, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Ex: CPGE de Ouagadougou"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Ville *</Label>
                    <Input
                      value={prepClassForm.city}
                      onChange={(e) => setPrepClassForm({ ...prepClassForm, city: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="Ex: Ouagadougou"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Région</Label>
                    <Input
                      value={prepClassForm.region}
                      onChange={(e) => setPrepClassForm({ ...prepClassForm, region: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="Ex: Centre"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400">Description</Label>
                  <Textarea
                    value={prepClassForm.description}
                    onChange={(e) => setPrepClassForm({ ...prepClassForm, description: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    rows={3}
                    placeholder="Description de la classe prépa..."
                  />
                </div>
              </>
            )}

            {/* ─── Modal Épreuve Prépa ─── */}
            {modalType === 'prepExam' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Matière *</Label>
                    <Input
                      value={prepExamForm.subject}
                      onChange={(e) => setPrepExamForm({ ...prepExamForm, subject: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="Ex: Mathématiques"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400">Année scolaire</Label>
                    <Input
                      type="number"
                      value={prepExamForm.year}
                      onChange={(e) => setPrepExamForm({ ...prepExamForm, year: parseInt(e.target.value) })}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400">Titre (optionnel)</Label>
                  <Input
                    value={prepExamForm.title}
                    onChange={(e) => setPrepExamForm({ ...prepExamForm, title: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Laissez vide pour utiliser la matière"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-400">Difficulté</Label>
                    <Select
                      value={prepExamForm.difficulty}
                      onValueChange={(v) => setPrepExamForm({ ...prepExamForm, difficulty: v })}
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
                  <div>
                    <Label className="text-gray-400">Durée (minutes)</Label>
                    <Input
                      type="number"
                      value={prepExamForm.duration}
                      onChange={(e) => setPrepExamForm({ ...prepExamForm, duration: parseInt(e.target.value) })}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                    />
                  </div>
                </div>
                {extractedContent && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                    <CheckCircle className="w-4 h-4" /> Contenu PDF extrait sera associé à cette épreuve
                  </div>
                )}
              </>
            )}

            {/* ─── Nouvelle catégorie ─── */}
            {modalType === 'catDef' && (
              <>
                <div>
                  <Label className="text-gray-400">Nom de la catégorie *</Label>
                  <Input
                    value={catDefForm.name}
                    onChange={(e) => setCatDefForm({ ...catDefForm, name: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="Ex: Sports, Arts, Formations Pro…"
                  />
                </div>
                <div>
                  <Label className="text-gray-400">Couleur</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="color"
                      value={catDefForm.color}
                      onChange={(e) => setCatDefForm({ ...catDefForm, color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <span className="text-sm text-gray-400">{catDefForm.color}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400">Niveaux de hiérarchie</Label>
                  <p className="text-xs text-gray-500 mt-1 mb-3">Définissez les niveaux avant d'arriver aux épreuves (ex: Établissement → Classe). 1 à 3 niveaux.</p>
                  <div className="space-y-2">
                    {catDefForm.levels.map((level, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-4">L{i+1}</span>
                        <Input
                          value={level}
                          onChange={(e) => {
                            const newLevels = [...catDefForm.levels];
                            newLevels[i] = e.target.value;
                            setCatDefForm({ ...catDefForm, levels: newLevels });
                          }}
                          className="bg-slate-700 border-slate-600 text-white flex-1"
                          placeholder={i === 0 ? 'Ex: Établissement' : i === 1 ? 'Ex: Classe' : 'Ex: Filière'}
                        />
                        {catDefForm.levels.length > 1 && (
                          <Button size="sm" variant="ghost"
                            onClick={() => setCatDefForm({ ...catDefForm, levels: catDefForm.levels.filter((_, j) => j !== i) })}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {catDefForm.levels.length < 3 && (
                      <Button size="sm" variant="ghost"
                        onClick={() => setCatDefForm({ ...catDefForm, levels: [...catDefForm.levels, ''] })}
                        className="text-gray-400 hover:text-white text-xs h-8">
                        <Plus className="w-3.5 h-3.5 mr-1" />Ajouter un niveau
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ─── Nouvel élément de niveau ─── */}
            {modalType === 'levelItem' && (
              <div>
                <Label className="text-gray-400">
                  {pendingLevelContext
                    ? (customCatDefs.find(c => c.slug === pendingLevelContext.slug)?.levels[pendingLevelContext.levelIndex] ?? 'Nom')
                    : 'Nom'} *
                </Label>
                <Input
                  value={levelItemForm.label}
                  onChange={(e) => setLevelItemForm({ ...levelItemForm, label: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white mt-2"
                  placeholder="Ex: Lycée Zinda, Terminale D…"
                  autoFocus
                />
              </div>
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
                  (selectedItem?.editing || (selectedItem?.id && modalType !== 'year')) ? 'Modifier' : 'Ajouter'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Upload Modal */}
      <Dialog open={pdfModalOpen} onOpenChange={(open) => {
        if (!open) { creatingTimers.current.forEach(clearTimeout); creatingTimers.current = []; }
        setPdfModalOpen(open);
        if (!open) { setPdfUploadStep('idle'); setPdfFile(null); setPdfUploadError(null); setCreatingStep(0); }
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Importer une épreuve PDF
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Déposez le PDF — l&apos;IA extrait, structure, génère la correction et crée l&apos;épreuve automatiquement
            </DialogDescription>
          </DialogHeader>

          {/* ── STEP 1 : idle — drop zone ── */}
          {pdfUploadStep === 'idle' && (
            <div className="space-y-4 py-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setPdfDragOver(true); }}
                onDragLeave={() => setPdfDragOver(false)}
                onDrop={handlePdfDrop}
                onClick={() => pdfInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  pdfDragOver ? 'border-purple-400 bg-purple-500/10'
                  : pdfFile ? 'border-green-500 bg-green-500/10'
                  : 'border-slate-600 bg-slate-700/50 hover:border-purple-500 hover:bg-purple-500/5'
                }`}
              >
                <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfFileSelect} />
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
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded px-3 py-2">{pdfUploadError}</p>
              )}
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400 whitespace-nowrap">Pays :</label>
                <select value={pdfCountry} onChange={e => setPdfCountry(e.target.value)}
                  className="text-xs bg-slate-700 border border-slate-600 text-white rounded-lg px-2 py-1.5 flex-1">
                  {[['BF','🇧🇫 Burkina Faso'],['CI',"🇨🇮 Côte d'Ivoire"],['SN','🇸🇳 Sénégal'],['ML','🇲🇱 Mali'],['NE','🇳🇪 Niger'],['TG','🇹🇬 Togo'],['BJ','🇧🇯 Bénin'],['GN','🇬🇳 Guinée'],['GH','🇬🇭 Ghana'],['NG','🇳🇬 Nigeria']].map(([c,l]) => (
                    <option key={c} value={c}>{l}</option>
                  ))}
                </select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPdfModalOpen(false)} className="border-slate-600 bg-slate-700 hover:bg-slate-600">Annuler</Button>
                <Button onClick={handleExtractPdf} disabled={!pdfFile} className="bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyser et créer l&apos;épreuve
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* ── STEP 2 : creating — animated steps ── */}
          {pdfUploadStep === 'creating' && (
            <div className="py-10 px-4 space-y-6">
              <p className="text-center text-gray-400 text-sm">{pdfFile?.name}</p>
              {[
                { label: 'Extraction du texte (OCR)', sublabel: 'pdftotext + tesseract' },
                { label: 'Reconstruction IA', sublabel: 'Correction des erreurs OCR' },
                { label: 'Génération de la correction', sublabel: 'Corrigé officiel par Claude' },
                { label: 'Création de l\'épreuve', sublabel: 'Enregistrement en base de données' },
              ].map((s, i) => {
                const done = creatingStep > i;
                const active = creatingStep === i;
                return (
                  <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    done ? 'border-green-500/40 bg-green-500/8'
                    : active ? 'border-purple-500/40 bg-purple-500/8'
                    : 'border-slate-700 bg-slate-800/50 opacity-40'
                  }`}>
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                      {done
                        ? <CheckCircle className="w-7 h-7 text-green-400" />
                        : active
                        ? <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                        : <div className="w-6 h-6 rounded-full border-2 border-slate-600" />
                      }
                    </div>
                    <div>
                      <p className={`font-medium text-sm ${done ? 'text-green-400' : active ? 'text-white' : 'text-gray-500'}`}>{s.label}</p>
                      <p className="text-xs text-gray-500">{s.sublabel}</p>
                    </div>
                  </div>
                );
              })}
              <p className="text-center text-gray-500 text-xs pt-2">Cette opération peut prendre 1 à 2 minutes...</p>
            </div>
          )}

          {/* ── STEP 3 : created — success ── */}
          {pdfUploadStep === 'created' && autoCreatedExam && (
            <div className="py-6 space-y-5">
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                  <CheckCircle className="w-9 h-9 text-green-400" />
                </div>
                <p className="text-white font-bold text-lg">Épreuve créée avec succès !</p>
              </div>

              <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 text-xs font-bold tracking-wide">{autoCreatedExam.type}</span>
                  {autoCreatedExam.series && <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 text-xs font-bold">Série {autoCreatedExam.series}</span>}
                  {autoCreatedExam.year && <span className="px-2.5 py-1 rounded-md bg-slate-700 text-gray-300 text-xs">{autoCreatedExam.year}</span>}
                  {autoHasCorrection && <span className="px-2.5 py-1 rounded-md bg-green-500/20 text-green-300 text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Correction</span>}
                </div>
                <p className="text-white font-semibold">{autoCreatedExam.title}</p>
                <p className="text-gray-400 text-sm">{autoCreatedExam.subject}
                  {autoCreatedExam.duration ? ` · ${autoCreatedExam.duration} min` : ''}
                  {autoCreatedExam.content?.totalPoints ? ` · ${autoCreatedExam.content.totalPoints} pts` : ''}
                </p>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { navigateToExam(autoCreatedExam); setPdfModalOpen(false); }} className="border-slate-600 bg-slate-700 hover:bg-slate-600">
                  Fermer
                </Button>
                <Button variant="outline" onClick={() => {
                  setSelectedItem(autoCreatedExam);
                  setExamForm({
                    type: autoCreatedExam.type || 'BEPC',
                    series: autoCreatedExam.series || '',
                    university: autoCreatedExam.university || 'NONE',
                    faculty: autoCreatedExam.faculty || '',
                    niveau: autoCreatedExam.niveau || '',
                    year: autoCreatedExam.year || new Date().getFullYear(),
                    subject: autoCreatedExam.subject || '',
                    title: autoCreatedExam.title || '',
                    description: autoCreatedExam.description || '',
                    difficulty: autoCreatedExam.difficulty || 'MEDIUM',
                    duration: autoCreatedExam.duration || 120,
                    country: autoCreatedExam.country || pdfCountry || 'BF',
                  });
                  setPdfModalOpen(false);
                  setModalType('epreuve');
                  setModalOpen(true);
                }} className="border-slate-600 bg-slate-700 hover:bg-slate-600">
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
                <Link href={`/exams/${autoCreatedExam.id}`}>
                  <Button className="bg-purple-600 hover:bg-purple-700">
                    <Eye className="w-4 h-4 mr-2" />
                    Voir l&apos;épreuve
                  </Button>
                </Link>
              </DialogFooter>
            </div>
          )}

          {/* ── STEP error ── */}
          {pdfUploadStep === 'error' && (
            <div className="py-8 space-y-4 text-center">
              <AlertTriangle className="w-14 h-14 text-red-400 mx-auto" />
              <p className="text-white font-semibold">Erreur lors du traitement</p>
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded px-4 py-2">{pdfUploadError}</p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPdfModalOpen(false)} className="border-slate-600 bg-slate-700 hover:bg-slate-600">Fermer</Button>
                <Button onClick={() => { setPdfUploadStep('idle'); setPdfUploadError(null); }} className="bg-purple-600 hover:bg-purple-700">Réessayer</Button>
              </DialogFooter>
            </div>
          )}

          {/* legacy preview kept but unreachable in new flow — keeping as dead code for safety */}
          {false && (
            <div className="space-y-4 py-4">
              {true ? (
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
                <Button className="bg-purple-600 hover:bg-purple-700">legacy</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
