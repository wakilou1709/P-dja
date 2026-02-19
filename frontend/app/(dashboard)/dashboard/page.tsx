'use client';

import { useEffect, useState } from 'react';
import { authApi, examsApi, examConfigApi, subscriptionApi } from '@/lib/api';
import {
  BookOpen, Brain, Trophy, TrendingUp, ArrowRight, Zap, Lock,
  CheckCircle2, School, GraduationCap, Clock, Star,
  Flame, ChevronRight, Lightbulb, Target,
} from 'lucide-react';
import Link from 'next/link';

/* ─── Static data ─────────────────────────────────────────────── */

const PLAN_LABELS: Record<string, string> = {
  MONTHLY:   'Mensuel',
  QUARTERLY: 'Trimestriel',
  ANNUAL:    'Annuel',
  FREE:      'Gratuit',
};

const TYPE_COLORS: Record<string, string> = {
  BAC: '#7c3aed', BEPC: '#0891b2', CEP: '#059669',
  BEP: '#d97706', CAP: '#d97706', CONCOURS_FP: '#dc2626',
  PMK: '#be185d', LICENCE: '#7c3aed', MASTER: '#6d28d9', DOCTORAT: '#4c1d95',
};

const DIFF_LABELS: Record<string, string> = { EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile' };
const DIFF_COLOR: Record<string, string>  = { EASY: '#34d399', MEDIUM: '#fbbf24', HARD: '#f87171' };
const DIFF_BG: Record<string, string>     = {
  EASY: 'rgba(16,185,129,0.12)', MEDIUM: 'rgba(234,179,8,0.12)', HARD: 'rgba(239,68,68,0.12)',
};

const TIPS = [
  { icon: '📚', title: 'Méthode de révision', tip: 'Répète tes révisions sur plusieurs jours plutôt qu\'en une seule session. La répétition espacée booste la mémorisation à long terme.' },
  { icon: '⏱️', title: 'La règle des 25 minutes', tip: 'Travaille 25 minutes en pleine concentration, puis fais une pause de 5 minutes. Cette technique Pomodoro améliore ta productivité.' },
  { icon: '✍️', title: 'Rédige tes résumés', tip: 'Reformuler un cours dans tes propres mots est l\'une des meilleures façons d\'ancrer les connaissances en mémoire.' },
  { icon: '🎯', title: 'Un objectif par session', tip: 'Fixe-toi un objectif précis avant chaque session de travail : "Je vais maîtriser les dérivées" plutôt que "Je vais réviser les maths".' },
  { icon: '🧘', title: 'Le sommeil, ton allié', tip: 'Dormir après une révision consolide la mémoire. Évite les révisions intensives la nuit avant un examen.' },
  { icon: '🤝', title: 'Enseigne ce que tu sais', tip: 'Expliquer un concept à un camarade t\'oblige à comprendre en profondeur. Si tu ne peux pas l\'expliquer simplement, tu ne le maîtrises pas encore.' },
  { icon: '📝', title: 'Les annales, ton meilleur ami', tip: 'Entraîne-toi sur les sujets des années précédentes. Les examinateurs ont tendance à poser des questions similaires.' },
];

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

/* ─── Skeleton helpers ────────────────────────────────────────── */

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.05)' }}
    />
  );
}

