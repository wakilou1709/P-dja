'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { examsApi, examConfigApi, subscriptionApi } from '@/lib/api';
import {
  BookOpen, Calendar, ChevronRight, GraduationCap, Home, School,
  Search, Filter, X, Clock, Target, Briefcase, Layers, Lock, Zap,
} from 'lucide-react';

type ViewMode = 'structures' | 'series' | 'faculties' | 'niveaux' | 'years' | 'epreuves';
interface Structure { type: 'national' | 'university'; id: string; label: string; description?: string; }
interface ConfigItem { id: string; value: string; label: string; description?: string; extra?: any; }

const DIFF_COLORS: Record<string, string> = {
  EASY:   'neo-badge-green', MEDIUM: 'neo-badge', HARD: 'neo-badge-red',
};
const DIFF_LABELS: Record<string, string> = {
  EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile',
};

function SectionHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <button onClick={onBack} className="btn-ghost px-3 py-1.5 text-sm flex items-center gap-1">
        <ChevronRight className="w-4 h-4 rotate-180" />
        Retour
      </button>
    </div>
  );
}

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Config lists — chargées depuis la base de données
  const [examTypes,        setExamTypes]        = useState<ConfigItem[]>([]);
  const [universities,     setUniversities]     = useState<ConfigItem[]>([]);
  const [bacSeries,        setBacSeries]        = useState<ConfigItem[]>([]);
  const [universityLevels, setUniversityLevels] = useState<ConfigItem[]>([]);
  const [faculties,        setFaculties]        = useState<ConfigItem[]>([]);

  // Navigation
  const [viewMode, setViewMode] = useState<ViewMode>('structures');
  const [selectedStructure, setSelectedStructure] = useState<Structure | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [selectedNiveau, setSelectedNiveau] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('ALL');
  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterDuration, setFilterDuration] = useState('ALL');

  // Subscription
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    examsApi.getAll()
      .then(setExams)
      .catch(console.error)
      .finally(() => setLoading(false));

    examConfigApi.getAll()
      .then((data) => {
        setExamTypes(data.examType ?? []);
        setUniversities(data.university ?? []);
        setBacSeries(data.bacSeries ?? []);
        setUniversityLevels(data.niveau ?? []);
        setFaculties(data.faculty ?? []);
      })
      .catch(console.error);

    subscriptionApi.checkAccess()
      .then((r) => setHasAccess(r.hasAccess))
      .catch(() => setHasAccess(false));
  }, []);

  // Facultés scoped à l'université sélectionnée ou globales
  const getFacultiesForUniversity = (): ConfigItem[] => {
    if (!selectedStructure || selectedStructure.type !== 'university') return [];
    return faculties.filter(f =>
      !f.extra?.university || f.extra.university === selectedStructure.id
    );
  };

  const getYears = () => {
    let fe = exams;
    if (selectedStructure?.type === 'national') {
      fe = exams.filter(e => e.type === selectedStructure.id && e.university === 'NONE');
      if (selectedStructure.id === 'BAC' && selectedSeries)
        fe = fe.filter(e => e.series === selectedSeries);
    } else if (selectedStructure?.type === 'university') {
      fe = exams.filter(e => e.university === selectedStructure.id);
      if (selectedFaculty) fe = fe.filter(e => e.faculty === selectedFaculty);
      if (selectedNiveau)  fe = fe.filter(e => e.niveau === selectedNiveau);
    }
    return Array.from(new Set(fe.map(e => e.year))).sort((a, b) => b - a);
  };

  const getCurrentExams = () => {
    if (!selectedYear) return [];
    let fe = exams.filter(e => e.year === selectedYear);
    if (selectedStructure?.type === 'national') {
      fe = fe.filter(e => e.type === selectedStructure.id && e.university === 'NONE');
      if (selectedSeries) fe = fe.filter(e => e.series === selectedSeries);
    } else if (selectedStructure?.type === 'university') {
      fe = fe.filter(e => e.university === selectedStructure.id);
      if (selectedFaculty) fe = fe.filter(e => e.faculty === selectedFaculty);
      if (selectedNiveau)  fe = fe.filter(e => e.niveau === selectedNiveau);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      fe = fe.filter(e => e.title?.toLowerCase().includes(q) || e.subject?.toLowerCase().includes(q));
    }
    if (filterDifficulty !== 'ALL') fe = fe.filter(e => e.difficulty === filterDifficulty);
    if (filterSubject !== 'ALL')    fe = fe.filter(e => e.subject === filterSubject);
    if (filterDuration === 'SHORT') fe = fe.filter(e => e.duration <= 60);
    if (filterDuration === 'MEDIUM') fe = fe.filter(e => e.duration > 60 && e.duration <= 120);
    if (filterDuration === 'LONG')  fe = fe.filter(e => e.duration > 120);
    return fe;
  };

  const getAvailableSubjects = () => Array.from(new Set(exams.map(e => e.subject))).sort();

  const handleSelectStructure = (s: Structure) => {
    setSelectedStructure(s); setSelectedSeries(null); setSelectedFaculty(null);
    setSelectedNiveau(null); setSelectedYear(null);
    if (s.type === 'national' && s.id === 'BAC') setViewMode('series');
    else if (s.type === 'university') setViewMode('faculties');
    else setViewMode('years');
  };

  const handleBack = () => {
    if (viewMode === 'epreuves') { setSelectedYear(null); setViewMode('years'); }
    else if (viewMode === 'years') {
      if (selectedNiveau) { setSelectedNiveau(null); setViewMode('niveaux'); }
      else if (selectedFaculty) { setSelectedFaculty(null); setViewMode('faculties'); }
      else if (selectedSeries) { setSelectedSeries(null); setViewMode('series'); }
      else { setSelectedStructure(null); setViewMode('structures'); }
    } else if (viewMode === 'niveaux') { setSelectedFaculty(null); setViewMode('faculties'); }
    else if (viewMode === 'faculties' || viewMode === 'series') { setSelectedStructure(null); setViewMode('structures'); }
  };

  const resetNavigation = () => {
    setSelectedStructure(null); setSelectedSeries(null); setSelectedFaculty(null);
    setSelectedNiveau(null); setSelectedYear(null); setViewMode('structures');
  };

  const activeFiltersCount = [filterDifficulty, filterSubject, filterDuration].filter(f => f !== 'ALL').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Chargement des examens...</span>
        </div>
      </div>
    );
  }

  const years = getYears();
  const currentExams = getCurrentExams();

  // Breadcrumb
  const breadcrumb: { label: string; onClick: () => void }[] = [{ label: 'Accueil', onClick: resetNavigation }];
  if (selectedStructure) breadcrumb.push({ label: selectedStructure.label, onClick: () => handleSelectStructure(selectedStructure) });
  if (selectedSeries) breadcrumb.push({ label: `Série ${selectedSeries}`, onClick: () => { setSelectedSeries(selectedSeries); setViewMode('years'); } });
  if (selectedFaculty) {
    const facLabel = faculties.find(f => f.value === selectedFaculty)?.label || selectedFaculty;
    breadcrumb.push({ label: facLabel, onClick: () => { setSelectedFaculty(selectedFaculty); setViewMode('niveaux'); } });
  }
  if (selectedNiveau) {
    const niveauLabel = universityLevels.find(n => n.value === selectedNiveau)?.label || selectedNiveau;
    breadcrumb.push({ label: niveauLabel, onClick: () => { setSelectedNiveau(selectedNiveau); setViewMode('years'); } });
  }
  if (selectedYear) breadcrumb.push({ label: String(selectedYear), onClick: () => {} });

  return (
    <div className="space-y-6 pb-12 animate-fade-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-glow" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">Bibliothèque</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Annales d'Examens</h1>
        <p className="text-slate-400 text-sm mt-1">Parcourez les sujets d'examens du Burkina Faso</p>
      </div>

      {/* Subscription CTA */}
      {hasAccess === false && (
        <div
          className="rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(6,182,212,0.06) 100%)',
            border: '1px solid rgba(139,92,246,0.3)',
          }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.2)' }}>
              <Lock className="w-4.5 h-4.5 text-purple-400" style={{ width: '1.1rem', height: '1.1rem' }} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Abonne-toi pour voir les épreuves</p>
              <p className="text-xs text-slate-400">Tu peux parcourir la liste librement — le contenu est débloqué avec un abonnement.</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/subscribe')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0 transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', boxShadow: '0 0 15px rgba(139,92,246,0.3)' }}
          >
            <Zap className="w-4 h-4" />
            S'abonner — 1 000 FCFA/mois
          </button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" />
            <input
              type="text"
              placeholder="Rechercher un examen, une matière..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neo-input w-full pl-11 pr-10 py-3 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all relative ${showFilters ? 'btn-primary' : 'neo-btn'}`}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-purple-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="neo-card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-white">Filtres avancés</span>
              <button
                onClick={() => { setFilterDifficulty('ALL'); setFilterSubject('ALL'); setFilterDuration('ALL'); }}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" /> Réinitialiser
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {[
                { icon: Target,   label: 'Difficulté', value: filterDifficulty, onChange: setFilterDifficulty,
                  options: [['ALL','Toutes'],['EASY','Facile'],['MEDIUM','Moyen'],['HARD','Difficile']] },
                { icon: BookOpen, label: 'Matière',    value: filterSubject,    onChange: setFilterSubject,
                  options: [['ALL','Toutes'], ...getAvailableSubjects().map(s => [s, s])] },
                { icon: Clock,    label: 'Durée',      value: filterDuration,   onChange: setFilterDuration,
                  options: [['ALL','Toutes'],['SHORT','≤ 1h'],['MEDIUM','1-2h'],['LONG','> 2h']] },
              ].map(({ icon: Icon, label, value, onChange, options }) => (
                <div key={label}>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-wider mb-2">
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </label>
                  <select value={value} onChange={(e) => onChange(e.target.value)} className="neo-input w-full px-3 py-2.5 text-sm">
                    {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      {viewMode !== 'structures' && (
        <div className="flex items-center gap-1.5 text-sm flex-wrap">
          {breadcrumb.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600" />}
              <button
                onClick={item.onClick}
                className={`flex items-center gap-1 transition-colors ${
                  i === breadcrumb.length - 1 ? 'text-white font-semibold' : 'text-slate-500 hover:text-purple-400'
                }`}
              >
                {i === 0 && <Home className="w-3.5 h-3.5" />}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* === VIEW: STRUCTURES === */}
      {viewMode === 'structures' && (
        <div className="space-y-8">
          {/* Examens Nationaux */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="icon-box-purple w-7 h-7"><School className="w-3.5 h-3.5 text-purple-400" /></div>
              <h2 className="text-lg font-bold text-white">Examens Nationaux</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {examTypes.map((type) => {
                const count = exams.filter(e => e.type === type.value && e.university === 'NONE').length;
                return (
                  <button
                    key={type.value}
                    onClick={() => handleSelectStructure({ type: 'national', id: type.value, label: type.label, description: type.description })}
                    className="neo-card p-5 text-left group w-full"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="icon-box-purple w-10 h-10">
                        <School className="w-5 h-5 text-purple-400" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-purple-400/40 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-1">{type.label}</h3>
                    <p className="text-xs text-slate-400 mb-3">{type.description}</p>
                    <div className="neo-badge text-[10px]">{count} épreuve{count > 1 ? 's' : ''}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Universités */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="icon-box-cyan w-7 h-7"><GraduationCap className="w-3.5 h-3.5 text-cyan-400" /></div>
              <h2 className="text-lg font-bold text-white">Universités</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {universities.map((uni) => {
                const count = exams.filter(e => e.university === uni.value).length;
                return (
                  <button
                    key={uni.value}
                    onClick={() => handleSelectStructure({ type: 'university', id: uni.value, label: uni.label })}
                    className="neo-card-cyan p-4 text-left group w-full flex items-center gap-3"
                  >
                    <div className="icon-box-cyan w-9 h-9 flex-shrink-0">
                      <GraduationCap className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{uni.label}</h3>
                      <p className="text-xs text-slate-400">{count} épreuve{count > 1 ? 's' : ''}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-cyan-400/40 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* === VIEW: SERIES (BAC) === */}
      {viewMode === 'series' && (
        <div>
          <SectionHeader title="Séries du Baccalauréat" onBack={handleBack} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bacSeries.map((series) => {
              const count = exams.filter(e => e.type === 'BAC' && e.series === series.value).length;
              return (
                <button
                  key={series.value}
                  onClick={() => { setSelectedSeries(series.value); setSelectedYear(null); setViewMode('years'); }}
                  className="neo-card-glow p-6 text-left group w-full relative overflow-hidden"
                >
                  <div className="absolute top-3 right-3 text-4xl font-black text-purple-500/10">{series.value}</div>
                  <div className="icon-box-purple w-10 h-10 mb-4">
                    <School className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{series.label}</h3>
                  <p className="text-xs text-slate-400 mb-3">{series.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="neo-badge text-[10px]">{count} épreuve{count > 1 ? 's' : ''}</span>
                    <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* === VIEW: FACULTIES === */}
      {viewMode === 'faculties' && (
        <div>
          <SectionHeader title="Facultés" onBack={handleBack} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {getFacultiesForUniversity().map((faculty) => {
              const count = exams.filter(e => e.university === selectedStructure?.id && e.faculty === faculty.value).length;
              return (
                <button
                  key={faculty.value}
                  onClick={() => { setSelectedFaculty(faculty.value); setSelectedNiveau(null); setSelectedYear(null); setViewMode('niveaux'); }}
                  className="neo-card p-4 text-left group w-full flex items-center gap-3"
                  style={{ borderColor: 'rgba(16,185,129,0.1)' }}
                >
                  <div className="icon-box-emerald w-9 h-9 flex-shrink-0">
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{faculty.label}</h3>
                    <p className="text-xs text-slate-400">{count} épreuve{count > 1 ? 's' : ''}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400/40 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* === VIEW: NIVEAUX === */}
      {viewMode === 'niveaux' && (
        <div>
          <SectionHeader title="Niveaux" onBack={handleBack} />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {universityLevels.map((niveau) => {
              const count = exams.filter(e =>
                e.university === selectedStructure?.id && e.faculty === selectedFaculty && e.niveau === niveau.value
              ).length;
              return (
                <button
                  key={niveau.value}
                  onClick={() => { setSelectedNiveau(niveau.value); setSelectedYear(null); setViewMode('years'); }}
                  className="neo-card-cyan p-5 text-center group w-full"
                >
                  <div className="icon-box-cyan w-10 h-10 mx-auto mb-3">
                    <Layers className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-0.5">{niveau.label}</h3>
                  <p className="text-xs text-slate-400 mb-3">{niveau.description}</p>
                  <span className="neo-badge-cyan neo-badge text-[10px]">{count} épreuve{count > 1 ? 's' : ''}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* === VIEW: YEARS === */}
      {viewMode === 'years' && (
        <div>
          <SectionHeader title="Années disponibles" onBack={handleBack} />
          {years.length === 0 ? (
            <div className="neo-card p-12 text-center">
              <div className="icon-box-purple w-16 h-16 mx-auto mb-4">
                <Calendar className="w-8 h-8 text-purple-400/40" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Aucune année disponible</h3>
              <p className="text-slate-400 text-sm">Aucune épreuve pour cette sélection</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {years.map((year) => {
                let fe = exams.filter(e => e.year === year);
                if (selectedStructure?.type === 'national') {
                  fe = fe.filter(e => e.type === selectedStructure.id && e.university === 'NONE');
                  if (selectedSeries) fe = fe.filter(e => e.series === selectedSeries);
                } else if (selectedStructure?.type === 'university') {
                  fe = fe.filter(e => e.university === selectedStructure.id);
                  if (selectedFaculty) fe = fe.filter(e => e.faculty === selectedFaculty);
                  if (selectedNiveau)  fe = fe.filter(e => e.niveau === selectedNiveau);
                }
                return (
                  <button
                    key={year}
                    onClick={() => { setSelectedYear(year); setViewMode('epreuves'); }}
                    className="neo-card p-4 text-center group w-full"
                  >
                    <div className="icon-box-purple w-9 h-9 mx-auto mb-2">
                      <Calendar className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-xl font-bold text-white">{year}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{fe.length} épreuve{fe.length > 1 ? 's' : ''}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* === VIEW: EPREUVES === */}
      {viewMode === 'epreuves' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Épreuves {selectedYear}</h2>
              <p className="text-slate-400 text-sm mt-0.5">{currentExams.length} résultat{currentExams.length > 1 ? 's' : ''}</p>
            </div>
            <button onClick={handleBack} className="btn-ghost px-3 py-1.5 text-sm flex items-center gap-1">
              <ChevronRight className="w-4 h-4 rotate-180" /> Retour
            </button>
          </div>

          {currentExams.length === 0 ? (
            <div className="neo-card p-12 text-center">
              <div className="icon-box-purple w-16 h-16 mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-purple-400/40" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Aucune épreuve trouvée</h3>
              <p className="text-slate-400 text-sm">Essayez de modifier vos critères de recherche</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentExams.map((exam) => (
                <div key={exam.id} className="neo-card overflow-hidden group relative">
                  {/* Lock overlay */}
                  {hasAccess === false && (
                    <div
                      className="absolute top-3 right-3 z-10 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium"
                      style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                    >
                      <Lock className="w-3 h-3" /> Abonnement requis
                    </div>
                  )}

                  {/* Card header */}
                  <div
                    className="px-5 py-4 flex items-start justify-between"
                    style={{ background: 'rgba(139,92,246,0.06)', borderBottom: '1px solid rgba(139,92,246,0.1)' }}
                  >
                    <div className="flex flex-col gap-1.5">
                      <span className="neo-badge text-[10px]">
                        {exam.type}{exam.series ? ` · Série ${exam.series}` : ''}
                      </span>
                      {exam.faculty && (
                        <span className="text-[10px] text-cyan-400">{exam.faculty}</span>
                      )}
                    </div>
                    <span className="text-3xl font-black text-white/10">{exam.year}</span>
                  </div>

                  {/* Card body */}
                  <div className="p-5">
                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-purple-400 transition-colors line-clamp-2">
                      {exam.subject}
                    </h3>
                    {exam.niveau && <p className="text-xs text-slate-500 mb-3">{exam.niveau}</p>}

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: DIFF_LABELS[exam.difficulty] || exam.difficulty, sub: 'Niveau' },
                        { label: `${exam.duration}min`, sub: 'Durée' },
                        { label: exam.totalQuestions || 0, sub: 'Questions' },
                      ].map(({ label, sub }) => (
                        <div key={sub} className="neo-inset p-2 text-center rounded-lg">
                          <div className="text-xs font-semibold text-white">{label}</div>
                          <div className="text-[10px] text-slate-500">{sub}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`neo-badge ${DIFF_COLORS[exam.difficulty] || ''}`}>
                        {DIFF_LABELS[exam.difficulty]}
                      </span>
                      <button
                        onClick={() => {
                          if (!hasAccess) {
                            setShowPaywall(true);
                          } else {
                            router.push(`/exams/${exam.id}`);
                          }
                        }}
                        className="flex-1 btn-primary py-2 text-xs text-center flex items-center justify-center gap-1"
                      >
                        {hasAccess === false && <Lock className="w-3 h-3" />}
                        Voir l'examen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Paywall Modal */}
      {showPaywall && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowPaywall(false)}
        >
          <div
            className="neo-card-glow p-7 max-w-sm w-full text-center space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
              style={{ background: 'rgba(139,92,246,0.15)', boxShadow: 'inset 0 0 0 1px rgba(139,92,246,0.3)' }}
            >
              <Lock className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Contenu réservé aux abonnés</h3>
              <p className="text-slate-400 text-sm">
                Accède à toutes les épreuves pour seulement{' '}
                <strong className="text-white">1 000 FCFA / mois</strong>
              </p>
            </div>
            <div className="neo-inset p-4 rounded-xl text-left space-y-2">
              {['Toutes les matières', 'Examens de toutes les universités', 'BAC, BEPC, CEP, Concours'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400">✅</span> {item}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPaywall(false)} className="btn-ghost flex-1 py-2.5 text-sm">
                Fermer
              </button>
              <button
                onClick={() => { setShowPaywall(false); router.push('/subscribe'); }}
                className="btn-primary flex-1 py-2.5 text-sm"
              >
                S'abonner maintenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
