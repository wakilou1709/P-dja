'use client';

import { useEffect, useState } from 'react';
import { Users, BookOpen, DollarSign, TrendingUp, Activity, Zap } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { StatsCard } from '@/components/admin/StatsCard';
import { RevenueChart, UserGrowthChart } from '@/components/admin/Charts';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      adminApi.getDashboardStats(),
      adminApi.getRevenueChartData('30d'),
      adminApi.getUserGrowth('30d'),
    ])
      .then(([dashboardStats, revenueChart, userGrowth]) => {
        setStats(dashboardStats);
        setRevenueData(revenueChart);
        setUserGrowthData(userGrowth);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Chargement des données...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-glow" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Panneau d'administration</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Dashboard Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Vue d'ensemble de la plateforme Pédja</p>
        </div>
        <div className="neo-badge flex items-center gap-2 px-3 py-2">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          <span>Live</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Utilisateurs Totaux"
          value={stats?.users?.total || 0}
          icon={Users}
          description={`+${stats?.users?.newThisMonth || 0} ce mois`}
          trend={stats?.users?.growthRate ? { value: stats.users.growthRate, isPositive: stats.users.growthRate > 0 } : undefined}
        />
        <StatsCard
          title="Examens Disponibles"
          value={stats?.exams?.total || 0}
          icon={BookOpen}
          description="Total examens"
        />
        <StatsCard
          title="Revenue Mensuel"
          value={`${((stats?.revenue?.monthly || 0) / 100).toFixed(0)} FCFA`}
          icon={DollarSign}
          description="Ce mois"
        />
        <StatsCard
          title="Abonnements Actifs"
          value={stats?.subscriptions?.active || 0}
          icon={TrendingUp}
          description="Actifs"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RevenueChart
          data={revenueData}
          title="Revenue (30 derniers jours)"
          description="Évolution du chiffre d'affaires"
        />
        <UserGrowthChart
          data={userGrowthData}
          title="Croissance Utilisateurs"
          description="Nouveaux utilisateurs par jour"
        />
      </div>

      {/* Recent Activity */}
      <div className="neo-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="icon-box-purple w-8 h-8">
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="text-lg font-bold text-white">Activité Récente</h2>
          <div className="neo-divider flex-1 ml-1" />
        </div>

        <div className="space-y-3">
          {stats?.quizzes && (
            <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#151b30] border border-purple-500/8">
              <div>
                <div className="text-sm font-medium text-white">Quiz Complétés</div>
                <div className="text-xs text-slate-400 mt-0.5">Total : {stats.quizzes.total}</div>
              </div>
              <div className="stat-value text-2xl">{stats.quizzes.completed}</div>
            </div>
          )}
          <div className="text-center py-6 text-slate-500 text-sm">
            Plus de statistiques à venir...
          </div>
        </div>
      </div>
    </div>
  );
}
