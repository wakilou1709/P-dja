'use client';

import { useRouter } from 'next/navigation';
import { Lock, Zap, X } from 'lucide-react';
import { useState } from 'react';

export function SubscriptionBanner() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-3 rounded-xl mb-6"
      style={{
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(6,182,212,0.08) 100%)',
        border: '1px solid rgba(139,92,246,0.3)',
        boxShadow: '0 0 20px rgba(139,92,246,0.08)',
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(139,92,246,0.2)' }}
        >
          <Lock className="w-4 h-4 text-purple-400" />
        </div>
        <p className="text-sm text-slate-300 truncate">
          <span className="text-white font-semibold">Abonne-toi</span> pour accéder à toutes les épreuves —{' '}
          <span className="text-purple-300">dès 1 000 FCFA/mois</span>
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => router.push('/subscribe')}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #0891b2)',
            boxShadow: '0 0 12px rgba(139,92,246,0.35)',
          }}
        >
          <Zap className="w-3.5 h-3.5" />
          S'abonner
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
