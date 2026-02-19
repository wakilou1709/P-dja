'use client';

import { useEffect, useState } from 'react';
import { Activity, TrendingUp, Target, Award, Users, DollarSign } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { StatsCard } from '@/components/admin/StatsCard';
import { UserGrowthChart, PopularExamsChart } from '@/components/admin/Charts';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [popularExams, setPopularExams] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      adminApi.getDashboardStats(),
      adminApi.getUserGrowth('30d'),
      adminApi.getPopularExamsAnalytics(10),
    ])
      .then(([dashboardStats, userGrowth, examsData]) => {
        setStats(dashboardStats);
        setUserGrowthData(userGrowth);
        setPopularExams(
          examsData.map((exam: any) => ({
            title: exam.title.length > 20 ? exam.title.substring(0, 20) + '...' : exam.title,
            views: exam.views,
          }))
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Chargement des analytics...</span>
        </div>
      </div>
    );
  }

  const quizCompletionRate = stats?.quizzes?.total > 0
    ? ((stats.quizzes.completed / stats.quizzes.total) * 100).toFixed(1) : 0;

  const funnelSteps = [
    { label: 'Inscrits', value: stats?.users?.total || 0, pct: 100, color: 'from-purple-600 to-violet-700' },
    {
      label: 'Abonnés', value: stats?.subscriptions?.active || 0,
      pct: stats?.users?.total > 0 ? ((stats.subscriptions.active / stats.users.total) * 100) : 0,
      color: 'from-cyan-600 to-blue-700',
    },
    {
      label: 'Quiz Complétés', value: stats?.quizzes?.completed || 0,
      pct: stats?.users?.total > 0 ? ((stats.quizzes.completed / stats.users.total) * 100) : 0,
      color: 'from-emerald-600 to-green-700',
    },
  ];

  const engagementItems = [
    {
      icon: Users, label: 'Nouveaux Utilisateurs', value: stats?.users?.newThisMonth || 0,
      sub: `Sur ${stats?.users?.total || 0} total`, color: 'icon-box-purple', iconColor: 'text-purple-400',
    },
    {
      icon: DollarSign, label: 'Revenue Mensuel', value: `${((stats?.revenue?.monthly || 0) / 100).toFixed(0)} FCFA`,
      sub: `Total: ${((stats?.revenue?.total || 0) / 100).toFixed(0)} FCFA`, color: 'icon-box-cyan', iconColor: 'text-emerald-400',
    },
    {
      icon: Activity, label: 'Abonnements Actifs', value: stats?.subscriptions?.active || 0,
      sub: 'Utilisateurs abonnés', color: 'icon-box-cyan', iconColor: 'text-cyan-400',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse-glow" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">Administration</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">Statistiques avancées et métriques de performance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Taux de Croissance"
          value={`${stats?.users?.growthRate?.toFixed(1) || 0}%`}
          icon={TrendingUp}
          description="Croissance utilisateurs ce mois"
          trend={stats?.users?.growthRate ? { value: stats.users.growthRate, isPositive: stats.users.growthRate > 0 } : undefined}
        />
        <StatsCard title="Quiz Complétés" value={stats?.quizzes?.completed || 0} icon={Award} description={`Sur ${stats?.quizzes?.total || 0} total`} />
        <StatsCard title="Taux de Complétion" value={`${quizCompletionRate}%`} icon={Target} description="Quiz complétés / total" />
        <StatsCard title="Examens Disponibles" value={stats?.exams?.total || 0} icon={Activity} description="Total d'examens" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <UserGrowthChart data={userGrowthData} title="Croissance Utilisateurs" description="Nouveaux utilisateurs par jour (30 derniers jours)" />
        <PopularExamsChart data={popularExams} title="Top 10 Examens Populaires" description="Examens les plus consultés" />
      </div>

      {/* Engagement metrics */}
      <div className="neo-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-bold text-white">Métriques d'Engagement</h2>
          <div className="neo-divider flex-1 ml-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {engagementItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="neo-inset p-5 flex items-center gap-4">
                <div className={`${item.color} w-12 h-12 flex-shrink-0`}>
                  <Icon className={`w-6 h-6 ${item.iconColor}`} />
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">{item.label}</div>
                  <div className="text-2xl font-bold text-white">{item.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Funnel */}
      <div className="neo-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-bold text-white">Funnel de Conversion</h2>
          <div className="neo-divider flex-1 ml-2" />
        </div>
        <div className="space-y-3">
          {funnelSteps.map((step) => (
            <div key={step.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-slate-400">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{step.value}</span>
                  <span className="text-xs text-slate-500">({step.pct.toFixed(1)}%)</span>
                </div>
              </div>
              <div className="h-7 neo-inset rounded-lg overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${step.color} flex items-center justify-end pr-3 transition-all duration-700`}
                  style={{ width: `${Math.max(step.pct, 2)}%`, boxShadow: '0 0 10px rgba(139,92,246,0.3)' }}
                >
                  {step.pct > 15 && (
                    <span className="text-white text-xs font-semibold">{step.pct.toFixed(0)}%</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
