import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import Anthropic from '@anthropic-ai/sdk';

/** Compute a stable deduplication hash from raw OCR text */
function computeContentHash(rawText: string): string {
  if (!rawText || rawText.trim().length < 30) return '';
  // Normalize: lowercase, keep only alphanum, take first 600 chars
  const normalized = rawText.toLowerCase().replace(/[^a-z0-9àâäéèêëîïôùûüç]/g, '').slice(0, 600);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse/lib/pdf-parse');

async function extractTextWithOcr(filePath: string): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pedja-ocr-'));
  try {
    // Convert all PDF pages to JPEG at 200 DPI — good balance quality/speed
    // 200 DPI gives ~1654×2338px for standard A4 pages
    execSync(
      `pdftoppm -r 200 -jpeg "${filePath}" "${path.join(tmpDir, 'page')}"`,
      { timeout: 120000, maxBuffer: 300 * 1024 * 1024 },
    );

    const images = fs.readdirSync(tmpDir)
      .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'))
      .sort();

    if (images.length === 0) return '';

    const texts: string[] = [];
    for (const img of images) {
      const imgPath = path.join(tmpDir, img);

      // Preprocess image for better OCR: deskew + binarize + sharpen
      // This helps with slightly tilted scans and low-contrast PDFs
      const preprocessedPath = path.join(tmpDir, `${img}_pre.jpg`);
      let imageToProcess = imgPath;
      try {
        execSync(
          `convert "${imgPath}" -deskew 40% -threshold 55% -sharpen 0x1 -compress jpeg -quality 95 "${preprocessedPath}"`,
          { timeout: 15000 },
        );
        imageToProcess = preprocessedPath;
      } catch { /* use original if preprocessing fails */ }

      // Get image dimensions
      let imgWidth = 0;
      let imgHeight = 0;
      try {
        const dims = execSync(`identify -format "%wx%h" "${imageToProcess}"`, { timeout: 5000 })
          .toString().trim();
        const parts = dims.split('x').map(Number);
        imgWidth = parts[0] || 0;
        imgHeight = parts[1] || 0;
      } catch { /* use full image */ }

      // Tall images (> 1500px) must be tiled before OCR with 100px overlap
      // to avoid cutting questions at strip boundaries
      const STRIP_HEIGHT = 1400; // px — ~1 A4 page at 200 DPI
      const OVERLAP = 100;       // px — overlap between strips to avoid boundary cuts
      const stripImages: string[] = [];

      if (imgHeight > STRIP_HEIGHT * 1.5 && imgWidth > 0) {
        const nStrips = Math.ceil(imgHeight / STRIP_HEIGHT);
        for (let i = 0; i < nStrips; i++) {
          const y = Math.max(0, i * STRIP_HEIGHT - (i > 0 ? OVERLAP : 0));
          const height = Math.min(STRIP_HEIGHT + OVERLAP, imgHeight - y);
          const stripPath = path.join(tmpDir, `${img}_strip${i}.jpg`);
          try {
            execSync(
              `convert "${imageToProcess}" -crop ${imgWidth}x${height}+0+${y} +repage "${stripPath}"`,
              { timeout: 20000 },
            );
            stripImages.push(stripPath);
          } catch { /* skip strip */ }
        }
      } else {
        stripImages.push(imageToProcess);
      }

      // OCR each image/strip
      // --psm 6 = uniform block of text (better for exam papers than auto --psm 3)
      // --dpi tells tesseract the actual DPI to avoid scaling issues
      for (const imgToOcr of stripImages) {
        const outBase = `${imgToOcr}_out`;
        try {
          execSync(
            `tesseract "${imgToOcr}" "${outBase}" -l fra+eng --psm 6 --dpi 200`,
            { timeout: 90000, maxBuffer: 10 * 1024 * 1024 },
          );
          const txt = fs.readFileSync(`${outBase}.txt`, 'utf8');
          if (txt.trim()) texts.push(txt);
        } catch { /* skip */ }
      }
    }

    return texts.join('\n');
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/**
 * Utilise Claude Vision pour extraire le texte ET décrire les schémas/figures.
 * Traite chaque page individuellement. Fallback tesseract si page trop lourde ou erreur API.
 */
async function extractTextWithClaudeVision(filePath: string, apiKey: string): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pedja-vision-'));
  try {
    execSync(
      `pdftoppm -r 200 -jpeg "${filePath}" "${path.join(tmpDir, 'page')}"`,
      { timeout: 120000, maxBuffer: 300 * 1024 * 1024 },
    );

    const images = fs.readdirSync(tmpDir)
      .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'))
      .sort();

    if (images.length === 0) return '';

    const anthropic = new Anthropic({ apiKey });
    const pageTexts: string[] = [];

    const VISION_PROMPT = `Transcris TOUT le contenu de cette page d'épreuve d'examen officiel d'Afrique de l'Ouest avec une précision maximale.

RÈGLES STRICTES :
1. TEXTE : reproduis mot pour mot, conserve la numérotation exacte (1-, 1-1-, a), b)...) et la ponctuation
2. VALEURS NUMÉRIQUES : conserve exactement (R = 2,5 Ω ; m = 150 g ; t = 3 h 30 min ; V = 12 V)
3. TABLEAUX : reproduis toutes les cellules avec | comme séparateur de colonnes
4. SCHÉMAS, FIGURES, GRAPHIQUES, CIRCUITS — décris entre balises [FIGURE] ... [/FIGURE] avec le maximum de détails :
   - Géométrie : tous les points nommés (A, B, C…), angles (∠ABC = 60°), longueurs, formes (cercle, triangle, carré…)
   - Circuits électriques : liste chaque composant et sa valeur (résistance R₁=100Ω, pile E=6V, condensateur C=10µF, interrupteur K, diode, bobine L=0,5H), topologie (série / parallèle / mixte), nœuds et branches
   - Graphes/courbes : titre du graphe, grandeur et unité de chaque axe, valeurs remarquables (origine, max, min, asymptotes, intersections), allure générale (linéaire / exponentielle / sinusoïdale…)
   - Biologie : organes ou structures identifiés et leurs légendes numérotées, flèches et ce qu'elles indiquent, coupes (sagittale / transversale), échelle si présente
   - Technique (BAC F3/G1/G2) : vues (de face / de profil / de dessus), cotes et tolérances, désignation des pièces, matériaux, nomenclature
   - Carte / plan : légende, orientation (rose des vents), échelle, éléments remarquables
5. Sauts de ligne : utilise \\n pour les fins de ligne et \\n\\n pour les paragraphes
6. Ignore les artefacts de scan (taches, lignes parasites, bords de page)

Génère uniquement la transcription, sans commentaire introductif.`;

    for (let i = 0; i < images.length; i++) {
      const imgPath = path.join(tmpDir, images[i]);

      // Resize to max 1600px wide to stay within API image size limits
      const resizedPath = path.join(tmpDir, `r_${images[i]}`);
      let useImgPath = imgPath;
      try {
        execSync(`convert "${imgPath}" -resize '1600x>' -quality 88 "${resizedPath}"`, { timeout: 10000 });
        useImgPath = resizedPath;
      } catch { /* use original */ }

      // If image still too large (> 4.5 MB), fall back to tesseract for this page
      const fileSize = fs.statSync(useImgPath).size;
      if (fileSize > 4.5 * 1024 * 1024) {
        try {
          const outBase = `${imgPath}_out`;
          execSync(`tesseract "${imgPath}" "${outBase}" -l fra+eng --psm 6 --dpi 200`,
            { timeout: 90000, maxBuffer: 10 * 1024 * 1024 });
          const txt = fs.readFileSync(`${outBase}.txt`, 'utf8');
          if (txt.trim()) pageTexts.push(txt);
        } catch { /* skip page */ }
        continue;
      }

      const imageData = fs.readFileSync(useImgPath).toString('base64');
      try {
        const msg = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData } },
              { type: 'text', text: VISION_PROMPT },
            ],
          }],
        }, { timeout: 60000 });
        const text = ((msg.content[0] as any).text as string).trim();
        if (text) pageTexts.push(text);
      } catch {
        // Vision API failed for this page — fall back to tesseract
        try {
          const outBase = `${imgPath}_out`;
          execSync(`tesseract "${imgPath}" "${outBase}" -l fra+eng --psm 6 --dpi 200`,
            { timeout: 90000, maxBuffer: 10 * 1024 * 1024 });
          const txt = fs.readFileSync(`${outBase}.txt`, 'utf8');
          if (txt.trim()) pageTexts.push(txt);
        } catch { /* skip */ }
      }
    }

    return pageTexts.join('\n\n');
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

async function extractTextFromPdf(filePath: string): Promise<string> {
  // 1. Try pdftotext (poppler) — fastest, for text-based PDFs
  try {
    const text = execSync(`pdftotext -layout "${filePath}" -`, {
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024,
    }).toString();
    if (text && text.trim().length > 50) return text;
  } catch { /* fallback */ }

  // 2. Try pdf-parse
  try {
    const pdfData = await pdfParse(fs.readFileSync(filePath));
    if (pdfData.text && pdfData.text.trim().length > 50) return pdfData.text;
  } catch { /* fallback */ }

  // 3. Claude Vision — preferred for scanned PDFs: reads text AND describes diagrams/figures
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const text = await extractTextWithClaudeVision(filePath, apiKey);
      if (text && text.trim().length > 50) return text;
    } catch { /* fallback to tesseract */ }
  }

  // 4. Tesseract OCR (final fallback — text only, no diagram support)
  try {
    const text = await extractTextWithOcr(filePath);
    if (text && text.trim().length > 50) return text;
  } catch { /* fallback */ }

  return '';
}

