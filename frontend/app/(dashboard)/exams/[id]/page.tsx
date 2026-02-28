'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import { examsApi, subscriptionApi } from '@/lib/api';
import { API_URL } from '@/lib/constants';
import { ArrowLeft, Clock, Star, Lock, Zap, FileText, BookOpenCheck, Maximize2, Minimize2 } from 'lucide-react';

// Gradient colors for sections (cycling)
const SECTION_GRADIENTS = [
  'from-purple-600/20 to-purple-700/10 border-purple-500/30',
  'from-cyan-600/20 to-cyan-700/10 border-cyan-500/30',
  'from-emerald-600/20 to-emerald-700/10 border-emerald-500/30',
  'from-orange-600/20 to-orange-700/10 border-orange-500/30',
];
const SECTION_TITLE_COLORS = ['text-purple-400', 'text-cyan-400', 'text-emerald-400', 'text-orange-400'];
const SECTION_BADGE_COLORS = [
  'bg-purple-600/30 text-purple-300',
  'bg-cyan-600/30 text-cyan-300',
  'bg-emerald-600/30 text-emerald-300',
  'bg-orange-600/30 text-orange-300',
];

interface SubQuestion {
  id: string;
  letter: string;
  text: string;
  points: number | null;
}

interface Question {
  id: string;
  number: string;
  text: string;
  points: number | null;
  subQuestions: SubQuestion[];
}

interface Section {
  id: string;
  title: string;
  points: number | null;
  preamble: string;
  content?: string;
  questions: Question[];
}

interface ExamContent {
  instructions: string[];
  totalPoints: number | null;
  duration: number | null;
  fullContent?: string;
  sections: Section[];
}

function PaywallOverlay({ onSubscribe }: { onSubscribe: () => void }) {
  return (
    <div
      className="absolute inset-0 flex items-end justify-center pb-16 z-20"
      style={{
        background: 'linear-gradient(to top, rgba(15,23,42,0.98) 40%, rgba(15,23,42,0.6) 70%, transparent 100%)',
      }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl p-6 text-center space-y-4"
        style={{
          background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(6,182,212,0.08) 100%)',
          border: '1px solid rgba(139,92,246,0.3)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: 'rgba(139,92,246,0.2)' }}
        >
          <Lock className="w-7 h-7 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Contenu réservé aux abonnés</h3>
          <p className="text-slate-400 text-sm mt-1">
            Accède à toutes les épreuves pour <strong className="text-white">1 000 FCFA / mois</strong>
          </p>
        </div>
        <div className="space-y-2 text-left">
          {['Toutes les matières', 'BAC, BEPC, CEP, Concours', 'Universités du Burkina Faso'].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
              <span className="text-emerald-400">✅</span> {item}
            </div>
          ))}
        </div>
        <button
          onClick={onSubscribe}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}
        >
          <Zap className="w-4 h-4" />
          S&apos;abonner maintenant
        </button>
      </div>
    </div>
  );
}

