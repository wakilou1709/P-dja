import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import Anthropic from '@anthropic-ai/sdk';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse/lib/pdf-parse');

async function extractTextWithOcr(filePath: string): Promise<string> {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pedja-ocr-'));
  try {
    // Convert all PDF pages to JPEG at 150 DPI — no page limit
    // 150 DPI gives 4575×6905px for giant 2196×3314pt scanned pages
    execSync(
      `pdftoppm -r 150 -jpeg "${filePath}" "${path.join(tmpDir, 'page')}"`,
      { timeout: 120000, maxBuffer: 300 * 1024 * 1024 },
    );

    const images = fs.readdirSync(tmpDir)
      .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'))
      .sort();

    if (images.length === 0) return '';

    const texts: string[] = [];
    for (const img of images) {
      const imgPath = path.join(tmpDir, img);

      // Get image height — tall images (> 1500px) must be tiled before OCR
      // Tesseract reads only the top portion of very tall images
      let imgWidth = 0;
      let imgHeight = 0;
      try {
        const dims = execSync(`identify -format "%wx%h" "${imgPath}"`, { timeout: 5000 })
          .toString().trim();
        const parts = dims.split('x').map(Number);
        imgWidth = parts[0] || 0;
        imgHeight = parts[1] || 0;
      } catch { /* use full image */ }

      const STRIP_HEIGHT = 1100; // px — approx 1 exam page at 150 DPI
      const stripImages: string[] = [];

      if (imgHeight > STRIP_HEIGHT * 1.5 && imgWidth > 0) {
        // Tile the tall image into horizontal strips
        const nStrips = Math.ceil(imgHeight / STRIP_HEIGHT);
        for (let i = 0; i < nStrips; i++) {
          const y = i * STRIP_HEIGHT;
          const stripPath = path.join(tmpDir, `${img}_strip${i}.jpg`);
          try {
            execSync(
              `convert "${imgPath}" -crop ${imgWidth}x${STRIP_HEIGHT}+0+${y} +repage "${stripPath}"`,
              { timeout: 20000 },
            );
            stripImages.push(stripPath);
          } catch { /* skip strip */ }
        }
      } else {
        stripImages.push(imgPath);
      }

      // OCR each image/strip
      for (const imgToOcr of stripImages) {
        const outBase = `${imgToOcr}_out`;
        try {
          execSync(`tesseract "${imgToOcr}" "${outBase}" -l fra+eng --psm 3`, {
            timeout: 90000,
            maxBuffer: 10 * 1024 * 1024,
          });
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

  // 3. OCR with tesseract (for scanned PDFs)
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

function buildCorrectionPrompt(subject: string, type: string, series: string, fullContent: string): string {
  return `Tu es un professeur expert en ${subject} (niveau ${type} série ${series || 'N/A'}) au Burkina Faso.
Voici le texte complet d'une épreuve d'examen.
Tu dois générer la correction officielle et détaillée de cette épreuve.

RÈGLES :
- Résous chaque question/sous-question avec les étapes détaillées
- Pour les calculs: montre les formules utilisées, les substitutions et le résultat
- Respecte les numérotations exactes de l'épreuve (1-1, 1-2, a, b, c...)
- Sois précis et pédagogique
- Utilise les mêmes unités que l'épreuve originale

Retourne un JSON avec cette structure :
{
  "fullCorrection": "Texte formaté de la correction complète avec toutes les sections et questions...",
  "sections": [
    {
      "title": "EXERCICE I (ou le titre exact de la section)",
      "questions": [
        {
          "number": "1-1",
          "answer": "Réponse complète avec étapes"
        }
      ]
    }
  ]
}

Le fullCorrection doit être un texte structuré lisible, comme un corrigé officiel formaté.
Utilise des marqueurs comme "PARTIE I :", "Question 1 :", "→ Réponse :", etc.

ÉPREUVE À CORRIGER :
---
${fullContent.slice(0, 12000)}
---

Retourne UNIQUEMENT le JSON, sans texte autour.`;
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
      orderBy: {
        viewCount: 'desc',
      },
      take: limit,
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
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
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 6000,
      messages: [{
        role: 'user',
        content: buildCorrectionPrompt(exam.subject, exam.type, exam.series ?? '', content.fullContent),
      }],
    });

    const responseText = (message.content[0] as any).text as string;
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) throw new InternalServerErrorException('Réponse IA invalide — pas de JSON détecté');

    let correction: any;
    try {
      correction = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
    } catch {
      throw new InternalServerErrorException('Impossible de parser la réponse IA');
    }

    const result = {
      ...correction,
      generatedAt: new Date().toISOString(),
      model: 'claude-haiku-4-5-20251001',
    };

    await this.prisma.exam.update({ where: { id: examId }, data: { correction: result } });
    return result;
  }

  async extractAndStructurePdf(file: Express.Multer.File) {
    try {
      // 1. Extract text (pdftotext → pdf-parse → OCR fallback)
      const rawText = await extractTextFromPdf(file.path);
      const isScanned = !rawText || rawText.trim().length < 50;

      if (isScanned) {
        return {
          pdfUrl: `/uploads/${file.filename}`,
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
${rawText.slice(0, 12000)}
---`;

          const message = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }],
          });

          const responseText = (message.content[0] as any).text as string;
          // Extract JSON — strip any accidental markdown fences
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.sections !== undefined) {
              structured = {
                ...parsed,
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
          const corrMsg = await correctionAnthopic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 6000,
            messages: [{
              role: 'user',
              content: buildCorrectionPrompt('', '', '', structured.fullContent),
            }],
          });
          const corrText = (corrMsg.content[0] as any).text as string;
          const jsonMatch = corrText.match(/```json\s*([\s\S]*?)\s*```/) || corrText.match(/(\{[\s\S]*\})/);
          if (jsonMatch) {
            correction = {
              ...JSON.parse(jsonMatch[1] ?? jsonMatch[0]),
              generatedAt: new Date().toISOString(),
              model: 'claude-haiku-4-5-20251001',
            };
          }
        } catch { /* correction generation failed — not blocking */ }
      }

      return {
        pdfUrl: `/uploads/${file.filename}`,
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
}
