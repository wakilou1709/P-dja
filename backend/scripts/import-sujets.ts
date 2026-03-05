#!/usr/bin/env ts-node
/**
 * import-sujets.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Détecte automatiquement les nouveaux PDFs dans le dossier Sujets/,
 * extrait leur contenu (pdftotext ou OCR), déduit les métadonnées
 * (type d'examen, matière, année, tour) et les insère en base de données.
 *
 * Usage:
 *   npx ts-node scripts/import-sujets.ts            # import réel
 *   npx ts-node scripts/import-sujets.ts --dry-run  # simulation sans écriture
 *   npx ts-node scripts/import-sujets.ts --reset    # vide le registre (re-traite tout)
 *   npx ts-node scripts/import-sujets.ts --status   # affiche l'état du registre
 *
 * Registre: Sujets/.registry.json
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { PrismaClient, DifficultyLevel } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

// ─── Configuration ────────────────────────────────────────────────────────────

const SUJETS_DIR = path.resolve(__dirname, '../../Sujets');
const REGISTRY_FILE = path.join(SUJETS_DIR, '.registry.json');
const PDF_EXTENSIONS = ['.pdf', '.PDF'];

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DRY_RUN = process.argv.includes('--dry-run');
const RESET = process.argv.includes('--reset');
const STATUS = process.argv.includes('--status');

// ─── Types ────────────────────────────────────────────────────────────────────

interface RegistryEntry {
  filePath: string;
  fileHash: string;
  processedAt: string;
  examIds: string[];
  skipped?: boolean;
  reason?: string;
}

interface Registry {
  version: number;
  entries: Record<string, RegistryEntry>; // keyed by filePath
}

interface ExamMeta {
  examType: 'BEPC' | 'BAC' | 'CEP' | 'BEP' | 'CAP' | 'CONCOURS';
  subject: string;
  year: number;
  tour?: string; // "1er" | "2ème" | null
  series?: string; // BAC series: A, C, D, ...
  title: string;
  description: string;
  duration: number;        // minutes
  difficulty: DifficultyLevel;
  tags: string[];
  rawText: string;
}

// ─── Registry helpers ─────────────────────────────────────────────────────────

function loadRegistry(): Registry {
  if (fs.existsSync(REGISTRY_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8'));
    } catch { /* ignore corrupted file */ }
  }
  return { version: 1, entries: {} };
}

function saveRegistry(registry: Registry): void {
  if (!DRY_RUN) {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf8');
  }
}

function fileHash(filePath: string): string {
  const stat = fs.statSync(filePath);
  return crypto
    .createHash('md5')
    .update(`${filePath}:${stat.size}:${stat.mtimeMs}`)
    .digest('hex');
}

// ─── PDF discovery ────────────────────────────────────────────────────────────