// ── Heuristic PDF structurer ──────────────────────────────────────────────────
// Parses the raw text of African exam papers (BAC, BEPC, CEP, university)
// without any AI API call — free and instant.

function parseDuration(text: string): number | null {
  const m = text.match(/dur[eé]e\s*:?\s*(\d+)\s*h(?:eure)?s?\s*(\d+)?/i)
           || text.match(/(\d+)\s*h(?:eure)?s?\s*(\d+)?\s*min/i)
           || text.match(/(\d+)\s*minutes/i);
  if (!m) return null;
  const h = parseInt(m[1]) || 0;
  const min = parseInt(m[2]) || 0;
  // If only minutes pattern matched
  if (text.match(/(\d+)\s*minutes/i) && !text.match(/dur[eé]e.*\d+\s*h/i)) return h;
  return h * 60 + min;
}

function parseTotalPoints(text: string): number | null {
  const m = text.match(/(?:not[eé]e?|barème|total)\s*:?\s*(?:sur\s*)?(\d+)\s*points?/i)
           || text.match(/\/\s*(\d+)\s*points?/i);
  return m ? parseInt(m[1]) : null;
}

function parseInstructions(text: string): string[] {
  const instructions: string[] = [];
  const lines = text.split('\n');
  let inInstructions = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/consignes?|instructions?|recommandations?/i.test(trimmed)) {
      inInstructions = true;
      continue;
    }
    // Stop at first section header
    if (inInstructions && /^(exercice|partie|problème|question|chapitre)\s+[IVX\d]/i.test(trimmed)) break;
    if (inInstructions && trimmed.length > 10) instructions.push(trimmed);
  }

  // Fallback: find lines about documents/calculators
  if (instructions.length === 0) {
    for (const line of lines) {
      const t = line.trim();
      if (/document|calculat|interdit|autoris|durée|noter|répondre/i.test(t) && t.length > 15 && t.length < 200) {
        instructions.push(t);
      }
    }
  }
  return [...new Set(instructions)].slice(0, 8);
}

function parseSections(text: string): any[] {
  const buildSection = (part: string, i: number, titleOverride?: string) => {
    const lines = part.trim().split('\n');
    const titleLine = lines[0].trim();
    const ptMatch = titleLine.match(/(\d+(?:[.,]\d+)?)\s*(?:points?|pts?)/i);
    const points = ptMatch ? parseFloat(ptMatch[1].replace(',', '.')) : null;
    const sectionId = `s${i + 1}`;
    const bodyLines = lines.slice(1);
    const preambleLines: string[] = [];
    for (const l of bodyLines) {
      if (/^\s*\d+[\.\)\-]\s/.test(l) || /^\s*[a-z][\.\)\-]\s/i.test(l)) break;
      const t = l.trim();
      // Skip OCR noise: lines < 8 chars, no real word (3+ letters), or all-caps garbage
      if (t.length > 0 && t.length >= 8 && /[a-zA-ZÀ-ÿ]{3,}/.test(t)) {
        preambleLines.push(t);
      }
    }
    return {
      id: sectionId,
      title: (titleOverride ?? titleLine).replace(/\(\d+.*?\)/g, '').replace(/\.\s*\d+.*$/, '').replace(/\s*:\s*$/, '').trim(),
      points,
      preamble: preambleLines.slice(0, 5).join(' ').slice(0, 400),
      questions: parseQuestions(part, sectionId),
    };
  };

  // ── Format 1: EXERCICE I, PARTIE A, PROBLÈME 1, etc. ────────────────────
  const stdSplitRegex = /(?=^(?:EXERCICE|PARTIE|PROBL[EÈ]ME|QUESTION|CHAPITRE|SECTION)\s+(?:[IVX]+|\d+))/im;
  const stdParts = text.split(new RegExp(stdSplitRegex, 'im')).filter(p => p.trim().length > 20);
  if (stdParts.length > 1) {
    return stdParts.map((part, i) => buildSection(part, i));
  }

  // ── Format 2: "1- Titre", "2- Titre", "I- Titre" (épreuves techniques) ──
  // Split only on top-level numbered sections (not sub-sections like "1-1-")
  const numSplitRegex = /\n(?=\s*(?:\d{1,2}|[IVX]{1,4})\s*[-–]\s+[^\d])/g;
  const numRawParts = text.split(numSplitRegex).filter(p => p.trim().length > 20);
  const numParts = numRawParts.filter(p => /^\s*(?:\d{1,2}|[IVX]{1,4})\s*[-–]\s+/.test(p.trim()));
  if (numParts.length > 1) {
    return numParts.map((part, i) => {
      const firstLine = part.trim().split('\n')[0].trim();
      // Title = strip leading "1- " or "I- " prefix
      const titleContent = firstLine.replace(/^\s*(?:\d{1,2}|[IVX]{1,4})\s*[-–]\s*/, '').trim();
      return buildSection(part, i, titleContent);
    });
  }

  // ── Fallback: whole text as one section ──────────────────────────────────
  return [{
    id: 's1',
    title: 'CONTENU',
    points: null,
    preamble: '',
    questions: parseQuestions(text, 's1'),
  }];
}

function parseQuestions(text: string, sectionId: string): any[] {
  const questions: any[] = [];
  const lines = text.split('\n');

  let currentQ: any = null;
  let qIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      // Blank line: preserve as paragraph break in current question
      if (currentQ) {
        if (currentQ.subQuestions.length === 0) {
          currentQ.text += '\n';
        } else {
          currentQ.subQuestions[currentQ.subQuestions.length - 1].text += '\n';
        }
      }
      continue;
    }

    // Numbered sub-question: "1-1- text", "2-3- text" (épreuves techniques)
    const numSubMatch = trimmed.match(/^(\d{1,2})-(\d{1,2})\s*[-–]\s+(.+)/);
    if (numSubMatch && currentQ) {
      const pts = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:points?|pts?)/i);
      currentQ.subQuestions.push({
        id: `${currentQ.id}n${numSubMatch[2]}`,
        letter: numSubMatch[2],
        text: numSubMatch[3].replace(/\(\d+.*?pts?\)/gi, '').trim(),
        points: pts ? parseFloat(pts[1].replace(',', '.')) : null,
      });
      continue;
    }

    // Top-level numbered question: "1.", "1)", "1-", but NOT "1-1-"
    const qMatch = trimmed.match(/^(\d+)[\.\)]\s+(.+)/)
                || trimmed.match(/^(\d+)-\s+(.+)/);
    if (qMatch) {
      if (currentQ) questions.push(currentQ);
      qIndex++;
      const pts = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:points?|pts?)/i);
      currentQ = {
        id: `${sectionId}q${qIndex}`,
        number: qMatch[1],
        text: qMatch[2].replace(/\(\d+.*?pts?\)/gi, '').trim(),
        points: pts ? parseFloat(pts[1].replace(',', '.')) : null,
        subQuestions: [],
      };
      continue;
    }

    // Letter sub-question: "a)", "a.", "a-", "a/"
    const subMatch = trimmed.match(/^([a-z])[\.\)\-\/]\s+(.+)/i);
    if (subMatch && currentQ) {
      const pts = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:points?|pts?)/i);
      currentQ.subQuestions.push({
        id: `${currentQ.id}${subMatch[1]}`,
        letter: subMatch[1].toLowerCase(),
        text: subMatch[2].replace(/\(\d+.*?pts?\)/gi, '').trim(),
        points: pts ? parseFloat(pts[1].replace(',', '.')) : null,
      });
      continue;
    }

    // Continuation of current question/sub-question (preserve line breaks)
    if (currentQ && trimmed.length > 3 && !/^(EXERCICE|PARTIE|PROBL)/i.test(trimmed)) {
      if (currentQ.subQuestions.length === 0) {
        currentQ.text += '\n' + trimmed;
      } else {
        currentQ.subQuestions[currentQ.subQuestions.length - 1].text += '\n' + trimmed;
      }
    }
  }

  if (currentQ) questions.push(currentQ);
  return questions;
}

function structurePdfText(rawText: string): any {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return {
    instructions: parseInstructions(text),
    totalPoints: parseTotalPoints(text) ?? 20,
    duration: parseDuration(text),
    sections: parseSections(text),
  };
}

/**
 * Normalise la valeur university retournée par Claude.
 * Claude peut retourner "none", "None", "null", "" ou null pour les examens nationaux.
 * Toutes ces variantes doivent être normalisées en 'NONE'.
 */
function normalizeUniversity(value: string | null | undefined): string {
  if (!value) return 'NONE';
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'none' || trimmed === 'null') return 'NONE';
  return trimmed;
}

/**
 * Détecte si le texte OCR contient plusieurs épreuves (recueil) et les découpe.
 * Retourne un tableau de chunks avec year, tour et texte. Tableau vide si PDF à examen unique.
 *
 * Format 1 : "BEPC 2012 1er tour", "BEPC 2012 2ème tour"
 * Format 2 : "SESSION DE 2015" (recueils SVT, HG…)
 * Format 3 : Université — "ANNÉE ACADÉMIQUE 2020-2021 ... ANNÉE ACADÉMIQUE 2021-2022"
 */