/* ─── Page ────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [user,         setUser]         = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [hasAccess,    setHasAccess]    = useState<boolean | null>(null);
  const [recentExams,  setRecentExams]  = useState<any[]>([]);
  const [totalExams,   setTotalExams]   = useState<number | null>(null);
  const [nbTypes,      setNbTypes]      = useState<number | null>(null);
  const [nbUnis,       setNbUnis]       = useState<number | null>(null);
  const [loading,      setLoading]      = useState(true);

  const todayTip = TIPS[new Date().getDay() % TIPS.length];

  useEffect(() => {
    Promise.allSettled([
      authApi.getCurrentUser(),
      subscriptionApi.getMySubscription(),
      examsApi.getAll(),
      examConfigApi.getAll(),
    ]).then(([userRes, subRes, examsRes, configRes]) => {
      if (userRes.status === 'fulfilled')  setUser(userRes.value);

      if (subRes.status === 'fulfilled') {
        setSubscription(subRes.value.subscription);
        setHasAccess(subRes.value.hasAccess);
      } else {
        setHasAccess(false);
      }

      if (examsRes.status === 'fulfilled') {
        const exams: any[] = examsRes.value;
        setTotalExams(exams.length);
        const sorted = [...exams].sort((a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setRecentExams(sorted.slice(0, 3));
      } else {
        setTotalExams(0);
      }

      if (configRes.status === 'fulfilled') {
        const data = configRes.value;
        setNbTypes((data.examType ?? []).length);
        setNbUnis((data.university ?? []).length);
      } else {
        setNbTypes(0);
        setNbUnis(0);
      }

      setLoading(false);
    });
  }, []);

  /* ── Derived values ─────────────────────────────────────────── */

  const isSubscribed = hasAccess === true;
  const planLabel    = PLAN_LABELS[subscription?.plan] || 'Inconnu';
  const daysLeft     = subscription?.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / 86400000))
    : null;

  // Show '…' while loading, actual value otherwise
  const statVal = (v: number | null) => (loading ? '…' : (v !== null ? v : '—'));

  const platformStats = [
    { icon: BookOpen,      value: statVal(totalExams), label: 'Épreuves disponibles', color: 'icon-box-purple', iconColor: 'text-purple-400' },
    { icon: School,        value: statVal(nbTypes),    label: 'Types d\'examens',     color: 'icon-box-cyan',   iconColor: 'text-cyan-400'   },
    { icon: GraduationCap, value: statVal(nbUnis),     label: 'Universités',          color: 'icon-box-purple', iconColor: 'text-violet-400' },
    { icon: Star,          value: loading ? '…' : (user?.points ?? 0), label: `Niv. ${loading ? '…' : (user?.level ?? 1)} · Points`, color: 'icon-box-cyan', iconColor: 'text-yellow-400' },
  ];

  const actions = [
    { href: '/quiz',    icon: Brain,    title: 'Commencer un quiz',  desc: 'Teste tes connaissances',     color: 'purple' },
    { href: '/exams',   icon: BookOpen, title: 'Voir les annales',   desc: 'Parcours les examens passés', color: 'cyan'   },
    { href: '/profile', icon: Trophy,   title: 'Mon profil',         desc: 'Voir mes statistiques',       color: 'violet' },
  ];

  return (
    <div className="space-y-7 animate-fade-up">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Tableau de bord</span>
          </div>
          {loading ? (
            <div className="space-y-2">
              <SkeletonBox className="h-8 w-64" />
              <SkeletonBox className="h-4 w-44" />
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-white">
                {getGreeting()},{' '}
                <span className="grad-purple-cyan">{user?.firstName || 'Étudiant'}</span> !
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {isSubscribed
                  ? `Abonnement ${planLabel} actif · ${daysLeft !== null ? `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}` : ''}`
                  : 'Prêt à continuer ton apprentissage ?'}
              </p>
            </>
          )}
        </div>
        <Link href="/quiz" className="btn-primary px-4 py-2 text-sm items-center gap-2 hidden md:flex">
          <Zap className="w-4 h-4" />
          Démarrer
        </Link>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="neo-card p-5">
                <SkeletonBox className="w-10 h-10 mb-3" />
                <SkeletonBox className="h-7 w-12 mb-1.5" />
                <SkeletonBox className="h-3 w-24" />
              </div>
            ))
          : platformStats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="neo-card p-5">
                  <div className={`${s.color} w-10 h-10 mb-3`}>
                    <Icon className={`w-5 h-5 ${s.iconColor}`} />
                  </div>
                  <div className="text-2xl font-bold text-white mb-0.5">{s.value}</div>
                  <div className="text-xs text-slate-400">{s.label}</div>
                </div>
              );
            })
        }
      </div>

      {/* ── Streak + Niveau ────────────────────────────────────── */}
      {!loading && (user?.streak > 0 || user?.level > 1) && (
        <div className="grid grid-cols-2 gap-4">
          <div
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(251,146,60,0.15)' }}>
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{user?.streak || 0}</div>
              <div className="text-xs text-slate-400">jours consécutifs</div>
            </div>
          </div>
          <div
            className="rounded-2xl p-4 flex items-center gap-4"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(139,92,246,0.15)' }}>
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">Niv. {user?.level || 1}</div>
              <div className="text-xs text-slate-400">{user?.points || 0} points</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Subscription status ────────────────────────────────── */}
      {loading ? (
        <SkeletonBox className="h-24 w-full" />
      ) : isSubscribed ? (
        <div
          className="rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(6,182,212,0.06) 100%)',
            border: '1px solid rgba(16,185,129,0.3)',
          }}
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-emerald-500/5 blur-2xl pointer-events-none" />
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(16,185,129,0.15)' }}>
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-white">Abonnement {planLabel} actif</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>
                ACTIF
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {subscription?.endDate
                ? `Valide jusqu'au ${formatDate(subscription.endDate)} · ${daysLeft} jour${daysLeft !== 1 ? 's' : ''} restant${daysLeft !== 1 ? 's' : ''}`
                : 'Accès illimité'}
            </p>
          </div>
          <Link href="/subscribe" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 flex-shrink-0 transition-colors">
            Renouveler <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      ) : (
        /* CTA Abonnement */
        <div
          className="relative overflow-hidden rounded-2xl p-6 flex flex-col md:flex-row items-center gap-5"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(6,182,212,0.1) 100%)',
            border: '1px solid rgba(139,92,246,0.35)',
            boxShadow: '0 0 30px rgba(139,92,246,0.08)',
          }}
        >
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(139,92,246,0.2)', boxShadow: 'inset 0 0 0 1px rgba(139,92,246,0.4)' }}>
            <Lock className="w-7 h-7 text-purple-400" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-white mb-1">Accède à toutes les épreuves</h3>
            <p className="text-slate-400 text-sm">
              BAC, BEPC, CEP, Concours et universités du Burkina Faso —{' '}
              <span className="text-purple-300 font-medium">dès 1 000 FCFA/mois</span>
            </p>
            <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
              {['Toutes les matières', 'Toutes les universités', 'Annulation à tout moment'].map((f) => (
                <span key={f} className="text-[11px] px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.2)' }}>
                  ✓ {f}
                </span>
              ))}
            </div>
          </div>
          <Link href="/subscribe"
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white flex-shrink-0 transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', boxShadow: '0 0 20px rgba(139,92,246,0.35)' }}>
            <Zap className="w-4 h-4" />
            S'abonner maintenant
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* ── Quick actions ──────────────────────────────────────── */}
      <div className="neo-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-bold text-white">Actions rapides</h2>
          <div className="neo-divider flex-1 ml-2" />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {actions.map((a) => {
            const Icon = a.icon;
            const isPurple = a.color !== 'cyan';
            return (
              <Link key={a.href} href={a.href}
                className={`group p-5 rounded-xl border transition-all ${
                  isPurple
                    ? 'bg-purple-500/5 border-purple-500/15 hover:bg-purple-500/10 hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]'
                    : 'bg-cyan-500/5 border-cyan-500/15 hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                }`}
              >
                <div className={`${isPurple ? 'icon-box-purple' : 'icon-box-cyan'} w-9 h-9 mb-3`}>
                  <Icon className={`w-4 h-4 ${isPurple ? 'text-purple-400' : 'text-cyan-400'}`} />
                </div>
                <div className="font-semibold text-white text-sm mb-1">{a.title}</div>
                <div className="text-xs text-slate-400">{a.desc}</div>
                <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${isPurple ? 'text-purple-400' : 'text-cyan-400'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Accéder <ArrowRight className="w-3 h-3" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Dernières épreuves ajoutées ───────────────────────── */}
      {loading ? (
        <div className="neo-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <SkeletonBox className="h-5 w-48" />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl p-4 space-y-3"
                style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-start justify-between">
                  <SkeletonBox className="w-9 h-9" />
                  <SkeletonBox className="h-4 w-14" />
                </div>
                <SkeletonBox className="h-4 w-3/4" />
                <SkeletonBox className="h-3 w-1/2" />
                <SkeletonBox className="h-px w-full mt-2" />
                <SkeletonBox className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : recentExams.length > 0 && (
        <div className="neo-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Dernières épreuves ajoutées</h2>
            </div>
            <Link href="/exams" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              Voir tout <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {recentExams.map((exam) => {
              const col = TYPE_COLORS[exam.type] || '#7c3aed';
              return (
                <div key={exam.id} className="rounded-xl p-4 flex flex-col gap-3 group hover:scale-[1.02] transition-transform"
                  style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>

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

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t pt-3"
                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      {exam.duration > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{exam.duration} min
                        </span>
                      )}
                      {exam.faculty && (
                        <span className="truncate text-cyan-500 max-w-[80px]">{exam.faculty}</span>
                      )}
                    </div>
                    <Link
                      href="/exams"
                      onClick={(e) => { if (!hasAccess) e.preventDefault(); }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all opacity-0 group-hover:opacity-100"
                      style={{ background: `${col}20`, color: col, border: `1px solid ${col}30` }}
                    >
                      {!hasAccess && <Lock className="w-2.5 h-2.5" />}
                      Voir
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Conseil du jour ───────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 flex gap-4 items-start"
        style={{
          background: 'linear-gradient(135deg, rgba(234,179,8,0.06) 0%, rgba(251,146,60,0.04) 100%)',
          border: '1px solid rgba(234,179,8,0.2)',
        }}
      >
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'rgba(234,179,8,0.12)' }}>
          {todayTip.icon}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Conseil du jour</span>
          </div>
          <h3 className="text-sm font-bold text-white mb-1">{todayTip.title}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{todayTip.tip}</p>
        </div>
      </div>

    </div>
  );
}
