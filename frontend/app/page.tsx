'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, BookOpen, Brain, Trophy, Zap, ChevronRight,
  CheckCircle2, Star, Users, School, Clock,
  Smartphone, TrendingUp, Shield, Play, GraduationCap,
} from 'lucide-react';
import { examConfigApi, examsApi } from '@/lib/api';

/* ─── Static data ─────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: BookOpen, color: 'icon-box-purple', iconColor: 'text-purple-400',
    title: 'Annales complètes',
    desc: 'BAC, BEPC, CEP, Concours et universités. Des centaines de sujets classés par matière et par année.',
  },
  {
    icon: Brain, color: 'icon-box-cyan', iconColor: 'text-cyan-400',
    title: 'Quiz adaptatifs',
    desc: 'Des quiz qui s\'adaptent à ton niveau pour une progression ciblée sur tes points faibles.',
  },
  {
    icon: TrendingUp, color: 'icon-box-purple', iconColor: 'text-violet-400',
    title: 'Suivi de progression',
    desc: 'Tableau de bord personnel : score moyen, points forts, matières à renforcer, streak quotidien.',
  },
  {
    icon: Smartphone, color: 'icon-box-cyan', iconColor: 'text-emerald-400',
    title: 'Disponible partout',
    desc: 'Accède à Pédja sur ton téléphone, ta tablette ou ton ordinateur, à tout moment.',
  },
];

const STEPS = [
  {
    number: '01', title: 'Crée ton compte',
    desc: 'Inscription gratuite en moins de 2 minutes. Aucune carte bancaire requise.',
    color: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)',
  },
  {
    number: '02', title: 'Choisis ta matière',
    desc: 'BAC Série D, L1 à l\'UJK, Concours FP… navigue dans les annales en quelques clics.',
    color: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.3)',
  },
  {
    number: '03', title: 'Progresse & réussis',
    desc: 'Entraîne-toi sur les sujets passés, mesure ta progression, augmente ton score.',
    color: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)',
  },
];

const PLANS = [
  {
    id: 'MONTHLY', name: 'Mensuel', price: '1 000', unit: 'FCFA / mois', badge: null,
    features: ['Accès à toutes les annales', 'Quiz illimités', 'Suivi de progression', 'Support WhatsApp'],
    color: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)', btnClass: 'btn-ghost',
  },
  {
    id: 'QUARTERLY', name: 'Trimestriel', price: '2 500', unit: 'FCFA / 3 mois', badge: '⭐ Populaire',
    features: ['Tout du plan Mensuel', 'Économise 500 FCFA', 'Accès hors-ligne', 'Statistiques avancées'],
    color: 'rgba(139,92,246,0.18)', border: 'rgba(139,92,246,0.5)', btnClass: 'btn-primary', highlight: true,
  },
  {
    id: 'ANNUAL', name: 'Annuel', price: '8 000', unit: 'FCFA / an', badge: '💎 Meilleur prix',
    features: ['Tout du plan Trimestriel', 'Économise 4 000 FCFA', '1 an d\'accès complet', 'Priorité support'],
    color: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)', btnClass: 'btn-ghost',
  },
];

const TESTIMONIALS = [
  {
    name: 'Aminata S.', role: 'BAC Série D · Ouagadougou', avatar: 'A', rating: 5,
    text: 'Grâce aux annales Pédja, j\'ai pu m\'entraîner sur tous les sujets de maths des 5 dernières années. J\'ai eu 14/20 au BAC !',
  },
  {
    name: 'Ibrahim K.', role: 'L2 · Université Joseph Ki-Zerbo', avatar: 'I', rating: 5,
    text: 'Je retrouve tous les sujets d\'examens de mon UFR classés par matière et par année. Indispensable pour mes révisions.',
  },
  {
    name: 'Fatimata O.', role: 'Concours Fonction Publique', avatar: 'F', rating: 5,
    text: 'J\'ai passé le concours de la FP après m\'être entraînée uniquement avec Pédja. Les sujets corrigés m\'ont beaucoup aidée.',
  },
];

const DIFF_LABELS: Record<string, string> = { EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile' };
const DIFF_COLOR: Record<string, string>  = { EASY: '#34d399', MEDIUM: '#fbbf24', HARD: '#f87171' };
const DIFF_BG: Record<string, string>     = { EASY: 'rgba(16,185,129,0.12)', MEDIUM: 'rgba(234,179,8,0.12)', HARD: 'rgba(239,68,68,0.12)' };

const TYPE_COLORS: Record<string, string> = {
  BAC: '#7c3aed', BEPC: '#0891b2', CEP: '#059669',
  BEP: '#d97706', CAP: '#d97706', CONCOURS_FP: '#dc2626',
  PMK: '#be185d', LICENCE: '#7c3aed', MASTER: '#6d28d9', DOCTORAT: '#4c1d95',
};

/* ─── Component ───────────────────────────────────────────────── */