function splitMultiExam(text: string): Array<{ year: number; tour: string | null; text: string }> {
  // ── Format 1: "BEPC/BAC 2012 1er/2nd/2ème tour" ──────────────────────────
  const tourRegex = /^(?:BEPC|BAC|CEP|BEP|CAP)\s+(\d{4})\s*(1[eè]re?|2[eè]me?|2nd|second)?\s*tour/gim;
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

  // ── Format 2: "SESSION DE XXXX" — recueil par année ──────────────────────
  const sessionRegex = /SESSION\s+DE\s+(20\d{2})/gim;
  const sessionMatches: Array<{ index: number; year: number }> = [];
  const seenYears = new Set<number>();
  while ((m = sessionRegex.exec(text)) !== null) {
    const year = parseInt(m[1]);
    if (!seenYears.has(year)) { seenYears.add(year); sessionMatches.push({ index: m.index, year }); }
  }
  if (sessionMatches.length >= 2) {
    return sessionMatches.map((match, i) => ({
      year: match.year,
      tour: null,
      text: text.slice(match.index, i + 1 < sessionMatches.length ? sessionMatches[i + 1].index : text.length).trim(),
    }));
  }

  // ── Format 3: Recueils universitaires — "ANNÉE ACADÉMIQUE 20XX-20YY" ─────
  const acadRegex = /ANN[ÉE]E\s+ACAD[ÉE]MIQUE\s+(\d{4})-\d{4}/gim;
  const acadMatches: Array<{ index: number; year: number }> = [];
  const seenAcad = new Set<number>();
  while ((m = acadRegex.exec(text)) !== null) {
    const year = parseInt(m[1]);
    if (!seenAcad.has(year)) { seenAcad.add(year); acadMatches.push({ index: m.index, year }); }
  }
  if (acadMatches.length >= 2) {
    return acadMatches.map((match, i) => ({
      year: match.year + 1, // Exam year = end of academic year
      tour: null,
      text: text.slice(match.index, i + 1 < acadMatches.length ? acadMatches[i + 1].index : text.length).trim(),
    }));
  }

  return []; // PDF à examen unique
}

function buildFullExtractionPrompt(rawText: string): string {
  return `Tu es un expert en épreuves d'examens officiels d'Afrique de l'Ouest (Burkina Faso, Côte d'Ivoire, Sénégal, Mali, Niger, Togo, Bénin, etc.).
Tu reçois du texte brut extrait par OCR d'un PDF d'épreuve. Effectue les deux tâches suivantes.

## TÂCHE 1 : RECONSTITUER L'ÉPREUVE
- Corrige les erreurs OCR (mots déformés, caractères parasites, lignes de bruit)
- Génère "fullContent" : le texte complet et fidèle avec \\n pour les sauts de ligne
- Conserve la numérotation exacte des questions et sous-questions
- Conserve les unités, valeurs numériques, noms de variables (M1, Q1, etc.)
- Les schémas/figures déjà extraits apparaissent entre balises [FIGURE]...[/FIGURE] : conserve-les tels quels dans fullContent, ils sont essentiels pour la correction

## TÂCHE 2 : EXTRAIRE LES MÉTADONNÉES
Depuis l'en-tête de l'épreuve, identifie :
- **type** : l'un de BAC | BEPC | CEP | BEP | CAP | BREVET | CONCOURS_FP | PMK | LICENCE | COMPOSITION | DEVOIR
  → LICENCE : épreuve d'université (L1, L2, L3, Master, Doctorat)
  → CONCOURS_FP : concours de la fonction publique (gendarmerie, police, douane, armée, ENAM, ENSP, ESG…)
  → PMK : Prytanée Militaire de Kadiogo
  → COMPOSITION / DEVOIR : épreuve interne d'un lycée ou collège
- **subject** : nom exact de la matière (ex: Sociologie générale, Droit, Mathématiques, SVT…)
- **year** : année de l'examen (entier 4 chiffres)
- **series** : la série BAC (D, C, A, B, F3, G1, G2…) ou null si non applicable
- **university** :
  → Pour les EXAMENS NATIONAUX (BAC, BEPC, CEP) : "NONE"
  → Pour les CONCOURS NATIONAUX (CONCOURS_FP, PMK) : utilise le sigle de l'institution organisatrice (ex: "GN", "PMK", "ENAM", "ENSP", "ESG", "ENEP")
  → Pour les ÉPREUVES UNIVERSITAIRES (LICENCE) : sigle normalisé de l'université — utilise le tableau d'abréviations ci-dessous
  → Pour les COMPOSITIONS/DEVOIRS de lycée ou collège : nom exact de l'établissement (ex: "Lycée Philippe Zinda Kaboré", "Collège Saint-Jean")
- **faculty** :
  → Pour les ÉPREUVES UNIVERSITAIRES : nom de la faculté/UFR (ex: "UFR Sciences Humaines et Sociales")
  → Pour les COMPOSITIONS/DEVOIRS : classe ou niveau scolaire (ex: "Terminale", "1ère", "2nde", "3ème", "4ème")
  → Sinon : null
- **niveau** : niveau académique universitaire parmi L1 | L2 | L3 | M1 | M2 | DOCTORAT — null si pas applicable
  → L1 = Licence 1ère année, L2 = Licence 2ème année, L3 = Licence 3ème année
  → M1 = Master 1ère année, M2 = Master 2ème année
- **title** : titre court (ex: "LICENCE Sociologie générale 2022 - ULB", "BAC Mathématiques Série D 2024", "Devoir Physique-Chimie Terminale 2023 - Lycée X")
- **confidence** : confiance dans l'identification du lieu/institution — "high" (mention explicite dans l'en-tête), "medium" (déduit par contexte), "low" (absence ou ambiguïté)

## TABLEAU DES ABRÉVIATIONS — BURKINA FASO
Utilise TOUJOURS ces sigles normalisés pour le champ university :

### Universités publiques
- ULB = UNIVERSITÉ LIBRE DU BURKINA (Ouagadougou)
- UJKZ = UNIVERSITÉ JOSEPH KI-ZERBO (Ouagadougou) — aussi appelée UO (Université de Ouagadougou), JKZ, JKZERBO
- UNDA = UNIVERSITÉ AUBE NOUVELLE — aussi appelée UAN
- UPO = UNIVERSITÉ POLYTECHNIQUE DE BOBO-DIOULASSO — aussi appelée UPB
- NAZI_BONI = UNIVERSITÉ NAZI BONI (Bobo-Dioulasso) — aussi appelée UNB
- NORBERT_ZONGO = UNIVERSITÉ NORBERT ZONGO (Koudougou) — aussi appelée UNZ, UNK
- THOMAS_SANKARA = UNIVERSITÉ THOMAS SANKARA (Ouagadougou) — aussi appelée UTS, UTSO
- OUAHIGOUYA = UNIVERSITÉ DE OUAHIGOUYA — aussi appelée UO-OHG, UNOH

### Universités privées
- UCAO = UNIVERSITÉ CATHOLIQUE DE L'AFRIQUE DE L'OUEST — aussi appelée UCAO-UUBo
- SAINT_THOMAS_AQUIN = UNIVERSITÉ SAINT THOMAS D'AQUIN — aussi appelée USTA, USTAB
- SAINT_JOSEPH = UNIVERSITÉ SAINT JOSEPH DE CLUNY — aussi appelée USJ, USJC
- UPO_PRIVEE = UNIVERSITÉ PRIVÉE DE OUAGADOUGOU

### Grandes écoles et instituts
- ENAM = ÉCOLE NATIONALE D'ADMINISTRATION ET DE MAGISTRATURE — concours CONCOURS_FP
- ENSP = ÉCOLE NATIONALE DE SANTÉ PUBLIQUE — concours CONCOURS_FP
- ESG = ÉCOLE SUPÉRIEURE DE GESTION — concours CONCOURS_FP
- ENEP = ÉCOLE NATIONALE DES ENSEIGNANTS DU PRIMAIRE — concours CONCOURS_FP
- ENAREF = ÉCOLE NATIONALE DES RÉGIES FINANCIÈRES — concours CONCOURS_FP
- IBAM = INSTITUT BURKINABÈ DES ARTS ET MÉDIAS
- INS = INSTITUT NATIONAL DE LA STATISTIQUE

### Institutions sécurité/défense
- GN = GENDARMERIE NATIONALE — concours CONCOURS_FP
- FAN = FORCES ARMÉES NATIONALES / ARMÉE — concours CONCOURS_FP
- PMK = PRYTANÉE MILITAIRE DE KADIOGO — type PMK
- POLICE = POLICE NATIONALE — concours CONCOURS_FP
- DOUANE = DOUANES NATIONALES — concours CONCOURS_FP

## DÉTECTION PAR TYPE D'ÉPREUVE

**Épreuves universitaires** — si l'en-tête contient "UNIVERSITÉ", "UFR", "FACULTÉ", "LICENCE", "MASTER", "L1", "L2", "L3", "SEMESTRE" :
→ type="LICENCE", university=sigle normalisé (tableau ci-dessus), faculty=nom UFR/faculté, niveau=L1/L2/L3/M1/M2/DOCTORAT
• Ex: "UNIVERSITÉ LIBRE DU BURKINA (ULB) / UFR-SHS / LICENCE 1" → university="ULB", faculty="UFR Sciences Humaines et Sociales", niveau="L1"
• Ex: "UO / FSEG / MASTER 2 FINANCE" → university="UJKZ", faculty="FSEG", niveau="M2"
• Ex: "UJKZ / UFR-SEA / L2 BIOLOGIE" → university="UJKZ", niveau="L2"

**Concours de la fonction publique** — si l'en-tête contient "CONCOURS", "RECRUTEMENT", "GENDARMERIE", "POLICE", "DOUANE", "ARMÉE", "FORCES ARMÉES", "ENAM", "ENSP" :
→ type="CONCOURS_FP", university=sigle institution organisatrice
• Ex: "MINISTÈRE DE LA SÉCURITÉ / CONCOURS DE RECRUTEMENT / GENDARMERIE NATIONALE 2023" → university="GN", type="CONCOURS_FP"
• Ex: "ENAM / CONCOURS D'ENTRÉE 2024" → university="ENAM", type="CONCOURS_FP"

**Compositions et devoirs scolaires** — si l'en-tête contient "LYCÉE", "COLLÈGE", "DEVOIR DE CLASSE", "COMPOSITION", "TRIMESTRE" :
→ type="COMPOSITION" ou "DEVOIR", university=nom de l'établissement, faculty=classe (Terminale/1ère/2nde/3ème…)
• Ex: "LYCÉE ZINDA KABORÉ / DEVOIR N°1 / TERMINALE D / PHYSIQUE-CHIMIE 2024" → university="Lycée Zinda Kaboré", faculty="Terminale", series="D"

## CORRECTIONS OCR FRÉQUENTES
- "WUPANOTOGIOUR" ou similaire → "TECHNOLOGIQUE"
- "MATHIEMATIQUES" → "MATHÉMATIQUES"
- "BACCALAURIEAT" → "BACCALAUREAT"
- "KINERBO", "KI-ZERB0" → "KI-ZERBO"
- Lignes de bruit pur (ex: "SH CR DES oO", "PEL LLL") → supprimer

## FORMAT DE SORTIE
Retourne UNIQUEMENT un JSON valide, sans markdown ni texte autour.
Exemples selon le type :

BAC : { "type":"BAC", "subject":"Mathématiques", "year":2024, "series":"D", "university":"NONE", "faculty":null, "niveau":null, "confidence":"high", "title":"BAC Mathématiques Série D 2024", ... }
BEPC : { "type":"BEPC", "subject":"SVT", "year":2023, "series":null, "university":"NONE", "faculty":null, "niveau":null, "confidence":"high", "title":"BEPC SVT 2023", ... }
Université : { "type":"LICENCE", "subject":"Sociologie générale", "year":2022, "series":null, "university":"ULB", "faculty":"UFR Sciences Humaines et Sociales", "niveau":"L1", "confidence":"high", "title":"LICENCE Sociologie générale 2022 - ULB", ... }
Lycée : { "type":"DEVOIR", "subject":"Physique-Chimie", "year":2024, "series":"D", "university":"Lycée Zinda Kaboré", "faculty":"Terminale", "niveau":null, "confidence":"medium", "title":"Devoir Physique-Chimie Terminale D 2024 - Lycée Zinda Kaboré", ... }
Concours GN : { "type":"CONCOURS_FP", "subject":"Culture Générale", "year":2023, "series":null, "university":"GN", "faculty":null, "niveau":null, "confidence":"high", "title":"Concours GN Culture Générale 2023", ... }

Structure complète :
{
  "type": "...",
  "subject": "...",
  "year": 2024,
  "series": null,
  "university": "...",
  "faculty": null,
  "niveau": null,
  "confidence": "high",
  "title": "...",
  "instructions": ["string"],
  "totalPoints": 20,
  "duration": 120,
  "fullContent": "texte complet avec \\n pour sauts de ligne",
  "sections": []
}

## TEXTE OCR BRUT :
---
${rawText.slice(0, 18000)}
---`;
}

