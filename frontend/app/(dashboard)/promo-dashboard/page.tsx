'use client';

import { useEffect, useState } from 'react';
import { promoApi } from '@/lib/api';
import { Copy, Check, TrendingUp, Users, RefreshCw, Wallet, Gift } from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  FIRST_TIME: '1ère fois',
  RENEWAL: 'Réabonnement',
};

const PLAN_LABELS: Record<string, string> = {
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  ANNUAL: 'Annuel',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PromoDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    promoApi.getMyDashboard()
      .then(setData)
      .catch((err) => {
        setError(err?.response?.data?.message || 'Erreur lors du chargement');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!data?.promoCode?.code) return;
    navigator.clipboard.writeText(data.promoCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Chargement du tableau de bord...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="neo-card p-12 text-center space-y-4">
        <div className="icon-box-purple w-16 h-16 mx-auto">
          <Gift className="w-8 h-8 text-purple-400/40" />
        </div>
        <h3 className="text-lg font-semibold text-white">Pas encore de code promo</h3>
        <p className="text-slate-400 text-sm max-w-sm mx-auto">
          Tu n'as pas encore de code promo. Contacte l'équipe Pédja pour en obtenir un et commencer à gagner des commissions.
        </p>
      </div>
    );
  }

  const { promoCode, stats, usages } = data;

  const statCards = [
    {
      icon: Wallet, label: 'Gains totaux', value: `${stats.totalEarnings.toLocaleString('fr-FR')} FCFA`,
      color: 'icon-box-purple', iconColor: 'text-purple-400',
    },
    {
      icon: Users, label: 'Abonnés uniques', value: stats.uniqueSubscribers,
      color: 'icon-box-cyan', iconColor: 'text-cyan-400',
    },
    {
      icon: TrendingUp, label: 'Premiers abonnements', value: stats.firstTimeCount,
      color: 'icon-box-purple', iconColor: 'text-emerald-400',
    },
    {
      icon: RefreshCw, label: 'Réabonnements', value: stats.renewalCount,
      color: 'icon-box-cyan', iconColor: 'text-violet-400',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-up pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-glow" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">Espace Promo</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Mon code promo</h1>
        <p className="text-slate-400 text-sm mt-1">Partage ton code et gagne des commissions</p>
      </div>

      {/* Code card */}
      <div
        className="rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(6,182,212,0.1) 100%)',
          border: '1px solid rgba(139,92,246,0.35)',
          boxShadow: '0 0 30px rgba(139,92,246,0.1)',
        }}
      >
        <div className="flex-1 text-center md:text-left">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Ton code promo</p>
          <div className="text-5xl font-black text-white tracking-widest mb-3">{promoCode.code}</div>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <span
              className="text-xs px-3 py-1 rounded-full font-medium"
              style={{
                background: promoCode.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                color: promoCode.isActive ? '#34d399' : '#f87171',
                border: `1px solid ${promoCode.isActive ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}`,
              }}
            >
              {promoCode.isActive ? '● Actif' : '● Désactivé'}
            </span>
            <span className="text-xs text-slate-500 px-3 py-1">Créé le {formatDate(promoCode.createdAt)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:scale-105"
            style={{
              background: copied ? 'rgba(16,185,129,0.3)' : 'linear-gradient(135deg, #7c3aed, #0891b2)',
              boxShadow: '0 0 15px rgba(139,92,246,0.3)',
            }}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copié !' : 'Copier le code'}
          </button>
          <p className="text-xs text-slate-500 text-center max-w-[180px]">
            Partage ce code pour que tes amis l'utilisent lors de leur abonnement
          </p>
        </div>
      </div>

      {/* Commission rules */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="neo-card p-5 flex items-start gap-4">
          <div className="icon-box-purple w-10 h-10 flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="font-semibold text-white mb-1">Premier abonnement</div>
            <div className="text-sm text-slate-400">
              Tu gagnes <span className="text-purple-300 font-bold">50%</span> du prix à chaque fois qu'un nouvel abonné utilise ton code.
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {[['Mensuel', '500 FCFA'], ['Trimestriel', '1 250 FCFA'], ['Annuel', '4 000 FCFA']].map(([plan, gain]) => (
                <span key={plan} className="neo-badge text-[10px]">{plan} → {gain}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="neo-card p-5 flex items-start gap-4">
          <div className="icon-box-cyan w-10 h-10 flex-shrink-0">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="font-semibold text-white mb-1">Réabonnements</div>
            <div className="text-sm text-slate-400">
              Tu gagnes <span className="text-cyan-300 font-bold">100 FCFA</span> à chaque fois qu'un de tes abonnés renouvelle son abonnement avec ton code.
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="neo-card p-5 text-center">
              <div className={`${s.color} w-10 h-10 mx-auto mb-3`}>
                <Icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
              <div className="stat-value mb-0.5">{s.value}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Usages table */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Historique des commissions</h2>
        {usages.length === 0 ? (
          <div className="neo-card p-10 text-center">
            <p className="text-slate-400 text-sm">Aucune utilisation pour l'instant. Partage ton code !</p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-xl"
            style={{
              background: '#1c2136',
              boxShadow: '-5px -5px 12px rgba(168,150,255,0.04), 5px 5px 15px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(139,92,246,0.08)',
            }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(139,92,246,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                  {['Date', 'Abonné', 'Type', 'Plan', 'Commission'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usages.map((u: any) => (
                  <tr
                    key={u.id}
                    style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}
                    className="hover:bg-purple-500/3 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-400 text-xs">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white font-medium">{u.subscriber.firstName} {u.subscriber.lastName}</div>
                      <div className="text-xs text-slate-500">{u.subscriber.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={
                          u.type === 'FIRST_TIME'
                            ? { background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }
                            : { background: 'rgba(6,182,212,0.12)', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.2)' }
                        }
                      >
                        {TYPE_LABELS[u.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-xs">
                      {PLAN_LABELS[u.transaction?.metadata?.plan] ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-400 font-bold text-sm">
                        +{u.commissionAmount.toLocaleString('fr-FR')} FCFA
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