function StructuredExamView({ text, blurred }: { text: string; blurred: boolean }) {
  const lines = text.split('\n');

  // --- Locate structural boundaries ---
  const epreuveIdx = lines.findIndex(l => /^[EÉ]PREUVE\s+D['']/.test(l.trim()));
  const pagesIdx   = lines.findIndex(l => l.trim().startsWith('Cette épreuve comporte'));
  const footerIdx  = lines.findIndex(l => /MESFPT|DGECC/.test(l.trim()));

  // --- Parse header block ---
  let examTitle = '', country = 'BURKINA FASO', slogan = '', session = '', tour = '', serie = '';
  const headerEnd = epreuveIdx >= 0 ? epreuveIdx : 8;

  for (let i = 0; i < headerEnd; i++) {
    const raw = lines[i] || '';
    const t = raw.trim();
    if (!t || /^\.{3,}$/.test(t)) continue;

    const twoCol = raw.match(/^(\S.+?\S)\s{4,}(\S.*\S|\S)$/);

    if (/^EXAMEN\s+DU\s+BACCALAU/.test(t)) {
      examTitle = twoCol ? twoCol[1].trim() : t;
      if (twoCol) country = twoCol[2].trim();
    } else if (t === 'BURKINA FASO') {
      country = 'BURKINA FASO';
    } else if (t.startsWith('La Patrie')) {
      slogan = t;
    } else if (/^SESSION\s+(NORMALE|COMPL)/i.test(t)) {
      session = twoCol ? twoCol[1].trim() : t;
      if (twoCol) tour = tour || twoCol[2].trim();
    } else if (/^[12](er|ème|°)\s*tour/i.test(t)) {
      tour = t;
    } else if (/^SERIE\s*:/i.test(t)) {
      serie = t.replace(/^SERIE\s*:\s*/i, '').trim();
    } else if (/^\s{15,}/.test(raw)) {
      const val = t;
      if (val === 'BURKINA FASO') country = val;
      else if (val.startsWith('La Patrie')) slogan = val;
      else if (/^[12](er|ème|°)\s*tour/i.test(val)) tour = val;
    }
  }

  // --- Parse epreuve title + meta ---
  const epreuveLine = epreuveIdx >= 0 ? (lines[epreuveIdx]?.trim() || '') : '';
  let instruction = '', coefficient = '', duree = '', pagesText = '';
  const metaEnd = pagesIdx >= 0 ? pagesIdx + 1 : Math.min((epreuveIdx >= 0 ? epreuveIdx : 0) + 10, lines.length);
  for (let i = (epreuveIdx >= 0 ? epreuveIdx + 1 : 0); i < metaEnd; i++) {
    const l = lines[i]?.trim() || '';
    if (!l) continue;
    if (/^Les\s+calculatrices/i.test(l)) instruction = l;
    else if (/^Coefficient\s*:/i.test(l)) coefficient = l.replace(/^Coefficient\s*:\s*/i, '').trim();
    else if (/^Dur[eé]e\s*:/i.test(l)) duree = l.replace(/^Dur[eé]e\s*:\s*/i, '').trim();
    else if (l.startsWith('Cette épreuve')) pagesText = l;
  }

  // --- Parse body lines ---
  type BodyItem =
    | { t: 'section';    num: string; title: string }
    | { t: 'subsection'; num: string; title: string }
    | { t: 'bullet';  text: string }
    | { t: 'nb';      text: string }
    | { t: 'heading'; text: string }
    | { t: 'paragraph'; text: string };

  const bodyStart = pagesIdx >= 0 ? pagesIdx + 1 : (epreuveIdx >= 0 ? epreuveIdx + 6 : 0);
  const bodyEnd   = footerIdx >= 0 ? footerIdx : lines.length;
  const bodyItems: BodyItem[] = [];

  for (let i = bodyStart; i < bodyEnd; i++) {
    const raw = lines[i] || '';
    const t = raw.trim();
    if (!t) continue;

    if (t.startsWith('❖')) {
      bodyItems.push({ t: 'bullet', text: t.replace(/^❖\s*/, '') });
    } else if (/^NB\s*:/i.test(t)) {
      bodyItems.push({ t: 'nb', text: t.replace(/^NB\s*:\s*/i, '') });
    } else if (/^\d+[-–]\s+\S/.test(t)) {
      const m = t.match(/^(\d+[-–])\s+(.+)$/);
      bodyItems.push(m ? { t: 'section', num: m[1], title: m[2] } : { t: 'paragraph', text: t });
    } else if (/^\s{2,}\d+[-–]\d+/.test(raw) || /^\d+[-–]\d+[-–]/.test(t)) {
      const m = t.match(/^(\d+[-–]\d+[-–])\s*(.+)$/);
      bodyItems.push(m ? { t: 'subsection', num: m[1], title: m[2] } : { t: 'paragraph', text: t });
    } else if (t.length <= 60 && (t.endsWith(':') || /^(Considérations|Introduction|Conclusion|Remarques?)$/i.test(t))) {
      bodyItems.push({ t: 'heading', text: t });
    } else {
      bodyItems.push({ t: 'paragraph', text: t });
    }
  }

  const footerLines = footerIdx >= 0 ? lines.slice(footerIdx).filter(l => l.trim()) : [];

  // --- Render ---
  return (
    <div className={`space-y-4 ${blurred ? 'relative overflow-hidden' : ''}`}
      style={{ minHeight: blurred ? '700px' : 'auto' }}>
      <div className={blurred ? 'pointer-events-none select-none' : ''}>

        {/* ═══ HEADER CARD ═══ */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{
          background: 'linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(6,182,212,0.07) 100%)',
          border: '1px solid rgba(139,92,246,0.22)',
        }}>
          {/* Two-column header */}
          <div className="grid grid-cols-2 gap-4 px-6 pt-5 pb-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="space-y-1">
              {examTitle && (
                <p className="text-[11px] font-bold text-white/90 uppercase tracking-wide leading-snug">
                  {examTitle}
                </p>
              )}
              {session && (
                <p className="text-[10px] text-slate-400">{session}</p>
              )}
              {serie && (
                <span className="inline-block mt-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
                  SÉRIE {serie}
                </span>
              )}
            </div>
            <div className="text-right space-y-0.5">
              {country && (
                <p className="text-[11px] font-bold text-cyan-300/90 uppercase tracking-wide">{country}</p>
              )}
              {slogan && (
                <p className="text-[10px] text-slate-400 italic leading-snug">{slogan}</p>
              )}
              {tour && (
                <p className="text-[10px] text-purple-300 font-semibold pt-1">{tour}</p>
              )}
            </div>
          </div>

          {/* Exam title + instruction */}
          <div className="text-center px-6 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 className="text-sm font-black text-white uppercase tracking-widest"
              style={{ textDecoration: 'underline', textUnderlineOffset: '5px', textDecorationColor: 'rgba(139,92,246,0.5)' }}>
              {epreuveLine}
            </h2>
            {instruction && (
              <p className="text-[11px] text-slate-300 italic mt-2">{instruction}</p>
            )}
          </div>

          {/* Meta bar: Coefficient · Durée · Pages */}
          <div className="flex items-center justify-center gap-8 px-6 py-3 flex-wrap">
            {coefficient && (
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">Coefficient</p>
                <p className="text-xl font-black text-white">{coefficient}</p>
              </div>
            )}
            {duree && (
              <div className="w-px h-8 self-center" style={{ background: 'rgba(255,255,255,0.06)' }} />
            )}
            {duree && (
              <div className="text-center">
                <p className="text-[9px] uppercase tracking-widest text-slate-500 mb-0.5">Durée</p>
                <p className="text-xl font-black text-white">{duree}</p>
              </div>
            )}
            {pagesText && (
              <>
                <div className="w-px h-8 self-center" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <p className="text-[10px] text-slate-500 italic">{pagesText}</p>
              </>
            )}
          </div>
        </div>

        {/* ═══ BODY CARD ═══ */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-6 md:p-8 space-y-2">
            {bodyItems.map((item, idx) => {
              if (item.t === 'section') return (
                <div key={idx} className={idx > 0 ? 'pt-5' : ''}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-purple-300 flex-shrink-0"
                      style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
                      {item.num.replace('-', '')}
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wide">{item.title}</h3>
                  </div>
                  <div className="h-px" style={{ background: 'linear-gradient(to right, rgba(139,92,246,0.4), transparent)' }} />
                </div>
              );
              if (item.t === 'subsection') return (
                <div key={idx} className="flex items-baseline gap-2 pt-3 pl-2">
                  <span className="text-[10px] font-bold text-cyan-400 flex-shrink-0 px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
                    {item.num}
                  </span>
                  <h4 className="text-sm font-semibold text-cyan-200">{item.title}</h4>
                </div>
              );
              if (item.t === 'bullet') return (
                <div key={idx} className="flex items-start gap-2.5 pl-3">
                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.7)' }} />
                  <p className="text-sm text-slate-200 leading-relaxed">{item.text}</p>
                </div>
              );
              if (item.t === 'nb') return (
                <div key={idx} className="flex items-start gap-2.5 ml-3 rounded-lg px-3.5 py-2.5 mt-1"
                  style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)' }}>
                  <span className="text-[10px] font-black text-amber-400 flex-shrink-0 mt-0.5 tracking-wider">NB</span>
                  <p className="text-xs text-amber-200/75 leading-relaxed italic">{item.text}</p>
                </div>
              );
              if (item.t === 'heading') return (
                <p key={idx} className="text-sm font-bold text-slate-100 pt-3">{item.text}</p>
              );
              return (
                <p key={idx} className="text-sm text-slate-300 leading-relaxed pl-1">{item.text}</p>
              );
            })}
          </div>

          {/* Footer */}
          {footerLines.length > 0 && (
            <div className="px-6 py-2.5 flex justify-between items-center"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <span className="text-[10px] text-slate-600 font-mono">{footerLines[0]}</span>
              {footerLines[1] && (
                <span className="text-[10px] text-slate-600">Page {footerLines[1]}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Paywall gradient */}
      {blurred && (
        <div className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(15,23,42,1) 0%, transparent 100%)' }} />
      )}
    </div>
  );
}

function CorrectionView({ text, blurred }: { text: string; blurred: boolean }) {
  const lines = text.split('\n');

  type BodyItem =
    | { t: 'section'; text: string }
    | { t: 'subsection'; num: string; text: string }
    | { t: 'arrow'; text: string }
    | { t: 'paragraph'; text: string };

  const items: BodyItem[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^(PARTIE|EXERCICE|SECTION)\s+[IVX\d]/i.test(trimmed) || /^[IVX]+\s*[\.:-]/i.test(trimmed)) {
      items.push({ t: 'section', text: trimmed });
    } else if (/^(Question|q)\s*\d+/i.test(trimmed) || /^\d+[-\.\)]\s/.test(trimmed) || /^\d+-\d+/.test(trimmed)) {
      items.push({ t: 'subsection', num: '', text: trimmed });
    } else if (/^→/.test(trimmed) || /^Réponse\s*:/i.test(trimmed)) {
      items.push({ t: 'arrow', text: trimmed });
    } else {
      items.push({ t: 'paragraph', text: trimmed });
    }
  }

  return (
    <div className={`space-y-4 ${blurred ? 'relative overflow-hidden' : ''}`}
      style={{ minHeight: blurred ? '700px' : 'auto' }}>
      <div className={blurred ? 'pointer-events-none select-none' : ''}>

        {/* Header */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(6,182,212,0.07) 100%)',
          border: '1px solid rgba(16,185,129,0.22)',
        }}>
          <div className="text-center px-6 py-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-bold text-emerald-300"
              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
              ✨ CORRIGÉ OFFICIEL IA
            </div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">
              Correction détaillée
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="p-6 md:p-8 space-y-2">
            {items.map((item, idx) => {
              if (item.t === 'section') return (
                <div key={idx} className={idx > 0 ? 'pt-5' : ''}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="w-2 h-5 rounded flex-shrink-0" style={{ background: 'rgba(16,185,129,0.5)' }} />
                    <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wide">{item.text}</h3>
                  </div>
                  <div className="h-px" style={{ background: 'linear-gradient(to right, rgba(16,185,129,0.4), transparent)' }} />
                </div>
              );
              if (item.t === 'subsection') return (
                <div key={idx} className="pt-3 pl-2">
                  <p className="text-sm font-semibold text-emerald-200">{item.text}</p>
                </div>
              );
              if (item.t === 'arrow') return (
                <div key={idx} className="flex items-start gap-2.5 pl-3 rounded-lg px-3.5 py-2.5 mt-1"
                  style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
                  <p className="text-sm text-emerald-100 leading-relaxed">{item.text}</p>
                </div>
              );
              return (
                <p key={idx} className="text-sm text-slate-300 leading-relaxed pl-1">{item.text}</p>
              );
            })}
          </div>
        </div>
      </div>

      {blurred && (
        <div className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(15,23,42,1) 0%, transparent 100%)' }} />
      )}
    </div>
  );
}

