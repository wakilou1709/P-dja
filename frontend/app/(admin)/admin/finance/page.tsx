'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, CreditCard, Users } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { StatsCard } from '@/components/admin/StatsCard';
import { RevenueChart } from '@/components/admin/Charts';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [subPage, setSubPage] = useState(1);
  const [subTotalPages, setSubTotalPages] = useState(1);
  const [txPage, setTxPage] = useState(1);
  const [txTotalPages, setTxTotalPages] = useState(1);

  const fetchFinanceData = async () => {
    try {
      const [financeStats, revenueChart] = await Promise.all([
        adminApi.getFinanceStats(),
        adminApi.getRevenueChart('30d'),
      ]);
      setStats(financeStats);
      setRevenueData(revenueChart);
    } catch (error) { console.error('Failed to fetch finance data:', error); }
    finally { setLoading(false); }
  };

  const fetchSubscriptions = async () => {
    try {
      const response = await adminApi.getSubscriptions({ page: subPage, limit: 10 });
      setSubscriptions(response.subscriptions);
      setSubTotalPages(response.totalPages);
    } catch (error) { console.error('Failed to fetch subscriptions:', error); }
  };

  const fetchTransactions = async () => {
    try {
      const response = await adminApi.getTransactions({ page: txPage, limit: 10 });
      setTransactions(response.transactions);
      setTxTotalPages(response.totalPages);
    } catch (error) { console.error('Failed to fetch transactions:', error); }
  };

  useEffect(() => { fetchFinanceData(); }, []);
  useEffect(() => { fetchSubscriptions(); }, [subPage]);
  useEffect(() => { fetchTransactions(); }, [txPage]);

  const subscriptionColumns: Column[] = [
    { key: 'user', label: 'Utilisateur', render: (user) => `${user.firstName} ${user.lastName}` },
    {
      key: 'plan', label: 'Plan',
      render: (value) => <span className="neo-badge">{value}</span>,
    },
    {
      key: 'status', label: 'Statut',
      render: (value) => (
        <span className={`neo-badge ${value === 'ACTIVE' ? 'neo-badge-green' : value === 'EXPIRED' ? 'neo-badge-red' : ''}`}>
          {value}
        </span>
      ),
    },
    { key: 'startDate', label: 'Date début', render: (v) => new Date(v).toLocaleDateString('fr-FR') },
    { key: 'endDate', label: 'Date fin', render: (v) => new Date(v).toLocaleDateString('fr-FR') },
    { key: 'price', label: 'Montant', render: (v) => `${v} FCFA` },
  ];

  const handleValidateTransaction = async (id: string) => {
    try {
      await adminApi.validateTransaction(id);
      fetchTransactions();
    } catch (error) {
      console.error('Failed to validate transaction:', error);
    }
  };

  const transactionColumns: Column[] = [
    { key: 'createdAt', label: 'Date', render: (v) => new Date(v).toLocaleDateString('fr-FR') },
    { key: 'subscription', label: 'Utilisateur', render: (s) => s?.user?.email || 'N/A' },
    { key: 'amount', label: 'Montant', render: (v) => `${v} FCFA` },
    {
      key: 'provider', label: 'Provider',
      render: (v) => <span className="neo-badge-cyan neo-badge">{v}</span>,
    },
    {
      key: 'status', label: 'Statut',
      render: (v) => (
        <span className={`neo-badge ${v === 'COMPLETED' ? 'neo-badge-green' : v === 'PENDING' ? '' : 'neo-badge-red'}`}>
          {v}
        </span>
      ),
    },
    { key: 'reference', label: 'Référence', render: (v) => <span className="text-xs text-slate-400 font-mono">{v}</span> },
    {
      key: 'id',
      label: 'Actions',
      render: (id, row) =>
        row?.status === 'PENDING' ? (
          <button
            onClick={() => handleValidateTransaction(id)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            ✓ Valider
          </button>
        ) : null,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse-glow" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">Administration</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Finance</h1>
        <p className="text-slate-400 text-sm mt-1">Abonnements, transactions et statistiques financières</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="MRR" value={`${((stats?.monthlyRevenue || 0) / 100).toFixed(0)} FCFA`} icon={TrendingUp} description="Revenue mensuel récurrent" />
        <StatsCard title="Total Abonnements" value={stats?.totalSubscriptions || 0} icon={Users} description={`${stats?.activeSubscriptions || 0} actifs`} />
        <StatsCard title="Revenue Total" value={`${((stats?.totalRevenue || 0) / 100).toFixed(0)} FCFA`} icon={DollarSign} description="Depuis le début" />
        <StatsCard title="Transactions" value={stats?.transactions?.successful || 0} icon={CreditCard} description={`${stats?.transactions?.pending || 0} en attente`} />
      </div>

      <RevenueChart data={revenueData} title="Revenue (30 derniers jours)" description="Évolution du chiffre d'affaires" />

      {/* Tables */}
      <Tabs defaultValue="subscriptions">
        <TabsList
          className="p-1 rounded-xl"
          style={{ background: '#1c2136', border: '1px solid rgba(139,92,246,0.15)' }}
        >
          <TabsTrigger
            value="subscriptions"
            className="rounded-lg text-slate-400 data-[state=active]:text-white data-[state=active]:bg-purple-600/30 data-[state=active]:shadow-glow-sm"
          >
            Abonnements
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="rounded-lg text-slate-400 data-[state=active]:text-white data-[state=active]:bg-purple-600/30 data-[state=active]:shadow-glow-sm"
          >
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-4">
          <DataTable data={subscriptions} columns={subscriptionColumns} page={subPage} totalPages={subTotalPages} onPageChange={setSubPage} />
        </TabsContent>

        <TabsContent value="transactions" className="mt-4">
          <DataTable data={transactions} columns={transactionColumns} page={txPage} totalPages={txTotalPages} onPageChange={setTxPage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