function findPdfs(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue; // skip hidden files / processed/
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'processed') {
      results.push(...findPdfs(fullPath));
    } else if (entry.isFile() && PDF_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Text extraction ──────────────────────────────────────────────────────────

function extractTextPdftotext(filePath: string): string {
  try {
    const text = execSync(`pdftotext -layout "${filePath}" -`, {
      timeout: 30000,
      maxBuffer: 20 * 1024 * 1024,
    }).toString();
    return text.trim();
  } catch { return ''; }
}

function extractTextOcr(filePath: string): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pedja-import-'));
  try {
    execSync(
      `pdftoppm -r 150 -jpeg "${filePath}" "${path.join(tmpDir, 'page')}"`,
      { timeout: 180000, maxBuffer: 500 * 1024 * 1024 },
    );

    const images = fs.readdirSync(tmpDir)
      .filter((f) => f.endsWith('.jpg'))
      .sort();

    const texts: string[] = [];
    for (const img of images) {
      const imgPath = path.join(tmpDir, img);
      let imgWidth = 0, imgHeight = 0;
      try {
        const dims = execSync(`identify -format "%wx%h" "${imgPath}"`, { timeout: 5000 })
          .toString().trim().split('x').map(Number);
        imgWidth = dims[0] || 0;
        imgHeight = dims[1] || 0;
      } catch { /* use full */ }

      const STRIP_HEIGHT = 1100;
      const strips: string[] = [];

      if (imgHeight > STRIP_HEIGHT * 1.5 && imgWidth > 0) {
        const n = Math.ceil(imgHeight / STRIP_HEIGHT);
        for (let i = 0; i < n; i++) {
          const stripPath = path.join(tmpDir, `${img}_s${i}.jpg`);
          try {
            execSync(
              `convert "${imgPath}" -crop ${imgWidth}x${STRIP_HEIGHT}+0+${i * STRIP_HEIGHT} +repage "${stripPath}"`,
              { timeout: 20000 },
            );
            strips.push(stripPath);
          } catch { /* skip */ }
        }
      } else {
        strips.push(imgPath);
      }

      for (const strip of strips) {
        const out = `${strip}_out`;
        try {
          execSync(`tesseract "${strip}" "${out}" -l fra+eng --psm 3`, {
            timeout: 90000,
            maxBuffer: 10 * 1024 * 1024,
          });
          const txt = fs.readFileSync(`${out}.txt`, 'utf8');
          if (txt.trim()) texts.push(txt);
        } catch { /* skip */ }
      }
    }
    return texts.join('\n');
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

function extractText(filePath: string): string {
  console.log(`    → pdftotext...`);
  const pdftext = extractTextPdftotext(filePath);
  if (pdftext.length > 100) return pdftext;

  console.log(`    → OCR (tesseract)...`);
  return extractTextOcr(filePath);
}

// ─── Metadata heuristics ──────────────────────────────────────────────────────

/** Map keywords → canonical subject name */
const SUBJECT_MAP: Array<[RegExp, string]> = [
  [/math[eé]matiques?|maths?\b/i, 'Mathématiques'],
  [/fran[cç]ais/i, 'Français'],
  // SVT avant Physique-Chimie pour éviter les faux positifs
  [/sciences\s+de\s+la\s+vie|s\.?v\.?t\.?|biologie\s+g[eé]ologie/i, 'Sciences de la Vie et de la Terre'],
  // "Physique-Chimie" uniquement avec le tiret ou mention explicite des deux
  [/physique[\s\-–]+chimie|[eé]preuve\s+de\s+physique.*chimie|chimie.*physique/i, 'Physique-Chimie'],
  [/[eé]preuve\s+de\s+physique(?!\s*[-–]?\s*chimie)|physique\s+g[eé]n[eé]rale/i, 'Physique'],
  [/[eé]preuve\s+de\s+chimie(?!\s*physique)/i, 'Chimie'],
  [/biologie/i, 'Biologie'],
  [/histoire[\s\-]g[eé]ographie|h\.?g\.?/i, 'Histoire-Géographie'],
  [/histoire\b(?!\s*g[eé]o)/i, 'Histoire'],
  [/g[eé]ographie\b/i, 'Géographie'],
  [/anglais|english/i, 'Anglais'],
  [/espagnol/i, 'Espagnol'],
  [/philosophie/i, 'Philosophie'],
  [/[eé]conomie|eco\b/i, 'Économie'],
  [/comptabilit[eé]/i, 'Comptabilité'],
  [/informatique/i, 'Informatique'],
  [/technologie/i, 'Technologie'],
  [/éducation\s+physique|eps\b|sport/i, 'EPS'],
  [/électricité/i, 'Électricité'],
  [/[eé]lectronique/i, 'Électronique'],
  [/m[eé]canique/i, 'Mécanique'],
];

function detectSubject(text: string, filename: string): string {
  // Cherche d'abord dans le nom de fichier, puis dans les 2000 premiers caractères du texte
  // On préfère chercher près d'un mot-clé "ÉPREUVE DE" pour plus de précision
  const epreuveMatch = text.match(/[eé]preuve\s+de\s+(.{3,60}?)(?:\n|coefficient|dur[eé]e)/i);
  if (epreuveMatch) {
    const epreuveText = epreuveMatch[1];
    for (const [re, name] of SUBJECT_MAP) {
      if (re.test(epreuveText)) return name;
    }
  }
  const combined = `${filename} ${text.slice(0, 2000)}`;
  for (const [re, name] of SUBJECT_MAP) {
    if (re.test(combined)) return name;
  }
  return 'Inconnu';
}

function detectExamType(text: string, filename: string): ExamMeta['examType'] {
  const combined = `${filename} ${text.slice(0, 500)}`;
  if (/\bBEPC\b/i.test(combined)) return 'BEPC';
  if (/\bBAC\b|\bbaccalaur[eé]at\b/i.test(combined)) return 'BAC';
  if (/\bCEP\b/i.test(combined)) return 'CEP';
  if (/\bBEP\b/i.test(combined)) return 'BEP';
  if (/\bCAP\b/i.test(combined)) return 'CAP';
  if (/concours/i.test(combined)) return 'CONCOURS';
  return 'BEPC'; // default for Burkina Faso context
}

function detectYear(text: string, filename: string): number | null {
  // Filename first: "BEPC 2025 Maths" → 2025
  const filenameMatch = filename.match(/20(\d{2})/);
  if (filenameMatch) return parseInt(`20${filenameMatch[1]}`);
  // Content: "SESSION DE 2019"
  const contentMatch = text.match(/SESSION\s+DE\s+(20\d{2})/i)
    || text.match(/\b(20\d{2})\b/);
  return contentMatch ? parseInt(contentMatch[1]) : null;
}

function detectTour(text: string, filename: string): string | null {
  const combined = `${filename} ${text.slice(0, 500)}`;
  if (/2[eè]me?\s*tour|second\s*tour|deuxi[eè]me\s*tour/i.test(combined)) return '2ème';
  if (/1[eè]re?\s*tour|premier\s*tour/i.test(combined)) return '1er';
  return null;
}

function detectSeries(text: string, filename: string): string | null {
  const combined = `${filename} ${text.slice(0, 500)}`;
  const m = combined.match(/s[eé]rie\s*([A-E])\b/i) || combined.match(/\bS[eé]r\.?\s*([A-E])\b/);
  return m ? m[1].toUpperCase() : null;
}

function detectDuration(text: string): number {
  const m = text.match(/[Dd]ur[eé]e\s*:?\s*(\d+)\s*h(?:eure)?s?\s*(\d+)?/)
    || text.match(/(\d+)\s*[Hh](?:eure)?s?\s*(?:(\d+)\s*mn?)?/);
  if (m) {
    const h = parseInt(m[1]) || 0;
    const min = parseInt(m[2] || '0');
    const total = h * 60 + min;
    if (total > 0 && total <= 480) return total;
  }
  return 120; // default 2h
}

function buildTags(examType: string, subject: string, year: number, tour?: string | null, series?: string | null): string[] {
  const tags = [examType, subject, String(year)];
  if (tour) tags.push(`${tour} tour`);
  if (series) tags.push(`Série ${series}`);
  if (['BEPC', 'CEP'].includes(examType)) tags.push('Collège');
  if (examType === 'BAC') tags.push('Lycée');
  if (examType === 'CEP') tags.push('Primaire');
  return tags;
}

// ─── Multi-exam splitter ──────────────────────────────────────────────────────

interface ExamChunk {
  year: number;
  tour: string | null;
  text: string;
}

/**
 * Détecte si le PDF contient plusieurs examens (recueil) et les découpe.
 * Retourne un tableau de chunks si plusieurs détectés, sinon tableau vide.
 *
 * Gère deux formats :
 *  1. Recueil par an+tour : "BEPC 2012 1er tour", "BEPC 2012 2nd tour"
 *  2. Recueil par année   : "SESSION DE 2015 ... ÉPREUVE DE ..." (SVT, etc.)
 */
function splitMultiExam(text: string): ExamChunk[] {
  // ── Format 1: "BEPC/BAC 2012 1er/2nd/2ème tour" ──────────────────────────
  const tourRegex =
    /^(?:BEPC|BAC|CEP|BEP|CAP)\s+(\d{4})\s*(1[eè]re?|2[eè]me?|2nd|second)?\s*tour/gim;

  const tourMatches: Array<{ index: number; year: number; tour: string | null }> = [];
  let m: RegExpExecArray | null;
  while ((m = tourRegex.exec(text)) !== null) {
    const tourRaw = (m[2] || '').toLowerCase();
    const tour = tourRaw.startsWith('1') ? '1er'
      : (tourRaw.startsWith('2') || tourRaw === 'second') ? '2ème'
      : null;
    tourMatches.push({ index: m.index, year: parseInt(m[1]), tour });
  }

  if (tourMatches.length >= 2) {
    return tourMatches.map((match, i) => ({
      year: match.year,
      tour: match.tour,
      text: text.slice(match.index, i + 1 < tourMatches.length ? tourMatches[i + 1].index : text.length).trim(),
    }));
  }

  // ── Format 2: "SESSION DE 2015" avec épreuve (SVT, HG, etc.) ────────────
  // Chaque examen commence par "SESSION DE XXXX" suivi de "ÉPREUVE DE"
  const sessionRegex = /SESSION\s+DE\s+(20\d{2})/gim;

  const sessionMatches: Array<{ index: number; year: number }> = [];
  // On garde uniquement la PREMIÈRE occurrence de chaque année
  // (les suivantes sont des en-têtes/pieds de page répétés)
  const seenYears = new Set<number>();
  while ((m = sessionRegex.exec(text)) !== null) {
    const year = parseInt(m[1]);
    if (!seenYears.has(year)) {
      seenYears.add(year);
      sessionMatches.push({ index: m.index, year });
    }
  }

  if (sessionMatches.length >= 2) {
    return sessionMatches.map((match, i) => ({
      year: match.year,
      tour: null,
      text: text.slice(match.index, i + 1 < sessionMatches.length ? sessionMatches[i + 1].index : text.length).trim(),
    }));
  }

  return []; // PDF à examen unique
}

// ─── Claude fallback for ambiguous files ─────────────────────────────────────

async function extractMetaWithClaude(
  rawText: string,
  filename: string,
): Promise<Partial<ExamMeta>> {
  const preview = rawText.slice(0, 2000);
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [
      {
        role: 'user',
        content: `Analyse cet en-tête de sujet d'examen burkinabè et retourne un JSON avec:
{ "examType": "BEPC|BAC|CEP|BEP|CAP|CONCOURS", "subject": "nom officiel de la matière en français", "year": 2024, "tour": "1er|2ème|null", "series": "A|B|C|D|null" }

Nom du fichier: ${filename}
Début du texte:
${preview}

Réponds UNIQUEMENT avec le JSON, sans explication.`,
      },
    ],
  });

  try {
    const text = (msg.content[0] as { text: string }).text.trim();
    const jsonStr = text.match(/\{[\s\S]*\}/)?.[0] ?? text;
    return JSON.parse(jsonStr);
  } catch {
    return {};
  }
}

