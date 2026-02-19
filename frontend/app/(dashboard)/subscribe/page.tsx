'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { subscriptionApi, promoApi } from '@/lib/api';
import { Check, ChevronRight, Loader2, AlertCircle, Tag, X } from 'lucide-react';

type Step = 'plan' | 'provider' | 'phone' | 'otp' | 'success';

const PLANS = [
  {
    id: 'MONTHLY',
    label: 'Mensuel',
    price: '1 000 FCFA',
    period: '/mois',
    badge: null,
    highlight: false,
  },
  {
    id: 'QUARTERLY',
    label: 'Trimestriel',
    price: '2 500 FCFA',
    period: '/3 mois',
    badge: '⭐ Populaire (-17%)',
    highlight: true,
  },
  {
    id: 'ANNUAL',
    label: 'Annuel',
    price: '8 000 FCFA',
    period: '/an',
    badge: '💎 Meilleur prix (-33%)',
    highlight: false,
  },
];

const PROVIDERS = [
  { id: 'ORANGE_MONEY', label: 'Orange Money', color: '#ff7900', emoji: '🟠' },
  { id: 'MOOV_MONEY',  label: 'Moov Money',   color: '#0057b8', emoji: '🔵' },
  { id: 'WAVE',        label: 'Wave',          color: '#1a9eff', emoji: '💙' },
];

const PROVIDER_MESSAGES: Record<string, string> = {
  ORANGE_MONEY: 'Vous avez reçu un SMS Orange Money avec le code à 6 chiffres',
  MOOV_MONEY:   'Vous avez reçu un SMS Moov Money avec le code à 6 chiffres',
  WAVE:          'Vous avez reçu une notification Wave avec le code à 6 chiffres',
};

function formatEndDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export default function SubscribePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('plan');
  const [selectedPlan, setSelectedPlan] = useState('MONTHLY');
  const [selectedProvider, setSelectedProvider] = useState('ORANGE_MONEY');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState<any>(null);
  // Promo code
  const [showPromoField, setShowPromoField] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [promoOwner, setPromoOwner] = useState('');

  const handleValidatePromo = async () => {
    if (!promoInput.trim()) return;
    setPromoStatus('checking');
    try {
      const res = await promoApi.validateCode(promoInput.trim().toUpperCase());
      if (res.valid) {
        setPromoStatus('valid');
        setPromoCode(promoInput.trim().toUpperCase());
        setPromoOwner(res.ownerName ?? '');
      } else {
        setPromoStatus('invalid');
        setPromoCode('');
      }
    } catch {
      setPromoStatus('invalid');
      setPromoCode('');
    }
  };

  const handleRemovePromo = () => {
    setPromoInput('');
    setPromoCode('');
    setPromoStatus('idle');
    setPromoOwner('');
    setShowPromoField(false);
  };

  const handleInitiatePayment = async () => {
    if (!phoneNumber.match(/^\d{8}$/)) {
      setError('Veuillez entrer un numéro à 8 chiffres (ex: 70000000)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await subscriptionApi.initiatePayment({
        plan: selectedPlan,
        provider: selectedProvider,
        phoneNumber,
        ...(promoCode ? { promoCode } : {}),
      });
      setTransactionId(res.transactionId);
      if (res.devOtp) setDevOtp(res.devOtp);
      setStep('otp');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      setError('Veuillez entrer le code à 6 chiffres');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await subscriptionApi.verifyOtp({ transactionId, otpCode });
      setSubscription(res.subscription);
      setStep('success');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Code incorrect ou expiré');
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => {
    const steps = ['plan', 'provider', 'phone', 'otp'];
    const currentIndex = steps.indexOf(step);
    return (
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < currentIndex
                  ? 'bg-emerald-500 text-white'
                  : i === currentIndex
                  ? 'bg-purple-500 text-white'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {i < currentIndex ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-8 ${i < currentIndex ? 'bg-emerald-500' : 'bg-slate-700'}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-glow" />
          <span className="text-xs text-slate-400 uppercase tracking-wider">Abonnement</span>
        </div>
        <h1 className="text-3xl font-bold text-white">S'abonner à Pédja</h1>
        <p className="text-slate-400 text-sm mt-1">Accède à toutes les épreuves du Burkina Faso</p>
      </div>

      {step !== 'success' && <StepIndicator />}

      {/* === STEP: PLAN === */}
      {step === 'plan' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Choisir un plan</h2>
          <div className="grid gap-4">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`neo-card p-5 text-left w-full transition-all ${
                  selectedPlan === plan.id
                    ? 'border-purple-500/60 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                    : 'hover:border-purple-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        selectedPlan === plan.id ? 'border-purple-400 bg-purple-500' : 'border-slate-600'
                      }`}
                    >
                      {selectedPlan === plan.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{plan.label}</div>
                      {plan.badge && (
                        <div className="text-xs text-purple-400 mt-0.5">{plan.badge}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">{plan.price}</div>
                    <div className="text-xs text-slate-400">{plan.period}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep('provider')}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            Continuer <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* === STEP: PROVIDER === */}
      {step === 'provider' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Choisir le moyen de paiement</h2>
          <div className="grid gap-3">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProvider(p.id)}
                className={`neo-card p-5 text-left w-full flex items-center gap-4 transition-all ${
                  selectedProvider === p.id
                    ? 'border-purple-500/60 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                    : 'hover:border-purple-500/30'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    selectedProvider === p.id ? 'border-purple-400 bg-purple-500' : 'border-slate-600'
                  }`}
                >
                  {selectedProvider === p.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="text-2xl">{p.emoji}</span>
                <span className="font-semibold text-white">{p.label}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('plan')} className="btn-ghost flex-1 py-3">
              Retour
            </button>
            <button
              onClick={() => setStep('phone')}
              className="btn-primary flex-1 py-3 flex items-center justify-center gap-2"
            >
              Continuer <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* === STEP: PHONE === */}
      {step === 'phone' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Votre numéro de téléphone</h2>
          <div className="neo-card p-5 space-y-4">
            <div className="text-sm text-slate-400">
              Un code de confirmation sera envoyé au numéro ci-dessous via{' '}
              <span className="text-white font-medium">
                {PROVIDERS.find(p => p.id === selectedProvider)?.label}
              </span>.
            </div>
            <div className="flex gap-2">
              <div className="neo-input px-3 py-3 text-sm text-slate-300 flex-shrink-0 flex items-center">
                +226
              </div>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={8}
                placeholder="70 00 00 00"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 8));
                  setError('');
                }}
                className="neo-input flex-1 px-4 py-3 text-sm"
              />
            </div>
            {/* Promo code section */}
            {!promoCode ? (
              <div>
                {!showPromoField ? (
                  <button
                    onClick={() => setShowPromoField(true)}
                    className="flex items-center gap-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    J'ai un code promo
                  </button>
                ) : (
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-400 uppercase tracking-wider">
                      <Tag className="w-3.5 h-3.5" /> Code promo (optionnel)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="EX: PEDJA2026"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase());
                          setPromoStatus('idle');
                        }}
                        className="neo-input flex-1 px-4 py-2.5 text-sm font-mono tracking-widest"
                        maxLength={12}
                      />
                      <button
                        onClick={handleValidatePromo}
                        disabled={promoStatus === 'checking' || !promoInput.trim()}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}
                      >
                        {promoStatus === 'checking' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Valider'}
                      </button>
                    </div>
                    {promoStatus === 'invalid' && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Code invalide ou désactivé
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}
              >
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-mono font-bold">{promoCode}</span>
                  {promoOwner && <span className="text-slate-400 text-xs">de {promoOwner}</span>}
                </div>
                <button onClick={handleRemovePromo} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('provider')} className="btn-ghost flex-1 py-3">
              Retour
            </button>
            <button
              onClick={handleInitiatePayment}
              disabled={loading || phoneNumber.length !== 8 || promoStatus === 'checking'}
              className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Recevoir le code
            </button>
          </div>
        </div>
      )}

      {/* === STEP: OTP === */}
      {step === 'otp' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Saisir le code de confirmation</h2>
          <div className="neo-card p-5 space-y-4">
            <div className="text-sm text-slate-400">
              {PROVIDER_MESSAGES[selectedProvider]}
            </div>

            {/* Dev OTP hint */}
            {devOtp && (
              <div
                className="px-4 py-3 rounded-xl text-sm font-mono"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}
              >
                Code de test : <strong>{devOtp}</strong>
              </div>
            )}

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="______"
              value={otpCode}
              onChange={(e) => {
                setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              className="neo-input w-full px-4 py-4 text-center text-3xl font-mono tracking-[0.5em]"
            />

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setStep('phone'); setDevOtp(null); setOtpCode(''); setError(''); }}
              className="btn-ghost flex-1 py-3"
            >
              Retour
            </button>
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otpCode.length !== 6}
              className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Valider le paiement
            </button>
          </div>
        </div>
      )}

      {/* === STEP: SUCCESS === */}
      {step === 'success' && (
        <div className="neo-card-glow p-8 text-center space-y-6">
          {/* Animated check */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2))',
              boxShadow: '0 0 30px rgba(16,185,129,0.3)',
              animation: 'pulse 2s infinite',
            }}
          >
            <Check className="w-10 h-10 text-emerald-400" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Abonnement activé !</h2>
            <p className="text-slate-400 text-sm">
              Félicitations, ton accès est maintenant débloqué.
            </p>
          </div>

          <div className="neo-inset p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Plan</span>
              <span className="neo-badge">
                {PLANS.find(p => p.id === subscription?.plan)?.label ?? subscription?.plan}
              </span>
            </div>
            {subscription?.endDate && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Valide jusqu'au</span>
                <span className="text-white font-medium">{formatEndDate(subscription.endDate)}</span>
              </div>
            )}
          </div>

          <button
            onClick={() => router.push('/exams')}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            Accéder aux épreuves <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