function ExamDocument({ content, blurred }: { content: ExamContent; blurred: boolean }) {
  if (content.fullContent) {
    return <StructuredExamView text={content.fullContent} blurred={blurred} />;
  }

  return (
    <div className={`relative ${blurred ? 'overflow-hidden' : ''}`} style={{ minHeight: blurred ? '600px' : 'auto' }}>
      <div className={blurred ? 'pointer-events-none select-none' : ''}>
        {/* Instructions */}
        {content.instructions && content.instructions.length > 0 && (
          <div
            className="rounded-2xl p-5 mb-6"
            style={{
              background: 'rgba(139,92,246,0.06)',
              border: '1px solid rgba(139,92,246,0.15)',
            }}
          >
            <h2 className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded bg-purple-500 inline-block" />
              Consignes générales
            </h2>
            <ul className="space-y-1.5">
              {content.instructions.map((ins, i) => (
                <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sections */}
        {content.sections?.map((section, sIdx) => {
          const gradClass = SECTION_GRADIENTS[sIdx % SECTION_GRADIENTS.length];
          const titleColor = SECTION_TITLE_COLORS[sIdx % SECTION_TITLE_COLORS.length];
          const badgeColor = SECTION_BADGE_COLORS[sIdx % SECTION_BADGE_COLORS.length];
          return (
            <div
              key={section.id}
              className={`rounded-2xl mb-6 border bg-gradient-to-br ${gradClass}`}
            >
              {/* Section header */}
              <div className="px-6 py-4 flex items-center justify-between border-b border-current border-opacity-20" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold ${badgeColor} px-2.5 py-1 rounded-full`}>
                    {sIdx + 1}
                  </span>
                  <h2 className={`text-base font-bold ${titleColor} uppercase tracking-wide`}>
                    {section.title}
                  </h2>
                </div>
                {section.points != null && (
                  <div className="flex items-center gap-1.5">
                    <Star className={`w-3.5 h-3.5 ${titleColor}`} />
                    <span className={`text-sm font-bold ${titleColor}`}>{section.points} pts</span>
                  </div>
                )}
              </div>

              <div className="px-6 py-5">
                {/* Free-form content (OCR cleaned by Claude) */}
                {section.content ? (
                  <p
                    className="text-sm text-slate-200 leading-relaxed"
                    style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
                  >
                    {section.content}
                  </p>
                ) : (
                  <div className="space-y-5">
                    {/* Preamble */}
                    {section.preamble && (
                      <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-current pl-3"
                        style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                        {section.preamble}
                      </p>
                    )}

                    {/* Structured questions */}
                    {section.questions?.map((question) => (
                      <div key={question.id} className="space-y-2">
                        <div className="flex items-start gap-3">
                          <span
                            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white mt-0.5"
                            style={{ background: 'rgba(255,255,255,0.08)' }}
                          >
                            {question.number}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm text-white leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{question.text}</p>
                              {question.points != null && (
                                <span className="flex-shrink-0 text-xs text-slate-400 mt-0.5 whitespace-nowrap">
                                  {question.points} pt{question.points > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            {question.subQuestions && question.subQuestions.length > 0 && (
                              <div className="mt-3 space-y-2 pl-4 border-l border-white/10">
                                {question.subQuestions.map((sub) => (
                                  <div key={sub.id} className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-2">
                                      <span className="flex-shrink-0 text-xs font-bold text-slate-400 mt-0.5 w-4">
                                        {sub.letter}.
                                      </span>
                                      <p className="text-sm text-slate-300 leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{sub.text}</p>
                                    </div>
                                    {sub.points != null && (
                                      <span className="flex-shrink-0 text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                                        {sub.points} pt{sub.points > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Paywall blur gradient (only partial blur, not full overlay) */}
      {blurred && (
        <div
          className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(15,23,42,1) 0%, transparent 100%)' }}
        />
      )}
    </div>
  );
}

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'epreuve' | 'correction'>('epreuve');
  const scrollPositions = useRef<Record<string, number>>({ epreuve: 0, correction: 0 });

  // The scrolling container is <main class="overflow-auto"> in the dashboard layout
  const getScroller = () => document.querySelector('main') as HTMLElement | null;

  const switchTab = (tab: 'epreuve' | 'correction') => {
    const scroller = getScroller();
    scrollPositions.current[activeTab] = scroller?.scrollTop ?? 0;
    setActiveTab(tab);
    requestAnimationFrame(() => {
      const s = getScroller();
      if (s) s.scrollTop = scrollPositions.current[tab] ?? 0;
    });
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const aside = document.querySelector('aside') as HTMLElement | null;
    const main  = document.querySelector('main')  as HTMLElement | null;

    if (!document.fullscreenElement) {
      // Masquer la sidebar + étendre le main avant le fullscreen
      if (aside) aside.style.display = 'none';
      if (main)  { main.style.marginLeft = '0'; main.style.width = '100%'; }
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) {
        // Restaurer la sidebar quand on quitte le fullscreen (Échap compris)
        const aside = document.querySelector('aside') as HTMLElement | null;
        const main  = document.querySelector('main')  as HTMLElement | null;
        if (aside) aside.style.display = '';
        if (main)  { main.style.marginLeft = ''; main.style.width = ''; }
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      examsApi.getById(id),
      subscriptionApi.checkAccess().catch(() => ({ hasAccess: false })),
    ])
      .then(([examData, accessData]) => {
        setExam(examData);
        setHasAccess(accessData.hasAccess);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

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

  if (!exam) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Épreuve introuvable.</p>
        <button onClick={() => router.back()} className="mt-4 text-purple-400 hover:text-purple-300 text-sm">
          Retour
        </button>
      </div>
    );
  }

  const content: ExamContent | null = exam.content as ExamContent | null;
  const correction = exam.correction as { fullCorrection: string; generatedAt: string; model: string } | null;
  const showBlurred = !hasAccess;
  const hasCorrection = !!(correction?.fullCorrection);

  return (
    <div className="space-y-6 pb-12 animate-fade-up max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux épreuves
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.25)' }}
              >
                {exam.type}{exam.series ? ` · Série ${exam.series}` : ''}
              </span>
              {exam.year && (
                <span className="text-xs text-slate-400">{exam.year}</span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">{exam.subject}</h1>
            {exam.faculty && (
              <p className="text-sm text-cyan-400 mt-0.5">{exam.faculty}</p>
            )}
          </div>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Quitter le plein écran' : 'Lire en plein écran'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 flex-shrink-0"
            style={isFullscreen
              ? { background: '#1e293b', color: '#94a3b8', border: '1px solid #334155' }
              : { background: 'linear-gradient(135deg, #7c3aed, #0891b2)', color: '#fff', border: 'none', boxShadow: '0 0 18px rgba(124,58,237,0.45)' }
            }
          >
            {isFullscreen
              ? <><Minimize2 className="w-4 h-4" /> Réduire</>
              : <><Maximize2 className="w-4 h-4" /> Plein écran</>
            }
          </button>
        </div>

        {/* Meta info bar */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          {(exam.duration || content?.duration) && (
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{exam.duration || content?.duration} min</span>
            </div>
          )}
          {(content?.totalPoints != null) && (
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <Star className="w-3.5 h-3.5" />
              <span>{content.totalPoints} points</span>
            </div>
          )}
          {exam.niveau && (
            <span
              className="text-xs px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(6,182,212,0.1)', color: '#67e8f9', border: '1px solid rgba(6,182,212,0.2)' }}
            >
              {exam.niveau}
            </span>
          )}
        </div>
      </div>

      {/* Tabs — portal vers body pour échapper au transform de animate-fade-up */}
      {createPortal(
        <div style={{
          position: 'fixed', top: 0, right: 0, left: isFullscreen ? 0 : '256px', zIndex: 9999,
          padding: '8px 24px',
          background: 'rgba(10,15,30,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{ maxWidth: '48rem', margin: '0 auto', display: 'flex', gap: '4px', padding: '4px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => switchTab('epreuve')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
                ...(activeTab === 'epreuve'
                  ? { background: 'rgba(139,92,246,0.2)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.35)' }
                  : { background: 'transparent', color: '#64748b', border: '1px solid transparent' }),
              }}
            >
              <FileText style={{ width: 14, height: 14 }} />
              Épreuve
            </button>
            <button
              onClick={() => switchTab('correction')}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '10px', borderRadius: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                transition: 'all 0.15s',
                ...(activeTab === 'correction'
                  ? { background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.35)' }
                  : { background: 'transparent', color: hasCorrection ? '#94a3b8' : '#475569', border: '1px solid transparent' }),
              }}
            >
              <BookOpenCheck style={{ width: 14, height: 14 }} />
              Corrigé
              {hasCorrection && activeTab !== 'correction' && (
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
              )}
            </button>
          </div>
        </div>,
        document.body
      )}
      {/* Spacer pour compenser la hauteur de la barre fixe */}
      <div style={{ height: '64px' }} />

      {/* Tab content */}
      {activeTab === 'epreuve' && (
        content && (content.fullContent || (content.sections && content.sections.length > 0)) ? (
          <div className="relative">
            <ExamDocument content={content} blurred={showBlurred ?? false} />
            {showBlurred && <PaywallOverlay onSubscribe={() => router.push('/subscribe')} />}
          </div>
        ) : (
          <div className="rounded-2xl p-8 text-center space-y-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <FileText className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-slate-400 text-sm">
              {showBlurred
                ? 'Abonnez-vous pour accéder au contenu de cette épreuve.'
                : "Le contenu structuré n'est pas encore disponible pour cette épreuve."}
            </p>
            {exam.pdfUrl && !showBlurred && (
              <a href={`${API_URL}${exam.pdfUrl}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
                <FileText className="w-4 h-4" />
                Voir le PDF de l&apos;épreuve
              </a>
            )}
            {showBlurred && (
              <button onClick={() => router.push('/subscribe')}
                className="mt-4 flex items-center gap-2 mx-auto px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #0891b2)' }}>
                <Zap className="w-4 h-4" />
                S&apos;abonner — 1 000 FCFA/mois
              </button>
            )}
          </div>
        )
      )}

      {activeTab === 'correction' && (
        hasCorrection ? (
          <div className="relative">
            <CorrectionView text={correction!.fullCorrection} blurred={showBlurred ?? false} />
            {showBlurred && <PaywallOverlay onSubscribe={() => router.push('/subscribe')} />}
          </div>
        ) : (
          <div className="rounded-2xl p-10 text-center space-y-3"
            style={{ background: 'rgba(16,185,129,0.03)', border: '1px solid rgba(16,185,129,0.1)' }}>
            <BookOpenCheck className="w-10 h-10 mx-auto" style={{ color: 'rgba(110,231,183,0.25)' }} />
            <p className="text-slate-400 text-sm">La correction de cette épreuve n&apos;est pas encore disponible.</p>
          </div>
        )
      )}
    </div>
  );
}