// ─── Exam builder ─────────────────────────────────────────────────────────────

function buildExamMeta(
  rawText: string,
  filename: string,
  overrides: Partial<ExamMeta> = {},
): ExamMeta {
  const examType = overrides.examType ?? detectExamType(rawText, filename);
  const subject = overrides.subject ?? detectSubject(rawText, filename);
  const year = overrides.year ?? detectYear(rawText, filename) ?? new Date().getFullYear();
  const tour = overrides.tour !== undefined ? overrides.tour : detectTour(rawText, filename);
  const series = overrides.series !== undefined ? overrides.series : detectSeries(rawText, filename);
  const duration = detectDuration(rawText);

  const tourLabel = tour ? ` - ${tour} tour` : '';
  const seriesLabel = series ? ` Série ${series}` : '';
  const title = `${examType} ${subject}${seriesLabel} ${year}${tourLabel}`;

  const difficulty: DifficultyLevel =
    examType === 'CEP' ? DifficultyLevel.EASY
    : examType === 'BAC' ? DifficultyLevel.HARD
    : DifficultyLevel.MEDIUM;

  const description =
    `Épreuve de ${subject} du ${examType}, session ${year}${tourLabel}. ` +
    `Durée : ${Math.floor(duration / 60)}h${duration % 60 > 0 ? duration % 60 + 'mn' : ''}. ` +
    `Source : MESFPT Burkina Faso.`;

  return {
    examType,
    subject,
    year,
    tour: tour ?? undefined,
    series: series ?? undefined,
    title,
    description,
    duration,
    difficulty,
    tags: buildTags(examType, subject, year, tour, series),
    rawText,
    ...overrides,
  };
}

