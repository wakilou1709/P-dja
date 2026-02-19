'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, subscriptionApi } from '@/lib/api';
import { Mail, Phone, Award, Calendar, Star, Flame, Trophy, Zap } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.getCurrentUser()
      .then(setUser)
      .catch(console.error)
      .finally(() => setLoading(false));

    subscriptionApi.getMySubscription()
      .then((res) => {
        setSubscription(res.subscription);
        setHasAccess(res.hasAccess);
      })
      .catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-slate-400 text-sm">Chargement du profil...</span>
        </div>
      </div>
    );
  }

  const statsItems = [
    { icon: Star,   value: user?.points || 0,         label: 'Points',       color: 'icon-box-purple', iconColor: 'text-yellow-400' },
    { icon: Zap,    value: `Niv. ${user?.level || 1}`,label: 'Niveau',       color: 'icon-box-cyan',   iconColor: 'text-cyan-400'   },
    { icon: Flame,  value: user?.streak || 0,          label: 'Jours consec.',color: 'icon-box-purple', iconColor: 'text-orange-400' },
    { icon: Trophy, value: 0,                          label: 'Badges',       color: 'icon-box-cyan',   iconColor: 'text-violet-400' },
  ];

  const infoItems = [
    { icon: Mail,     label: 'Email',        value: user?.email },
    ...(user?.phone ? [{ icon: Phone, label: 'Téléphone', value: user.phone }] : []),
    { icon: Calendar, label: 'Membre depuis', value: formatDate(user?.createdAt) },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-glow" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">Profil</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Mon Profil</h1>
        <p className="text-slate-400 text-sm mt-1">Gère tes informations personnelles</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Avatar + Info */}
        <div className="md:col-span-2 neo-card p-7">
          {/* Avatar row */}
          <div className="flex items-center gap-4 mb-7">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
                boxShadow: '0 0 25px rgba(139,92,246,0.3)',
              }}
            >
              {user?.firstName?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user?.firstName} {user?.lastName}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={user?.role === 'ADMIN' ? 'neo-badge' : 'neo-badge-cyan'}>
                  {user?.role || 'STUDENT'}
                </span>
                <span className="neo-badge-green neo-badge">Actif</span>
              </div>
            </div>
          </div>

          <div className="neo-divider mb-6" />

          <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-4">Informations personnelles</h3>
          <div className="space-y-4">
            {infoItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="icon-box-purple w-8 h-8 flex-shrink-0">
                    <Icon className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">{item.label}</div>
                    <div className="text-sm text-white font-medium">{item.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Subscription */}
        <div className="neo-card-glow p-6 flex flex-col">
          <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-5">Abonnement</h3>
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: hasAccess
                  ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(5,150,105,0.1))'
                  : 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.1))',
                boxShadow: hasAccess
                  ? 'inset 0 0 0 1px rgba(16,185,129,0.3), 0 0 20px rgba(16,185,129,0.1)'
                  : 'inset 0 0 0 1px rgba(139,92,246,0.3), 0 0 20px rgba(139,92,246,0.1)',
              }}
            >
              <Award className={`w-8 h-8 ${hasAccess ? 'text-emerald-400' : 'text-purple-400'}`} />
            </div>

            <div className="text-xl font-bold text-white mb-1">
              {subscription?.plan || 'FREE'}
            </div>

            {hasAccess ? (
              <>
                <span
                  className="neo-badge text-xs mb-2"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', borderColor: 'rgba(16,185,129,0.3)' }}
                >
                  Actif
                </span>
                {subscription?.endDate && (
                  <div className="text-xs text-slate-400">
                    Valide jusqu'au{' '}
                    <span className="text-white font-medium">
                      {new Date(subscription.endDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <span
                className="neo-badge text-xs mb-2"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', borderColor: 'rgba(239,68,68,0.25)' }}
              >
                Aucun abonnement
              </span>
            )}
          </div>

          <button
            onClick={() => router.push('/subscribe')}
            className="btn-primary w-full py-2.5 text-sm mt-4 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            {hasAccess ? 'Renouveler' : 'S\'abonner — 1 000 FCFA/mois'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsItems.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="neo-card p-5 text-center">
              <div className={`${s.color} w-10 h-10 mx-auto mb-3`}>
                <Icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
              <div className="stat-value">{s.value}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