export default function HomePage() {
  const [examTypes,   setExamTypes]   = useState<any[]>([]);
  const [universities, setUniversities] = useState<any[]>([]);
  const [totalExams,  setTotalExams]  = useState<number | null>(null);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [dataLoaded,  setDataLoaded]  = useState(false);

  useEffect(() => {
    // Charger les configs et les épreuves en parallèle
    Promise.allSettled([
      examConfigApi.getAll(),
      examsApi.getAll(),
    ]).then(([configRes, examsRes]) => {
      if (configRes.status === 'fulfilled') {
        const data = configRes.value;
        setExamTypes(data.examType ?? []);
        setUniversities(data.university ?? []);
      }
      if (examsRes.status === 'fulfilled') {
        const exams: any[] = examsRes.value;
        setTotalExams(exams.length);
        const sorted = [...exams].sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setRecentExams(sorted.slice(0, 4));
      }
      setDataLoaded(true);
    });
  }, []);

  const nbTypes = examTypes.length;
  const nbUnis  = universities.length;

  return (
    <div className="min-h-screen grid-bg relative overflow-hidden">

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b"
        style={{ background: 'rgba(15,17,26,0.88)', backdropFilter: 'blur(14px)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center"
              style={{ boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold grad-purple-cyan">Pédja</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#comment"         className="hover:text-white transition-colors">Comment ça marche</a>
            <a href="#tarifs"          className="hover:text-white transition-colors">Tarifs</a>
            <a href="#avis"            className="hover:text-white transition-colors">Avis</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/login"    className="btn-ghost px-4 py-2 text-sm">Connexion</Link>
            <Link href="/register" className="btn-primary px-4 py-2 text-sm flex items-center gap-1.5">
              Commencer <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="relative z-10 container mx-auto px-4 pt-20 pb-28 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[450px] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.13) 0%, transparent 70%)' }} />

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 neo-badge mb-8 text-sm px-4 py-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
            Plateforme d'apprentissage n°1 au Burkina Faso
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 leading-none tracking-tight">
            Réussis tes examens
            <span className="block mt-2 animate-shimmer">avec Pédja</span>
          </h1>

          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Annales du BAC, BEPC, Concours, universités du Burkina Faso — quiz interactifs,
            suivi personnalisé et paiement Mobile Money.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/register"
              className="btn-primary px-8 py-4 text-base flex items-center justify-center gap-2 group">
              Commencer gratuitement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/login"
              className="btn-ghost px-8 py-4 text-base flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              J'ai déjà un compte
            </Link>
          </div>

          {/* Stats dynamiques */}
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              {
                value: totalExams !== null ? (totalExams > 0 ? `${totalExams}+` : '—') : '…',
                label: 'Épreuves',
              },
              {
                value: nbTypes > 0 ? `${nbTypes}` : (dataLoaded ? '—' : '…'),
                label: 'Types d\'examens',
              },
              {
                value: nbUnis > 0 ? `${nbUnis}` : (dataLoaded ? '—' : '…'),
                label: 'Universités',
              },
            ].map((s) => (
              <div key={s.label} className="neo-inset p-3 rounded-xl text-center">
                <div className="text-xl font-bold grad-purple-cyan">{s.value}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Types d'examens (depuis la DB) ─────────────────────── */}
      <section className="relative z-10 py-14"
        style={{ background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container mx-auto px-4">
          <p className="text-center text-xs text-slate-500 uppercase tracking-widest mb-8">
            Examens & universités disponibles
          </p>

          {/* Types nationaux */}
          {examTypes.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <School className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-slate-300">Examens Nationaux</span>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {examTypes.map((type) => {
                  const col = TYPE_COLORS[type.value] || '#7c3aed';
                  return (
                    <div key={type.value}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:scale-105"
                      style={{ background: `${col}18`, border: `1px solid ${col}35` }}>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: `${col}30` }}>
                        <School className="w-3 h-3" style={{ color: col }} />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{type.label}</div>
                        {type.description && (
                          <div className="text-[10px] text-slate-500">{type.description}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Universités */}
          {universities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 justify-center">
                <GraduationCap className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-slate-300">{universities.length} Universités couvertes</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {universities.map((uni) => (
                  <span key={uni.value}
                    className="text-xs px-3 py-1.5 rounded-lg text-slate-300"
                    style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.18)' }}>
                    {uni.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Skeleton si pas encore chargé */}
          {!dataLoaded && (
            <div className="flex flex-wrap justify-center gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 w-28 rounded-xl animate-pulse"
                  style={{ background: 'rgba(255,255,255,0.05)' }} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Dernières épreuves ajoutées ───────────────────────── */}
      {recentExams.length > 0 && (
        <section className="relative z-10 container mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 neo-badge mb-4 text-xs px-3 py-1.5">
              <BookOpen className="w-3 h-3 text-purple-400" /> Contenu récent
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Dernières épreuves publiées</h2>
            <p className="text-slate-400">Les sujets les plus récents ajoutés à la plateforme</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mb-8">
            {recentExams.map((exam) => {
              const col = TYPE_COLORS[exam.type] || '#7c3aed';
              return (
                <div key={exam.id} className="neo-card p-5 flex flex-col gap-3 group hover:scale-[1.02] transition-transform">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${col}20`, border: `1px solid ${col}35` }}>
                      <BookOpen className="w-4 h-4" style={{ color: col }} />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                      style={{ background: DIFF_BG[exam.difficulty], color: DIFF_COLOR[exam.difficulty] }}>
                      {DIFF_LABELS[exam.difficulty]}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white mb-1 line-clamp-2">{exam.subject}</h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: `${col}18`, color: col }}>
                        {exam.type}{exam.series ? ` Sér. ${exam.series}` : ''}
                      </span>
                      {exam.year && (
                        <span className="text-[10px] text-slate-500">{exam.year}</span>
                      )}
                    </div>
                  </div>

                  {/* Footer meta */}
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 border-t pt-3"
                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {exam.duration > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{exam.duration} min
                      </span>
                    )}
                    {exam.faculty && (
                      <span className="truncate text-cyan-500">{exam.faculty}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <Link href="/login"
              className="inline-flex items-center gap-2 btn-ghost px-6 py-3 text-sm">
              Voir toutes les épreuves
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="fonctionnalites" className="relative z-10 container mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 neo-badge mb-4 text-xs px-3 py-1.5">
            <Star className="w-3 h-3 text-yellow-400" /> Fonctionnalités
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Tout ce dont tu as besoin</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Des outils conçus pour les étudiants burkinabè, accessibles depuis n'importe quel appareil.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const isCyan = i % 2 === 1;
            return (
              <div key={f.title} className={`${isCyan ? 'neo-card-cyan' : 'neo-card'} p-6 flex flex-col`}>
                <div className={`${f.color} w-12 h-12 mb-5`}>
                  <Icon className={`w-6 h-6 ${f.iconColor}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="comment" className="relative z-10 py-24"
        style={{ background: 'rgba(255,255,255,0.012)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 neo-badge mb-4 text-xs px-3 py-1.5">
              <Zap className="w-3 h-3 text-purple-400" /> Simple & rapide
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Comment ça marche ?</h2>
            <p className="text-slate-400">Démarrer sur Pédja prend moins de 3 minutes</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
            <div className="absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px hidden md:block"
              style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.4), rgba(6,182,212,0.4))' }} />
            {STEPS.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5 relative z-10 text-2xl font-black text-white"
                  style={{ background: step.color, border: `1px solid ${step.border}` }}>
                  {step.number}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────── */}
      <section id="tarifs" className="relative z-10 container mx-auto px-4 py-24">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 neo-badge mb-4 text-xs px-3 py-1.5">
            <Shield className="w-3 h-3 text-emerald-400" /> Tarifs simples
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Choisis ton plan</h2>
          <p className="text-slate-400">Paiement Mobile Money · Orange Money, Moov Money, Wave</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {PLANS.map((plan) => (
            <div key={plan.id} className="relative rounded-2xl p-6 flex flex-col"
              style={{
                background: plan.color, border: `1px solid ${plan.border}`,
                boxShadow: (plan as any).highlight ? '0 0 40px rgba(139,92,246,0.15)' : 'none',
                transform: (plan as any).highlight ? 'scale(1.03)' : 'none',
              }}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
                  {plan.badge}
                </div>
              )}
              <div className="mb-5">
                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black grad-purple-cyan">{plan.price}</span>
                  <span className="text-sm text-slate-400 mb-1">{plan.unit}</span>
                </div>
              </div>
              <ul className="space-y-2.5 mb-7 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register"
                className={`${plan.btnClass} py-3 text-sm font-semibold text-center rounded-xl flex items-center justify-center gap-2`}>
                Commencer <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-500 mt-8">
          Paiement sécurisé via{' '}
          <span className="text-orange-400 font-medium">Orange Money</span> ·{' '}
          <span className="text-blue-400 font-medium">Moov Money</span> ·{' '}
          <span className="text-cyan-400 font-medium">Wave</span>
        </p>
      </section>

      {/* ── Testimonials ───────────────────────────────────────── */}
      <section id="avis" className="relative z-10 py-24"
        style={{ background: 'rgba(255,255,255,0.012)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 neo-badge mb-4 text-xs px-3 py-1.5">
              <Users className="w-3 h-3 text-cyan-400" /> Témoignages
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Ils ont réussi avec Pédja</h2>
            <p className="text-slate-400">Des étudiants de partout au Burkina Faso partagent leur expérience</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="neo-card p-6 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-[11px] text-slate-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA finale ─────────────────────────────────────────── */}
      <section className="relative z-10 container mx-auto px-4 py-24">
        <div className="max-w-3xl mx-auto rounded-2xl p-12 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(6,182,212,0.1) 100%)',
            border: '1px solid rgba(139,92,246,0.35)',
            boxShadow: '0 0 60px rgba(139,92,246,0.1)',
          }}>
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 neo-badge mb-6">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              Rejoins la communauté
            </div>
            <h2 className="text-4xl font-black text-white mb-4">Prêt à réussir ?</h2>
            <p className="text-slate-400 mb-8 text-base max-w-md mx-auto">
              Rejoins des étudiants du Burkina Faso qui révisent plus intelligemment avec Pédja.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register"
                className="btn-primary px-8 py-4 text-base flex items-center justify-center gap-2 group">
                Créer mon compte gratuit
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login"
                className="btn-ghost px-8 py-4 text-base flex items-center justify-center gap-2">
                J'ai déjà un compte
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center"
                  style={{ boxShadow: '0 0 15px rgba(139,92,246,0.35)' }}>
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold grad-purple-cyan">Pédja</span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
                La plateforme d'apprentissage dédiée aux étudiants du Burkina Faso.
                Annales, quiz et suivi personnalisé.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Plateforme</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/register" className="hover:text-white transition-colors">S'inscrire</Link></li>
                <li><Link href="/login"    className="hover:text-white transition-colors">Se connecter</Link></li>
                <li><a href="#tarifs"      className="hover:text-white transition-colors">Tarifs</a></li>
                <li><a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Examens</h4>
              <ul className="space-y-2 text-sm">
                {examTypes.length > 0
                  ? examTypes.map((t) => (
                      <li key={t.value}>
                        <Link href="/login" className="text-slate-400 hover:text-white transition-colors">
                          {t.label}
                        </Link>
                      </li>
                    ))
                  : ['BAC', 'BEPC', 'CEP', 'Concours FP', 'Universités'].map((e) => (
                      <li key={e}>
                        <Link href="/login" className="text-slate-400 hover:text-white transition-colors">{e}</Link>
                      </li>
                    ))
                }
              </ul>
            </div>
          </div>
          <div className="neo-divider mb-6" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <span>&copy; 2026 Pédja — Tous droits réservés.</span>
            <div className="flex items-center gap-1">
              <span>Paiement ·</span>
              <span className="text-orange-400">Orange Money</span>
              <span>·</span>
              <span className="text-blue-400">Moov</span>
              <span>·</span>
              <span className="text-cyan-400">Wave</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
