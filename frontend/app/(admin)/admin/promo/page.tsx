'use client';

import { useEffect, useState, useRef } from 'react';
import { adminApi } from '@/lib/api';
import {
  Gift, Plus, ToggleLeft, ToggleRight, Copy, Check,
  Search, X, User, Loader2, ChevronDown,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
interface StudentOption { id: string; firstName: string; lastName: string; email: string; }

/* ─── StudentPicker ──────────────────────────────────────── */
function StudentPicker({
  value, onChange,
}: {
  value: StudentOption | null;
  onChange: (s: StudentOption | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await adminApi.getUsers({ search: query, limit: 8 });
        setResults(res.users ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (value) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
          {value.firstName[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{value.firstName} {value.lastName}</div>
          <div className="text-xs text-slate-400 truncate">{value.email}</div>
        </div>
        <button
          onClick={() => onChange(null)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Rechercher par nom ou email..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="neo-input w-full pl-10 pr-10 py-3 text-sm"
        />
        {loading
          ? <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />
          : <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        }
      </div>

      {open && query.trim() && (
        <div
          className="absolute top-full left-0 right-0 mt-1 z-50 overflow-hidden rounded-xl"
          style={{
            background: '#1c2136',
            border: '1px solid rgba(139,92,246,0.2)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          {results.length === 0 && !loading ? (
            <div className="px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
              <User className="w-4 h-4" /> Aucun étudiant trouvé
            </div>
          ) : (
            results.map((s) => (
              <button
                key={s.id}
                onClick={() => { onChange(s); setQuery(''); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-purple-500/10 transition-colors"
                style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                  {s.firstName[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">{s.firstName} {s.lastName}</div>
                  <div className="text-xs text-slate-500 truncate">{s.email}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function AdminPromoPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentOption | null>(null);
  const [customCode, setCustomCode] = useState('');
  const [formError, setFormError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchCodes = async () => {
    try {
      const data = await adminApi.getPromoCodes();
      setCodes(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleCreate = async () => {
    if (!selectedStudent) { setFormError('Veuillez sélectionner un étudiant'); return; }
    setFormError('');
    setCreating(true);
    try {
      await adminApi.createPromoCode({
        userId: selectedStudent.id,
        code: customCode.trim() || undefined,
      });
      setShowModal(false);
      setSelectedStudent(null);
      setCustomCode('');
      fetchCodes();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Erreur lors de la création');
    } finally { setCreating(false); }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
    setCustomCode('');
    setFormError('');
  };

  const handleToggle = async (id: string) => {
    try { await adminApi.togglePromoCode(id); fetchCodes(); }
    catch (e) { console.error(e); }
  };

  const handleCopy = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = codes.filter((c) =>
    c.code.includes(search.toUpperCase()) ||
    c.owner.email.toLowerCase().includes(search.toLowerCase()) ||
    `${c.owner.firstName} ${c.owner.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse-glow" />
            <span className="text-xs text-slate-400 uppercase tracking-wider">Administration</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Codes Promo</h1>
          <p className="text-slate-400 text-sm mt-1">Gérer les codes promo des ambassadeurs Pédja</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Attribuer un code
        </button>
      </div>

      {/* Commission rules */}
      <div className="grid md:grid-cols-2 gap-4">
        {[
          {
            color: 'purple', label: 'Premier abonnement',
            desc: <>L'ambassadeur gagne <strong className="text-purple-300">50%</strong> du prix à chaque nouvel abonné</>,
            examples: ['Mensuel → 500 FCFA', 'Trimestriel → 1 250 FCFA', 'Annuel → 4 000 FCFA'],
          },
          {
            color: 'cyan', label: 'Réabonnement',
            desc: <>L'ambassadeur gagne <strong className="text-cyan-300">100 FCFA fixe</strong> à chaque renouvellement avec son code</>,
            examples: [],
          },
        ].map((rule) => (
          <div
            key={rule.label}
            className="rounded-xl p-4 flex items-start gap-4"
            style={{
              background: rule.color === 'purple' ? 'rgba(139,92,246,0.1)' : 'rgba(6,182,212,0.08)',
              border: `1px solid ${rule.color === 'purple' ? 'rgba(139,92,246,0.2)' : 'rgba(6,182,212,0.2)'}`,
            }}
          >
            <div className={`icon-box-${rule.color} w-10 h-10 flex-shrink-0`}>
              <Gift className={`w-5 h-5 ${rule.color === 'purple' ? 'text-purple-400' : 'text-cyan-400'}`} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white mb-1">{rule.label}</div>
              <div className="text-xs text-slate-400">{rule.desc}</div>
              {rule.examples.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {rule.examples.map((e) => <span key={e} className="neo-badge text-[10px]">{e}</span>)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400/50" />
        <input
          type="text"
          placeholder="Rechercher code, nom, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="neo-input w-full pl-10 pr-4 py-2.5 text-sm"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="neo-card p-12 text-center space-y-3">
          <Gift className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">Aucun code promo trouvé</p>
        </div>
      ) : (
        <div
          className="overflow-x-auto rounded-xl"
          style={{
            background: '#1c2136',
            boxShadow: '-5px -5px 12px rgba(168,150,255,0.04), 5px 5px 15px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(139,92,246,0.08)',
          }}
        >
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(139,92,246,0.1)', background: 'rgba(0,0,0,0.2)' }}>
                {['Code', 'Ambassadeur', 'Gains totaux', 'Abonnés', '1ères fois', 'Renouv.', 'Statut', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: '1px solid rgba(139,92,246,0.06)' }}
                  className="hover:bg-purple-500/3 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white tracking-wider">{c.code}</span>
                      <button
                        onClick={() => handleCopy(c.id, c.code)}
                        className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-purple-400 transition-colors"
                      >
                        {copiedId === c.id
                          ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                          : <Copy className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-700 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white">
                        {c.owner.firstName[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-white font-medium truncate">{c.owner.firstName} {c.owner.lastName}</div>
                        <div className="text-xs text-slate-500 truncate">{c.owner.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-emerald-400 font-bold whitespace-nowrap">
                      {c.stats.totalEarnings.toLocaleString('fr-FR')} FCFA
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-300 text-center">{c.stats.uniqueSubscribers}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="neo-badge text-[10px]">{c.stats.firstTimeCount}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="neo-badge-cyan neo-badge text-[10px]">{c.stats.renewalCount}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap"
                      style={
                        c.isActive
                          ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                          : { background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }
                      }
                    >
                      {c.isActive ? '● Actif' : '● Désactivé'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(c.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-slate-400 hover:text-white whitespace-nowrap"
                      style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)' }}
                    >
                      {c.isActive
                        ? <><ToggleRight className="w-4 h-4 text-emerald-400" /> Désactiver</>
                        : <><ToggleLeft className="w-4 h-4" /> Activer</>
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Create Modal ──────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={handleCloseModal}
        >
          <div
            className="neo-card p-7 w-full max-w-md space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Attribuer un code promo</h3>
                <p className="text-xs text-slate-400 mt-0.5">Sélectionne l'étudiant ambassadeur</p>
              </div>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Student selector */}
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">
                  Étudiant *
                </label>
                <StudentPicker value={selectedStudent} onChange={(s) => { setSelectedStudent(s); setFormError(''); }} />
              </div>

              {/* Custom code */}
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">
                  Code personnalisé{' '}
                  <span className="normal-case text-slate-600">(optionnel — généré automatiquement si vide)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex : KONATÉ2026"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="neo-input w-full px-4 py-3 text-sm font-mono tracking-widest"
                  maxLength={12}
                />
                <p className="text-[11px] text-slate-600 mt-1">Majuscules et chiffres uniquement, 4-12 caractères</p>
              </div>

              {formError && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-400"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
                >
                  <X className="w-4 h-4 flex-shrink-0" /> {formError}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={handleCloseModal} className="btn-ghost flex-1 py-2.5 text-sm">
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !selectedStudent}
                className="btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {creating
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Gift className="w-4 h-4" />
                }
                Attribuer le code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
