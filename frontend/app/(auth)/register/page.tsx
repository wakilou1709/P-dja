'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { saveTokens } from '@/lib/auth';
import { ROUTES } from '@/lib/constants';
import { Mail, Lock, User, Phone, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '', password: '', firstName: '', lastName: '', phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authApi.register(formData);
      saveTokens(data.accessToken, data.refreshToken);
      router.push(ROUTES.DASHBOARD);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrong = formData.password.length >= 8 &&
    /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password);

  return (
    <div className="neo-card p-8 animate-fade-up">
      {/* Header */}
      <div className="mb-7">
        <div className="inline-flex items-center gap-2 neo-badge mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse-glow" />
          Nouveau compte
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">Inscription</h1>
        <p className="text-slate-400 text-sm">Rejoins des milliers d'étudiants</p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-xl flex items-center gap-3 bg-red-500/8 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Prénom</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="neo-input w-full pl-9 pr-3 py-2.5 text-sm"
                placeholder="Jean"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Nom</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="neo-input w-full pl-9 pr-3 py-2.5 text-sm"
                placeholder="Dupont"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="neo-input w-full pl-10 pr-4 py-2.5 text-sm"
              placeholder="ton@email.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
            Téléphone <span className="text-slate-500 lowercase normal-case">(optionnel)</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="neo-input w-full pl-10 pr-4 py-2.5 text-sm"
              placeholder="70123456 ou +22670123456"
              maxLength={12}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Format : 8 chiffres ou avec +226</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/60" />
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="neo-input w-full pl-10 pr-4 py-2.5 text-sm"
              placeholder="••••••••"
              required
            />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className={`h-0.5 flex-1 rounded-full transition-colors ${formData.password.length >= 1 ? 'bg-red-400' : 'bg-slate-700'}`} />
            <div className={`h-0.5 flex-1 rounded-full transition-colors ${formData.password.length >= 6 ? 'bg-yellow-400' : 'bg-slate-700'}`} />
            <div className={`h-0.5 flex-1 rounded-full transition-colors ${passwordStrong ? 'bg-emerald-400' : 'bg-slate-700'}`} />
            {passwordStrong && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Min. 8 caractères, une majuscule et un chiffre</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Création...
            </>
          ) : (
            <>
              Créer mon compte
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="neo-divider my-5" />

      <p className="text-center text-slate-400 text-sm">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