/** Retourne un persona système expert adapté à la matière et au type d'examen */
function buildSubjectPersona(subject: string, type: string, series: string | null): string {
  const levelLabel = (() => {
    if (type === 'BAC') return `Baccalauréat${series ? ' série ' + series : ''}`;
    if (type === 'BEPC') return "Brevet d'Études du Premier Cycle (BEPC)";
    if (type === 'CEP') return "Certificat d'Études Primaires (CEP)";
    if (type === 'LICENCE') return 'épreuve universitaire (Licence/Master)';
    if (type === 'CONCOURS_FP') return 'concours de recrutement de la fonction publique';
    if (type === 'PMK') return "concours d'entrée au Prytanée Militaire de Kadiogo";
    if (type === 'COMPOSITION' || type === 'DEVOIR') return 'épreuve scolaire interne';
    return `examen ${type}`;
  })();

  const isMath = /math/i.test(subject);
  const isPhysics = /physique|chimie|\bpc\b/i.test(subject);
  const isBiology = /svt|sciences?\s+(?:naturelles?|de\s+la\s+vie|biolog)/i.test(subject);
  const isFrench = /fran[çc]ais|littér/i.test(subject);
  const isPhilo = /philo/i.test(subject);
  const isHistory = /histoire|g[eé]ograph|\bhg\b/i.test(subject);
  const isEco = /[eé]conom|gestion|comptab/i.test(subject);
  const isLaw = /droit|juridique/i.test(subject);
  const isSocio = /sociolog|anthropolog|psycholog/i.test(subject);
  const isTech = /technique|technolog|inform|\b[eé]lectron|\bm[eé]can|\b[eé]lectric/i.test(subject);

  if (isMath) {
    return `Tu es un Inspecteur de l'Enseignement Secondaire en Mathématiques, spécialiste du programme officiel burkinabè (DGESS/MENA) pour le ${levelLabel}. Tu as rédigé et corrigé des milliers de copies d'examens nationaux au Burkina Faso.

## MÉTHODOLOGIE MATHÉMATIQUES
Pour chaque question ou sous-question :
1. **Identification** : cite la propriété ou le théorème à appliquer (ex: "D'après le théorème de Pythagore…")
2. **Application** : pose la formule, substitue les valeurs numériques étape par étape
3. **Calcul** : montre TOUTES les opérations intermédiaires
4. **Résultat** : encadre le résultat final avec ses unités

## RÈGLES
- Ne saute AUCUNE étape de calcul, même la plus évidente
- Encadre les résultats finaux : [Résultat : 42 m²]
- Donne les unités à chaque étape numérique
- Pour la géométrie/trigonométrie : décris les schémas textuellement avec précision
- Pour les probabilités : pose l'univers des possibles et justifie la formule`;
  }

  if (isPhysics) {
    return `Tu es un Inspecteur de l'Enseignement Secondaire en Physique-Chimie, spécialiste du programme officiel burkinabè (DGESS/MENA) pour le ${levelLabel}.

## MÉTHODOLOGIE PHYSIQUE-CHIMIE
Pour chaque exercice :
1. **Données** : liste les grandeurs données avec leurs unités
2. **Loi** : cite explicitement la loi ou relation physico-chimique (ex: "Loi d'Ohm : U = R × I")
3. **Application** : substitue les valeurs numériques
4. **Résultat** : valeur numérique avec unité SI correcte

## RÈGLES
- Cite TOUJOURS la loi ou la formule avant de l'appliquer
- Convertis les unités si nécessaire en montrant la conversion (ex: km/h → m/s)
- Pour la chimie : équilibre les équations et montre le raisonnement molaire
- Vérifie l'homogénéité des unités`;
  }

  if (isBiology) {
    return `Tu es un Inspecteur de l'Enseignement Secondaire en Sciences de la Vie et de la Terre (SVT), spécialiste du programme officiel burkinabè (DGESS/MENA) pour le ${levelLabel}.

## MÉTHODOLOGIE SVT
1. **Définitions** : définis les termes biologiques clés si demandé
2. **Mécanismes** : explique les processus biologiques étape par étape (mitose, photosynthèse, digestion…)
3. **Schémas** : décris les schémas avec légendes textuelles précises
4. **Conclusions** : déduis les conséquences biologiques ou écologiques

## RÈGLES
- Utilise la terminologie scientifique exacte du programme burkinabè
- Pour la génétique : montre les croisements et phénotypes étape par étape
- Pour les graphes/courbes : explique les variations et leurs causes biologiques`;
  }

  if (isFrench || isPhilo) {
    return `Tu es un Professeur Agrégé de ${isPhilo ? 'Philosophie' : 'Lettres Modernes'}, spécialiste du programme officiel burkinabè et de la littérature francophone africaine pour le ${levelLabel}.

## MÉTHODOLOGIE ${isPhilo ? 'PHILOSOPHIE' : 'FRANÇAIS'}
${isPhilo ? `Pour une dissertation philosophique :
1. Analyse du sujet : reformule la problématique, identifie les concepts clés, pose les enjeux
2. Plan : thèse, antithèse, synthèse avec arguments développés
3. Développement : arguments + exemples d'auteurs (Descartes, Kant, Sartre, philosophie africaine…)
4. Conclusion : réponse à la problématique et ouverture` : `
Pour un commentaire composé :
- Introduction (présentation, problématique, plan), axes d'analyse (procédés stylistiques + effets), conclusion
Pour une dissertation :
- Plan détaillé (parties I/II/III numérotées), arguments + exemples d'œuvres précises
Pour les exercices de langue :
- Cite la règle grammaticale/orthographique officielle avant d'appliquer`}

## RÈGLES
- Propose toujours un plan COMPLET (intro, développement numéroté, conclusion)
- Cite des auteurs africains/francophones si pertinent (Senghor, Camara Laye, Mongo Beti…)
- Signale les pièges classiques des candidats`;
  }

  if (isHistory) {
    return `Tu es un Inspecteur de l'Enseignement Secondaire en Histoire-Géographie, spécialiste du programme officiel burkinabè pour le ${levelLabel}. Tu maîtrises l'histoire de l'Afrique de l'Ouest et la géographie du Burkina Faso.

## MÉTHODOLOGIE HISTOIRE-GÉOGRAPHIE
1. Analyse du sujet : délimitation spatio-temporelle, mots-clés, problématique
2. Plan : parties et sous-parties titrées et numérotées
3. Développement : faits précis, dates exactes, acteurs nommés, lieux, causes/conséquences
4. Conclusion : bilan synthétique et ouverture

## RÈGLES
- Donne des DATES PRÉCISES et des NOMS EXACTS (personnages, pays, organisations)
- Pour la géographie : cite des données chiffrées (population, PIB, superficie, production…)
- Mentionne le contexte régional africain et de l'Afrique de l'Ouest quand pertinent
- Structure clairement : INTRODUCTION – DÉVELOPPEMENT (I. II. III.) – CONCLUSION`;
  }

  if (isEco || isLaw || isSocio) {
    return `Tu es un Professeur-chercheur spécialiste de ${subject || 'sciences humaines et sociales'}, expert du programme burkinabè pour le ${levelLabel}.

## MÉTHODOLOGIE
1. Définitions rigoureuses : définis les concepts clés avec précision académique
2. Cadre théorique : cite les auteurs, théories et courants de pensée pertinents
3. Analyse : applique le cadre théorique au cas concret posé
4. Exemples : illustre avec des exemples du contexte africain/burkinabè si possible

## RÈGLES
- Pour le droit : cite les textes juridiques (articles, lois, codes) si pertinent
- Pour l'économie : utilise les modèles appropriés (offre/demande, équilibre…)
- Utilise le vocabulaire disciplinaire exact`;
  }

  if (isTech) {
    return `Tu es un Professeur de ${subject || 'Sciences et Techniques'}, spécialiste du programme technique et professionnel burkinabè (BAC technologique/professionnel F3/G1/G2) pour le ${levelLabel}.

## MÉTHODOLOGIE ÉPREUVE TECHNIQUE
1. Données et paramètres : liste les valeurs données et les grandeurs à calculer
2. Schémas et diagrammes : décris les schémas techniques textuellement avec légendes précises
3. Calculs : applique les formules du domaine avec toutes les étapes
4. Résultats : valeurs avec unités et vérification de cohérence

## RÈGLES
- Cite les normes et standards techniques si pertinent
- Respecte la numérotation du dossier technique (1-1-, 1-2-, 2-1-…)
- Décris précisément les composants et leur rôle dans le système étudié`;
  }

  // Fallback générique (culture générale, langues, etc.)
  return `Tu es un enseignant expert en ${subject || 'la discipline concernée'}, spécialiste du programme officiel burkinabè (DGESS/MENA) pour le ${levelLabel}. Tu as participé à de nombreuses commissions de correction nationales et maîtrises parfaitement les attentes des jurys d'examen.

## MÉTHODOLOGIE
Pour chaque question, fournis une correction complète et pédagogique :
1. Rappelle brièvement la notion ou le concept mobilisé
2. Développe la réponse avec toutes les étapes de raisonnement
3. Conclure avec la réponse nette et précise

## RÈGLES
- Traite TOUTES les questions dans l'ordre exact de l'épreuve
- Sois précis, rigoureux et pédagogique
- Utilise les mêmes symboles, unités et variables que dans l'épreuve originale`;
}

/**
 * Construit le system prompt et le message user pour la génération de correction.
 * Retourne { system, user } pour utilisation avec le paramètre `system` de l'API Anthropic.
 */
function buildCorrectionPrompt(
  subject: string,
  type: string,
  series: string | null,
  fullContent: string,
): { system: string; user: string } {
  const subjectPersona = buildSubjectPersona(subject, type, series);

  const system = `${subjectPersona}

## SCHÉMAS ET FIGURES
L'épreuve peut contenir des descriptions de schémas entre balises [FIGURE]...[/FIGURE].
Ces descriptions représentent les figures originales (circuits, géométrie, graphes, biologie…).
Utilise ces informations pour corriger les questions qui s'y réfèrent, exactement comme si tu avais la figure devant toi.

## FORMAT DE SORTIE
Texte structuré, lisible, sans JSON, sans markdown (pas de # ou *).
Pour chaque section ou exercice :

EXERCICE I (ou titre exact tel qu'il apparaît dans l'épreuve)
────────────────────────────────────────────────────────────
Question 1 (ou 1-1) :
→ Correction complète avec toutes les étapes

Question 2 (ou 1-2) :
→ ...

Traite TOUTES les sections et questions dans l'ordre. Ne saute aucune.`;

  const user = `Voici l'épreuve à corriger :

═══════════════════════════════════════════════════
${fullContent.slice(0, 14000)}
═══════════════════════════════════════════════════

Génère maintenant la correction officielle complète, question par question, en appliquant ta méthodologie d'expert.`;

  return { system, user };
}

@Injectable()
export class AdminExamsService {
  constructor(private prisma: PrismaService) {}

  async createExam(data: any) {
    return this.prisma.exam.create({
      data,
    });
  }

  async updateExam(id: string, data: any) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    return this.prisma.exam.update({
      where: { id },
      data,
    });
  }

  async deleteExam(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    // Delete associated questions first
    await this.prisma.question.deleteMany({
      where: { examId: id },
    });

    // Note: Quiz doesn't have examId relation, so we skip quiz deletion
    // Quizzes are created independently with questionIds

    return this.prisma.exam.delete({
      where: { id },
    });
  }

  async addQuestions(examId: string, questions: any[]) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    const createdQuestions = await Promise.all(
      questions.map((question) =>
        this.prisma.question.create({
          data: {
            ...question,
            examId,
          },
        }),
      ),
    );

    return createdQuestions;
  }

  async getExamStats() {
    const [
      totalExams,
      cepExams,
      bepcExams,
      bacExams,
      totalQuestions,
      totalQuizzes,
    ] = await Promise.all([
      this.prisma.exam.count(),
      this.prisma.exam.count({
        where: { type: 'CEP' },
      }),
      this.prisma.exam.count({
        where: { type: 'BEPC' },
      }),
      this.prisma.exam.count({
        where: { type: 'BAC' },
      }),
      this.prisma.question.count(),
      this.prisma.quiz.count(),
    ]);

    return {
      totalExams,
      cepExams,
      bepcExams,
      bacExams,
      totalQuestions,
      totalQuizzes,
    };
  }

  async getPopularExams(limit: number = 10) {
    const exams = await this.prisma.exam.findMany({
      orderBy: { viewCount: 'desc' },
      take: limit,
      select: {
        id: true, title: true, type: true, year: true, subject: true,
        pdfUrl: true, difficulty: true, viewCount: true, downloadCount: true,
        university: true, faculty: true, series: true, country: true,
        isPublished: true, createdAt: true,
        _count: { select: { questions: true } },
      },
    });

    return exams;
  }

  async generateCorrection(examId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) throw new NotFoundException('Examen non trouvé');

    const content = exam.content as any;
    if (!content?.fullContent) {
      throw new BadRequestException(
        'Cette épreuve n\'a pas de contenu structuré. Uploadez d\'abord le PDF.',
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new InternalServerErrorException('ANTHROPIC_API_KEY non configurée');

    const anthropic = new Anthropic({ apiKey });
    const { system: corrSystem, user: corrUser } = buildCorrectionPrompt(exam.subject, exam.type, exam.series ?? null, content.fullContent);
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: corrSystem,
      messages: [{ role: 'user', content: corrUser }],
    }, { timeout: 120000 });

    const responseText = ((message.content[0] as any).text as string).trim();
    if (!responseText || responseText.length < 50) {
      throw new InternalServerErrorException('Réponse IA trop courte ou vide');
    }

    const result = {
      fullCorrection: responseText,
      generatedAt: new Date().toISOString(),
      model: 'claude-sonnet-4-6',
    };

    await this.prisma.exam.update({ where: { id: examId }, data: { correction: result } });
    return result;
  }

  async uploadAndCreateExam(file: Express.Multer.File, country = 'BF') {
    try {
      // Step 1: Extract text (pdftotext → pdf-parse → OCR)
      const rawText = await extractTextFromPdf(file.path);

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new InternalServerErrorException('ANTHROPIC_API_KEY non configurée');

      const heuristic = (rawText && rawText.trim().length > 50)
        ? structurePdfText(rawText)
        : { instructions: [], totalPoints: 20, duration: null, sections: [] };

      // Step 2: Claude reconstruction + metadata extraction
      let structured: any = { ...heuristic, type: 'BEPC', subject: 'Non identifié', year: new Date().getFullYear(), series: null, university: 'NONE' };

      if (rawText && rawText.trim().length > 50) {
        try {
          const anthropic = new Anthropic({ apiKey });
          const msg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 10000,
            messages: [{ role: 'user', content: buildFullExtractionPrompt(rawText) }],
          }, { timeout: 120000 });
          const responseText = (msg.content[0] as any).text as string;
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            let parsed: any;
            try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; }
            if (!parsed) throw new Error('JSON parse failed');
            // Re-parse sections from Claude's cleaned fullContent for best quality
            const cleanedSections = parsed.fullContent
              ? parseSections(parsed.fullContent)
              : heuristic.sections;
            structured = {
              ...parsed,
              sections: cleanedSections.length > 0 ? cleanedSections : heuristic.sections,
              duration: heuristic.duration ?? parsed.duration,
              totalPoints: heuristic.totalPoints ?? parsed.totalPoints,
            };
          }
        } catch { /* fallback to heuristic + defaults */ }
      }

      // Step 3: Generate correction
      // Use structured.fullContent if available, otherwise fall back to raw OCR text
      const correctionInput = structured.fullContent || (rawText && rawText.trim().length > 50 ? rawText : null);
      let correction: any = null;
      if (correctionInput) {
        try {
          const anthropic = new Anthropic({ apiKey });
          const { system: corrSystem, user: corrUser } = buildCorrectionPrompt(
              structured.subject || '',
              structured.type || '',
              structured.series ?? null,
              correctionInput.slice(0, 14000),
            );
          const corrMsg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 8000,
            system: corrSystem,
            messages: [{ role: 'user', content: corrUser }],
          }, { timeout: 120000 });
          const corrText = ((corrMsg.content[0] as any).text as string).trim();
          console.log(`[Correction] Generated ${corrText.length} chars for "${structured.title || 'untitled'}"`);
          if (corrText.length > 50) {
            correction = {
              fullCorrection: corrText,
              generatedAt: new Date().toISOString(),
              model: 'claude-sonnet-4-6',
            };
          }
        } catch (corrErr) {
          console.error('[Correction] Generation failed:', (corrErr as Error).message);
        }
      } else {
        console.warn('[Correction] No content to generate correction from');
      }

      // Step 4: Build title and create exam in DB
      const title = structured.title || [
        structured.type,
        structured.subject,
        structured.series ? `Série ${structured.series}` : null,
        structured.year,
      ].filter(Boolean).join(' ');

      const contentHash = computeContentHash(rawText);
      const exam = await this.prisma.exam.create({
        data: {
          title,
          type: String(structured.type || 'BEPC'),
          subject: String(structured.subject || 'Non identifié'),
          year: structured.year ? Number(structured.year) : new Date().getFullYear(),
          series: structured.series ? String(structured.series) : null,
          university: normalizeUniversity(structured.university),
          faculty: structured.faculty ? String(structured.faculty) : null,
          duration: structured.duration ? Number(structured.duration) : null,
          content: structured,
          correction,
          contentHash: contentHash || null,
          isPublished: true,
          country,
        },
      });

      try { fs.unlinkSync(file.path); } catch { /* ignore */ }

      // Sync ExamConfig so new types/universities appear in student navigation
      await this.syncExamConfigFromImport([exam]).catch(() => {});

      return { exam, hasCorrection: !!correction };
    } catch (error) {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      if (
        error instanceof InternalServerErrorException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) throw error;
      throw new InternalServerErrorException(`Erreur: ${(error as Error).message}`);
    }
  }

  async extractAndStructurePdf(file: Express.Multer.File) {
    try {
      // 1. Extract text (pdftotext → pdf-parse → OCR fallback)
      const rawText = await extractTextFromPdf(file.path);
      const isScanned = !rawText || rawText.trim().length < 50;

      if (isScanned) {
        try { fs.unlinkSync(file.path); } catch { /* ignore */ }
        return {
          content: { instructions: [], totalPoints: 20, duration: null, sections: [] },
          rawTextLength: 0,
          isScanned: true,
        };
      }

      // 2. Use heuristic parser for quick metadata (duration, totalPoints, instructions)
      const heuristic = structurePdfText(rawText);

      // 3. Use Claude AI to clean OCR noise and structure sections/questions
      const apiKey = process.env.ANTHROPIC_API_KEY;
      let structured = heuristic;

      if (apiKey) {
        try {
          const anthropic = new Anthropic({ apiKey });

          const prompt = `Tu es un expert en reconstruction d'épreuves d'examens officiels du Burkina Faso (BAC, BEPC, CEP). Tu reçois du texte brut extrait par OCR d'un PDF scanné, souvent avec de nombreuses erreurs.

## STRUCTURE TYPIQUE D'UNE ÉPREUVE DU BACCALAURÉAT BURKINABÉ

L'en-tête est sur DEUX COLONNES (l'OCR les mélange souvent) :
- Colonne gauche : "EXAMEN DU BACCALAUREAT [TYPE]" (TYPE = TECHNOLOGIQUE, GÉNÉRAL, PROFESSIONNEL, etc.)
- Colonne droite : "BURKINA FASO" / "La Patrie ou la Mort, nous Vaincrons"
- Colonne gauche : "SESSION NORMALE DE [année]" ou "SESSION COMPLÉMENTAIRE DE [année]"
- Colonne droite : "1er tour" ou "2ème tour"
- Colonne gauche : "SERIE : [lettre]" (F3, D, C, B, A, G1, G2, etc.)

Exemple d'en-tête correct :
\`\`\`
EXAMEN DU BACCALAUREAT TECHNOLOGIQUE          BURKINA FASO
...........                                    ...........
                                               La Patrie ou la Mort, nous Vaincrons
SESSION NORMALE DE 2025                        1er tour
...........
SERIE : F3
\`\`\`

## CORRECTIONS OCR TYPIQUES À APPLIQUER
- "WUPANOTOGIOUR" ou "WUPANOTDGIQUR" → "TECHNOLOGIQUE"
- "RSA 1° tour" ou "RSA 1er tour" → reconstruire "1er tour" comme indication de tour
- Si tu vois "RSA" suivi d'un tour, c'est probablement "SERIE : [lettre]" qui a été mal lu
- "Tincarintian da linctallatinn" → "Description de l'installation"
- "alêliÈr D COMPING" ou "atelier D COMPING" → "L'atelier B comprend :"
- "< " ou "# " ou "% " ou "" ou "¢ " en début de puce → "❖ " ou "- "
- "* " ou "** " au début → tiret ou puce selon le contexte
- "Puce :" / "Puce;" → ignorer (bruit OCR)
- Lignes de bruit pur (ex: "SH CR DES oO", "ef FOOSE = Weer", "PEL LLL LS", "| Que Vus entente ebeaatver") → supprimer
- Les pointillés "........" ou "----------" sont des séparateurs décoratifs → conserver en version courte "........"

## RÈGLES DE RECONSTRUCTION
1. RECONSTITUE l'en-tête correct avec les deux colonnes bien séparées
2. Identifie le TYPE d'examen (TECHNOLOGIQUE/GÉNÉRAL/etc.) même si l'OCR le déforme
3. Identifie la SERIE (F3, D, C, etc.) qui peut être absente de l'OCR si mal lue
4. Corrige les mots déformés par l'OCR en utilisant le contexte
5. Conserve TOUTE la ponctuation : points-virgules (;), deux-points (:), virgules, parenthèses
6. Conserve la numérotation exacte : 1-, 1-1-, 1-2-, 2-, 2-1-, etc.
7. Conserve les "NB :" et leurs contenus
8. Conserve tous les nombres, valeurs, unités physiques exactement
9. Conserve les noms propres : M1, M2, Q1, Q2, D2, D3, D4, TR, etc.
10. Conserve le footer "MESFPT/SG/DGECC_2025" et la pagination "1/11"

## FORMAT DE SORTIE
Retourne UNIQUEMENT un JSON valide (sans markdown, sans explication) :
{
  "instructions": ["string"],
  "totalPoints": number,
  "duration": number,
  "fullContent": "texte complet fidèle avec \\n pour sauts de ligne",
  "sections": []
}

## TEXTE OCR BRUT À CORRIGER :
---
${rawText.slice(0, 18000)}
---`;

          const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 8000,
            messages: [{ role: 'user', content: prompt }],
          }, { timeout: 120000 });

          const responseText = (message.content[0] as any).text as string;
          // Extract JSON — strip any accidental markdown fences
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            let parsed: any;
            try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; }
            if (parsed && parsed.sections !== undefined) {
              // Re-parse sections from Claude's cleaned fullContent for best quality
              const cleanedSections = parsed.fullContent
                ? parseSections(parsed.fullContent)
                : heuristic.sections;
              structured = {
                ...parsed,
                sections: cleanedSections.length > 0 ? cleanedSections : heuristic.sections,
                // Prefer heuristic for numeric fields (more reliable regex extraction)
                duration: heuristic.duration ?? parsed.duration,
                totalPoints: heuristic.totalPoints ?? parsed.totalPoints,
              };
            }
          }
        } catch { /* fall back to heuristic */ }
      }

      // Generate correction if fullContent exists
      let correction: any = null;
      if (structured.fullContent && apiKey) {
        try {
          const correctionAnthopic = new Anthropic({ apiKey });
          const { system: corrSystem, user: corrUser } = buildCorrectionPrompt(
            structured.subject || '',
            structured.type || '',
            structured.series ?? null,
            structured.fullContent,
          );
          const corrMsg = await correctionAnthopic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 8000,
            system: corrSystem,
            messages: [{ role: 'user', content: corrUser }],
          }, { timeout: 120000 });
          const corrText = ((corrMsg.content[0] as any).text as string).trim();
          if (corrText.length > 50) {
            correction = {
              fullCorrection: corrText,
              generatedAt: new Date().toISOString(),
              model: 'claude-sonnet-4-6',
            };
          }
        } catch { /* correction generation failed — not blocking */ }
      }

      // Supprimer le PDF temporaire — le contenu est en DB, le fichier n'est plus nécessaire
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }

      return {
        content: structured,
        correction,
        rawTextLength: rawText.length,
        isScanned,
      };
    } catch (error) {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      throw new InternalServerErrorException(
        `Erreur lors du traitement du PDF: ${(error as Error).message}`,
      );
    }
  }

  // ─── Duplicate detection ────────────────────────────────────────────────────
  private async checkDuplicate(contentHash: string, structured: any): Promise<{
    status: 'new' | 'duplicate' | 'similar' | 'metadata_match';
    duplicateOf: any | null;
  }> {
    const type: string = structured.type || '';
    const isNational = type !== 'COMPOSITION' && type !== 'DEVOIR' && !type.startsWith('CUSTOM_') && type !== 'NONE';

    // 1. Hash match
    if (contentHash) {
      const hashMatches = await this.prisma.exam.findMany({ where: { contentHash } });
      if (hashMatches.length > 0) {
        const sameInstitution = hashMatches.some(e => {
          if (!isNational) return e.university === (structured.university || 'NONE');
          // National: same type = definitively same exam
          return e.type === type;
        });
        return {
          status: sameInstitution ? 'duplicate' : 'similar',
          duplicateOf: hashMatches[0],
        };
      }
    }

    // 2. Metadata match for national exams (catches same exam, different scan/format)
    if (isNational && structured.year && structured.subject) {
      const metaMatch = await this.prisma.exam.findFirst({
        where: {
          type,
          year: Number(structured.year),
          subject: { equals: structured.subject, mode: 'insensitive' },
          ...(structured.series ? { series: structured.series } : {}),
          university: 'NONE',
        },
      });
      if (metaMatch) return { status: 'metadata_match', duplicateOf: metaMatch };
    }

    // 3. Metadata match for institution-based exams
    if (!isNational && structured.university && structured.university !== 'NONE' && structured.year && structured.subject) {
      const metaMatch = await this.prisma.exam.findFirst({
        where: {
          university: structured.university,
          faculty: structured.faculty || null,
          year: Number(structured.year),
          subject: { equals: structured.subject, mode: 'insensitive' },
        },
      });
      if (metaMatch) return { status: 'metadata_match', duplicateOf: metaMatch };
    }

    return { status: 'new', duplicateOf: null };
  }

  // ─── Batch analyze ──────────────────────────────────────────────────────────

  /** Analyse un chunk de texte (épreuve isolée ou morceau de recueil) et retourne un item de résultat */
  private async analyzeChunk(
    rawText: string,
    isScanned: boolean,
    fileName: string,
    apiKey: string | undefined,
    yearHint?: number,
    tourHint?: string | null,
  ): Promise<any> {
    const heuristic = !isScanned
      ? structurePdfText(rawText)
      : { instructions: [], totalPoints: 20, duration: null, sections: [] };

    let structured: any = {
      ...heuristic,
      type: 'BEPC', subject: 'Non identifié',
      year: yearHint ?? new Date().getFullYear(), series: null, university: 'NONE',
    };

    if (!isScanned && apiKey) {
      try {
        const anthropic = new Anthropic({ apiKey });
        const msg = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 8000,
          messages: [{ role: 'user', content: buildFullExtractionPrompt(rawText) }],
        }, { timeout: 120000 });
        const responseText = (msg.content[0] as any).text as string;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let parsed: any;
          try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; }
          if (!parsed) throw new Error('JSON parse failed');
          // Re-parse sections from Claude's cleaned fullContent for best quality
          const cleanedSections = parsed.fullContent
            ? parseSections(parsed.fullContent)
            : heuristic.sections;
          structured = {
            ...parsed,
            sections: cleanedSections.length > 0 ? cleanedSections : heuristic.sections,
            duration: heuristic.duration ?? parsed.duration,
            totalPoints: heuristic.totalPoints ?? parsed.totalPoints,
          };
        }
      } catch { /* keep heuristic */ }
    }

    // For recueil chunks, year/tour hints override Claude if Claude missed them
    if (yearHint && !structured.year) structured.year = yearHint;

    const contentHash = computeContentHash(rawText || '');
    const { status, duplicateOf } = await this.checkDuplicate(contentHash, structured);

    const tourLabel = tourHint ? ` - ${tourHint} tour` : '';
    const title = structured.title || [
      structured.type, structured.subject,
      structured.series ? `Série ${structured.series}` : null,
      structured.year,
    ].filter(Boolean).join(' ') + tourLabel;

    return {
      fileName,
      status,
      duplicateOf: duplicateOf ? {
        id: duplicateOf.id,
        title: duplicateOf.title,
        type: duplicateOf.type,
        year: duplicateOf.year,
        university: duplicateOf.university,
      } : null,
      metadata: {
        title,
        type: structured.type || 'BEPC',
        subject: structured.subject || 'Non identifié',
        year: structured.year ? Number(structured.year) : new Date().getFullYear(),
        series: structured.series || null,
        university: normalizeUniversity(structured.university),
        faculty: structured.faculty || null,
        niveau: structured.niveau || null,
        duration: structured.duration || null,
        confidence: structured.confidence || (isScanned ? 'low' : 'medium'),
      },
      content: structured,
      contentHash: contentHash || null,
      isScanned,
    };
  }

  async analyzeBatch(files: Express.Multer.File[]) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const results: any[] = [];

    for (const file of files) {
      try {
        const rawText = await extractTextFromPdf(file.path);
        const isScanned = !rawText || rawText.trim().length < 50;

        // Detect recueil (PDF containing multiple exams)
        const chunks = !isScanned ? splitMultiExam(rawText) : [];

        if (chunks.length >= 2) {
          // Process each exam chunk independently
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkFileName = `${file.originalname} [${i + 1}/${chunks.length}]`;
            try {
              const item = await this.analyzeChunk(chunk.text, false, chunkFileName, apiKey, chunk.year, chunk.tour);
              item.fromRecueil = true;
              item.recueilInfo = { total: chunks.length, index: i + 1, year: chunk.year, tour: chunk.tour };
              results.push(item);
            } catch (e) {
              results.push({ fileName: chunkFileName, status: 'error', error: (e as Error).message, fromRecueil: true });
            }
          }
        } else {
          // Single exam per file
          const item = await this.analyzeChunk(rawText, isScanned, file.originalname, apiKey);
          results.push(item);
        }
      } catch (e) {
        results.push({ fileName: file.originalname, status: 'error', error: (e as Error).message });
      } finally {
        try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      }
    }

    return results;
  }

  // ─── Import batch history ────────────────────────────────────────────────────
  async getImportBatches() {
    const batches = await this.prisma.importBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        exams: {
          select: { id: true, title: true, subject: true, type: true, year: true, series: true, correction: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    const totals = batches.reduce(
      (acc, b) => ({
        totalAnalyzed:  acc.totalAnalyzed  + b.totalAnalyzed,
        newCount:       acc.newCount       + b.newCount,
        similarCount:   acc.similarCount   + b.similarCount,
        duplicateCount: acc.duplicateCount + b.duplicateCount,
        errorCount:     acc.errorCount     + b.errorCount,
        rejectedCount:  acc.rejectedCount  + b.rejectedCount,
        importedCount:  acc.importedCount  + b.importedCount,
        withCorrection: acc.withCorrection + b.withCorrection,
      }),
      { totalAnalyzed:0, newCount:0, similarCount:0, duplicateCount:0, errorCount:0, rejectedCount:0, importedCount:0, withCorrection:0 }
    );
    return { batches, totals };
  }

  // ─── Batch import ───────────────────────────────────────────────────────────
  async importBatch(items: Array<{
    title: string; type: string; subject: string; year?: number;
    series?: string; university?: string; faculty?: string; niveau?: string;
    duration?: number; content?: any; contentHash?: string;
  }>, batchStats?: {
    totalAnalyzed: number; newCount: number; similarCount: number;
    duplicateCount: number; errorCount: number; rejectedCount: number;
  }, country = 'BF') {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Créer le lot d'abord pour avoir son ID (importedCount mis à jour après)
    const batch = await this.prisma.importBatch.create({
      data: {
        totalAnalyzed:  batchStats?.totalAnalyzed  ?? items.length,
        newCount:       batchStats?.newCount       ?? 0,
        similarCount:   batchStats?.similarCount   ?? 0,
        duplicateCount: batchStats?.duplicateCount ?? 0,
        errorCount:     batchStats?.errorCount     ?? 0,
        rejectedCount:  batchStats?.rejectedCount  ?? 0,
        importedCount:  0,   // mis à jour à la fin
        withCorrection: 0,   // mis à jour à la fin
      },
    });

    // Appels Claude en parallèle (5 à la fois max pour éviter le rate-limit)
    const CONCURRENCY = 5;
    const results: any[] = [];
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const chunk = items.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(chunk.map(async (item) => {
        let correction: any = null;
        const correctionInput = item.content?.fullContent;
        if (correctionInput && apiKey) {
          try {
            const anthropic = new Anthropic({ apiKey });
            const { system: corrSystem, user: corrUser } = buildCorrectionPrompt(
              item.subject, item.type, item.series ?? null, correctionInput.slice(0, 14000),
            );
            const corrMsg = await anthropic.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 6000,
              system: corrSystem,
              messages: [{ role: 'user', content: corrUser }],
            }, { timeout: 120000 });
            const corrText = ((corrMsg.content[0] as any).text as string).trim();
            if (corrText.length > 50) {
              correction = { fullCorrection: corrText, generatedAt: new Date().toISOString(), model: 'claude-sonnet-4-6' };
            }
          } catch { /* skip correction */ }
        }

        // Canonicalise la faculté : cherche une entrée ExamConfig existante (casse ignorée) POUR CETTE UNIVERSITÉ
        // pour éviter de créer des doublons et assurer la cohérence des noms
        const rawFaculty = item.faculty?.trim() || null;
        const canonicalUniversity = normalizeUniversity(item.university);
        let canonicalFaculty: string | null = rawFaculty;
        if (rawFaculty && canonicalUniversity !== 'NONE') {
          const candidates = await this.prisma.examConfig.findMany({
            where: { category: 'faculty', value: { equals: rawFaculty, mode: 'insensitive' } },
          });
          // Priorité : entrée scoped à cette université, puis entrée globale (sans extra.university)
          const scopedMatch = candidates.find(c => (c.extra as any)?.university === canonicalUniversity);
          const globalMatch = candidates.find(c => !(c.extra as any)?.university);
          const best = scopedMatch ?? globalMatch;
          if (best) canonicalFaculty = best.value;
        }

        const exam = await this.prisma.exam.create({
          data: {
            title: item.title,
            type: item.type,
            subject: item.subject,
            year: item.year ?? new Date().getFullYear(),
            series: item.series ?? null,
            university: normalizeUniversity(item.university),
            faculty: canonicalFaculty,
            niveau: item.niveau ?? null,
            duration: item.duration ?? null,
            content: item.content ?? undefined,
            correction,
            contentHash: item.contentHash ?? null,
            isPublished: true,
            country,
            importBatchId: batch.id,
          },
        });
        // Retourner uniquement les champs essentiels (pas content/correction pour alléger la réponse)
        return {
          exam: {
            id: exam.id,
            title: exam.title,
            type: exam.type,
            subject: exam.subject,
            year: exam.year,
            series: exam.series,
            university: exam.university,
            faculty: exam.faculty,
            niveau: exam.niveau,
            country: exam.country,
            isPublished: exam.isPublished,
          },
          hasCorrection: !!correction,
        };
      }));
      results.push(...chunkResults);
    }

    // Mettre à jour les compteurs réels du lot
    await this.prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        importedCount:  results.length,
        withCorrection: results.filter(r => r.hasCorrection).length,
      },
    });

    // Synchroniser l'ExamConfig pour que tous les nouveaux types/universités
    // apparaissent automatiquement dans la navigation étudiante
    await this.syncExamConfigFromImport(results.map(r => r.exam));

    return results;
  }

  /** Crée les entrées ExamConfig manquantes pour les valeurs extraites par Claude.
   *  La vérification est insensible à la casse pour éviter les doublons de type
   *  "UFR Sciences Économiques" / "UFR Sciences économiques". */
  private async syncExamConfigFromImport(exams: Array<{
    type: string; university?: string | null; series?: string | null;
    faculty?: string | null; niveau?: string | null;
  }>) {
    const SCHOOL_TYPES = ['COMPOSITION', 'DEVOIR'];
    // Les concours stockent leur institution (GN, ENAM…) dans university
    // mais ne doivent PAS apparaître dans l'onglet Universités
    const CONCOURS_TYPES = ['CONCOURS_FP', 'PMK'];
    const toCreate: Array<{ category: string; value: string; label: string; extra?: Record<string, any> }> = [];

    for (const exam of exams) {
      if (exam.type && !exam.type.startsWith('CUSTOM_') && !SCHOOL_TYPES.includes(exam.type)) {
        toCreate.push({ category: 'examType', value: exam.type, label: exam.type });
      }
      // Ne pas ajouter les institutions de concours (GN, ENAM…) dans la catégorie university
      if (exam.university && exam.university !== 'NONE' && !SCHOOL_TYPES.includes(exam.type) && !CONCOURS_TYPES.includes(exam.type)) {
        toCreate.push({ category: 'university', value: exam.university, label: exam.university });
      }
      if (exam.series && exam.type === 'BAC') {
        toCreate.push({ category: 'bacSeries', value: exam.series, label: `Série ${exam.series}` });
      }
      if (exam.faculty && exam.university && exam.university !== 'NONE' && !SCHOOL_TYPES.includes(exam.type)) {
        // extra.university scope : la faculté n'est visible que pour cette université
        toCreate.push({ category: 'faculty', value: exam.faculty, label: exam.faculty, extra: { university: exam.university } });
      }
      if (exam.niveau) {
        toCreate.push({ category: 'niveau', value: exam.niveau, label: exam.niveau });
      }
    }

    // Dédupliquer par category+value+université exact avant de toucher la DB
    const unique = Array.from(
      new Map(toCreate.map(x => {
        const uniKey = x.extra?.university ?? '';
        return [`${x.category}:${x.value}:${uniKey}`, x];
      })).values()
    );

    for (const entry of unique) {
      const entryUniversity: string | undefined = entry.extra?.university;

      if (entry.category === 'faculty' && entryUniversity) {
        // Pour les facultés scopées : vérifier que cette université n'a pas déjà une entrée similaire
        const allForCategory = await this.prisma.examConfig.findMany({
          where: { category: 'faculty', value: { equals: entry.value, mode: 'insensitive' } },
        });
        const scopedMatch = allForCategory.find(c => (c.extra as any)?.university === entryUniversity);
        if (scopedMatch) continue; // déjà une faculté avec ce nom pour cette université
        // Créer avec le scope université
        await this.prisma.examConfig.create({
          data: { category: entry.category, value: entry.value, label: entry.label, extra: entry.extra },
        });
        continue;
      }

      // Pour les autres catégories : vérification exacte puis insensible à la casse
      const exactMatch = await this.prisma.examConfig.findUnique({
        where: { category_value: { category: entry.category, value: entry.value } },
      });
      if (exactMatch) continue;

      const caseInsensitiveMatch = await this.prisma.examConfig.findFirst({
        where: { category: entry.category, value: { equals: entry.value, mode: 'insensitive' } },
      });
      if (caseInsensitiveMatch) continue;

      await this.prisma.examConfig.create({
        data: { category: entry.category, value: entry.value, label: entry.label },
      });
    }
  }

  /**
   * Répare les facultés dupliquées dans ExamConfig et normalise les exams.
   * 1. Regroupe les entrées ExamConfig "faculty" en doublons (case-insensitive)
   * 2. Garde la valeur la plus ancienne (ou la plus longue) comme canonique
   * 3. Met à jour tous les exams qui pointaient vers un doublon
   * 4. Supprime les entrées ExamConfig dupliquées
   */
  async fixDuplicateFaculties() {
    const allFaculties = await this.prisma.examConfig.findMany({
      where: { category: 'faculty' },
      orderBy: { id: 'asc' }, // les plus anciens en premier → on les garde
    });

    // Regrouper par valeur normalisée (lowercase+trim)
    const groups = new Map<string, typeof allFaculties>();
    for (const fac of allFaculties) {
      const key = fac.value.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(fac);
    }

    let mergedGroups = 0;
    let examsUpdated = 0;
    const removedIds: string[] = [];

    for (const [, group] of groups) {
      if (group.length <= 1) continue; // pas de doublon

      // Canonique = le premier (le plus ancien), ou la valeur la plus longue (plus descriptive)
      const canonical = group.reduce((best, cur) =>
        cur.value.length > best.value.length ? cur : best
      );
      const duplicates = group.filter(f => f.id !== canonical.id);

      // Mettre à jour tous les exams qui utilisent une valeur dupliquée
      for (const dup of duplicates) {
        const updated = await this.prisma.exam.updateMany({
          where: { faculty: dup.value },
          data: { faculty: canonical.value },
        });
        examsUpdated += updated.count;
        removedIds.push(dup.id);
      }

      mergedGroups++;
    }

    // Supprimer les ExamConfig dupliqués (après avoir mis à jour les exams)
    if (removedIds.length > 0) {
      await this.prisma.examConfig.deleteMany({ where: { id: { in: removedIds } } });
    }

    return {
      groupsMerged: mergedGroups,
      duplicatesRemoved: removedIds.length,
      examsUpdated,
    };
  }

  /**
   * Corrige les épreuves existantes dont le champ university est mal normalisé
   * (ex: "none", "None", "null", " NONE ", "").
   * À appeler une fois via POST /admin/exams/fix-university pour migrer les données existantes.
   */
  async fixMalformedUniversity() {
    const exams = await this.prisma.exam.findMany({
      select: { id: true, university: true },
    });

    const toFix = exams.filter(e => {
      const normalized = normalizeUniversity(e.university);
      return normalized !== (e.university ?? 'NONE');
    });

    let fixed = 0;
    for (const exam of toFix) {
      await this.prisma.exam.update({
        where: { id: exam.id },
        data: { university: normalizeUniversity(exam.university) },
      });
      fixed++;
    }

    return { checked: exams.length, fixed };
  }
}