// ─── Content structurer (sections) ───────────────────────────────────────────

function structureContent(meta: ExamMeta): object {
  const lines = meta.rawText.split('\n');
  const sections: Array<{ id: string; title: string; text: string }> = [];
  let currentTitle = '';
  let currentLines: string[] = [];
  let sIdx = 0;

  const isSectionHeader = (line: string) =>
    /^(EXERCICE|PARTIE|PROBL[EÈ]ME|SECTION|CHIMIE|PHYSIQUE|PREMIÈRE PARTIE|DEUXIÈME PARTIE)\b/i.test(
      line.trim(),
    ) ||
    /^\s*(I{1,3}|IV|V|VI|VII|VIII|IX|X)\s*[\.\-–:]\s/i.test(line);

  const flush = () => {
    if (currentTitle || currentLines.length) {
      sections.push({
        id: `s${++sIdx}`,
        title: currentTitle || 'Contenu',
        text: currentLines.join('\n').trim(),
      });
      currentLines = [];
      currentTitle = '';
    }
  };

  for (const line of lines) {
    if (isSectionHeader(line)) {
      flush();
      currentTitle = line.trim();
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return {
    // fullContent = champ attendu par le frontend (StructuredExamView)
    fullContent: meta.rawText,
    rawText: meta.rawText,
    source: 'PDF_OFFICIEL_BURKINA_FASO',
    extractedAt: new Date().toISOString(),
    examType: meta.examType,
    subject: meta.subject,
    year: meta.year,
    tour: meta.tour ?? null,
    series: meta.series ?? null,
    sections: sections.length > 0
      ? sections.map((s) => ({ ...s, content: s.text })) // content = alias de text pour le frontend
      : [{ id: 's1', title: 'Contenu', content: meta.rawText, text: meta.rawText }],
  };
}

// ─── DB insertion ─────────────────────────────────────────────────────────────

// Map long subject names → canonical short forms used in DB
const SUBJECT_ALIASES: Record<string, string[]> = {
  'Sciences de la Vie et de la Terre': ['SVT', 'Sciences de la Vie et de la Terre', 'Biologie-Géologie'],
  'Physique-Chimie': ['Physique-Chimie', 'Sciences Physiques', 'Physique Chimie'],
  'Histoire-Géographie': ['Histoire-Géographie', 'Histoire Géographie', 'HG'],
};

async function insertExam(meta: ExamMeta): Promise<string | null> {
  // Deduplicate par titre exact
  const byTitle = await prisma.exam.findFirst({
    where: { title: meta.title, type: meta.examType, year: meta.year },
  });
  if (byTitle) return null;

  // Deduplicate par type + année + tour + même famille de matière
  const subjectVariants = SUBJECT_ALIASES[meta.subject] ?? [meta.subject];
  const bySubject = await prisma.exam.findFirst({
    where: {
      type: meta.examType,
      year: meta.year,
      subject: { in: subjectVariants },
      ...(meta.tour ? { title: { contains: meta.tour } } : {}),
    },
  });
  if (bySubject) return null;

  const content = structureContent(meta);
  const exam = await prisma.exam.create({
    data: {
      title: meta.title,
      type: meta.examType,
      year: meta.year,
      subject: meta.subject,
      description: meta.description,
      difficulty: meta.difficulty,
      duration: meta.duration,
      tags: meta.tags,
      university: 'NONE',
      faculty: null,
      series: meta.series ?? null,
      niveau: ['BEPC', 'BEP', 'CAP'].includes(meta.examType) ? 'Collège' : ['CEP'].includes(meta.examType) ? 'Primaire' : 'Lycée',
      isPublished: true,
      totalQuestions: 0,
      content: content as any,
    },
  });
  return exam.id;
}

// ─── Process a single PDF ─────────────────────────────────────────────────────

async function processPdf(
  filePath: string,
  registry: Registry,
): Promise<{ examIds: string[]; skipped: boolean; reason?: string }> {
  const relativePath = path.relative(SUJETS_DIR, filePath);
  const filename = path.basename(filePath);
  const hash = fileHash(filePath);

  // Check if already processed with same content
  const existing = registry.entries[relativePath];
  if (existing && existing.fileHash === hash) {
    return { examIds: existing.examIds, skipped: true, reason: 'déjà importé' };
  }

  // Extract text
  const rawText = extractText(filePath);
  if (!rawText || rawText.trim().length < 50) {
    return { examIds: [], skipped: true, reason: 'texte vide ou trop court après extraction' };
  }

  // Try to split into multiple exams (recueil)
  const chunks = splitMultiExam(rawText);
  const examIds: string[] = [];

  if (chunks.length > 0) {
    console.log(`    → Recueil détecté : ${chunks.length} examens`);

    // Detect shared metadata (subject, examType) from the full file
    const baseSubject = detectSubject(rawText, filename);
    const baseType = detectExamType(rawText, filename);

    for (const chunk of chunks) {
      const meta = buildExamMeta(chunk.text, filename, {
        examType: baseType,
        subject: baseSubject,
        year: chunk.year,
        tour: chunk.tour ?? undefined,
      });

      if (DRY_RUN) {
        console.log(`      [DRY-RUN] Créerait: ${meta.title}`);
        examIds.push(`dry-${meta.title}`);
      } else {
        const id = await insertExam(meta);
        if (id) {
          console.log(`      ✅ ${meta.title}`);
          examIds.push(id);
        } else {
          console.log(`      ⏭ Déjà présent: ${meta.title}`);
        }
      }
    }
  } else {
    // Single exam — heuristic detection
    let meta = buildExamMeta(rawText, filename);

    // If subject is unknown, ask Claude
    if (meta.subject === 'Inconnu' || meta.year === new Date().getFullYear()) {
      console.log(`    → Claude pour résoudre les métadonnées ambiguës...`);
      try {
        const claudeMeta = await extractMetaWithClaude(rawText, filename);
        meta = buildExamMeta(rawText, filename, {
          examType: claudeMeta.examType,
          subject: claudeMeta.subject,
          year: claudeMeta.year,
          tour: claudeMeta.tour,
          series: claudeMeta.series,
        });
      } catch (e) {
        console.warn(`    ⚠ Claude indisponible: ${(e as Error).message}`);
      }
    }

    if (DRY_RUN) {
      console.log(`      [DRY-RUN] Créerait: ${meta.title}`);
      examIds.push(`dry-${meta.title}`);
    } else {
      const id = await insertExam(meta);
      if (id) {
        console.log(`      ✅ ${meta.title}`);
        examIds.push(id);
      } else {
        console.log(`      ⏭ Déjà présent: ${meta.title}`);
      }
    }
  }

  return { examIds, skipped: false };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('📂 Pédja — Importation automatique des sujets');
  console.log(`   Dossier scanné : ${SUJETS_DIR}`);
  if (DRY_RUN) console.log('   ⚠️  Mode DRY-RUN — aucune écriture en base');
  console.log('');

  if (!fs.existsSync(SUJETS_DIR)) {
    console.error(`❌ Dossier introuvable : ${SUJETS_DIR}`);
    process.exit(1);
  }

  let registry = loadRegistry();

  // --reset: clear registry to re-process everything
  if (RESET) {
    console.log('🔄 Réinitialisation du registre...');
    registry = { version: 1, entries: {} };
    saveRegistry(registry);
    console.log('   Registre vidé. Tous les fichiers seront retraités.\n');
  }

  // --status: just show what's tracked
  if (STATUS) {
    const entries = Object.values(registry.entries);
    console.log(`📋 Registre : ${entries.length} fichier(s) traité(s)\n`);
    for (const e of entries) {
      const status = e.skipped ? `⏭ ignoré (${e.reason})` : `✅ ${e.examIds.length} examen(s)`;
      console.log(`  ${e.filePath} → ${status}`);
    }
    process.exit(0);
  }

  // Discover PDFs
  const pdfs = findPdfs(SUJETS_DIR);
  if (pdfs.length === 0) {
    console.log('ℹ️  Aucun PDF trouvé dans le dossier Sujets/');
    return;
  }

  console.log(`🔍 ${pdfs.length} PDF(s) trouvé(s)\n`);

  let totalNew = 0;
  let totalSkipped = 0;

  for (const pdfPath of pdfs) {
    const relativePath = path.relative(SUJETS_DIR, pdfPath);
    const hash = fileHash(pdfPath);
    const existing = registry.entries[relativePath];

    // Already processed with same content → skip
    if (existing && existing.fileHash === hash) {
      console.log(`⏭ ${relativePath} (déjà traité)`);
      totalSkipped++;
      continue;
    }

    console.log(`📄 ${relativePath}`);
    const result = await processPdf(pdfPath, registry);

    // Update registry
    if (!DRY_RUN) {
      registry.entries[relativePath] = {
        filePath: relativePath,
        fileHash: hash,
        processedAt: new Date().toISOString(),
        examIds: result.examIds,
        skipped: result.skipped,
        reason: result.reason,
      };
      saveRegistry(registry);
    }

    if (result.skipped) {
      console.log(`   ⏭ Ignoré: ${result.reason}`);
      totalSkipped++;
    } else {
      totalNew += result.examIds.length;
    }

    console.log('');
  }

  console.log('─'.repeat(60));
  console.log(`📊 Résumé:`);
  console.log(`   Nouveaux examens importés : ${totalNew}`);
  console.log(`   Fichiers ignorés          : ${totalSkipped}`);
  if (DRY_RUN) console.log('\n   ⚠️  Mode DRY-RUN — rien n\'a été écrit en base');
  console.log('');
}

main()
  .catch((e) => {
    console.error('\n❌ Erreur fatale:', e.message ?? e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
