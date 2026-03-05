/**
 * Script de nettoyage OCR par Claude AI
 *
 * Pour chaque épreuve BEPC en base, envoie le texte brut OCR à Claude
 * qui reconstruit les expressions mathématiques, supprime les artefacts
 * de scanner et rend le texte lisible.
 *
 * Usage:
 *   ts-node scripts/clean-ocr.ts              (traite tout)
 *   ts-node scripts/clean-ocr.ts --dry-run    (affiche sans sauvegarder)
 *   ts-node scripts/clean-ocr.ts --id <uuid>  (un seul examen)
 */

import Anthropic from '@anthropic-ai/sdk';
import { PrismaClient } from '@prisma/client';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DRY_RUN = process.argv.includes('--dry-run');
const SINGLE_ID = (() => {
  const i = process.argv.indexOf('--id');
  return i !== -1 ? process.argv[i + 1] : null;
})();

const SYSTEM_PROMPT = `Tu es un expert en correction de textes OCR d'examens scolaires du Burkina Faso (BEPC).
Tu reçois un texte extrait par OCR depuis un PDF scanné. Ce texte contient :
- Des fractions mathématiques éclatées sur plusieurs lignes (ex: "1" puis "5" séparément au lieu de "1/5")
- Des expressions mathématiques mal reconnues
- Des artefacts de scanner CamScanner (entêtes "=== PAGE ===", "CamScanner", "—", "yf", etc.)
- Des caractères parasites isolés
- Des tableaux mal alignés
- Des symboles Unicode mathématiques (𝑥, 𝑓, √, ℝ, etc.) que tu dois préserver tels quels

Ta tâche :
1. Supprimer tous les artefacts OCR (entêtes de page "=== PAGE ===", "CamScanner", caractères isolés parasites)
2. Reconstruire les fractions : si tu vois un nombre seul sur une ligne entouré de contexte mathématique, c'est probablement un numérateur/dénominateur d'une fraction (ex: "1\\n5" → "1/5")
3. Reconstruire les expressions mathématiques brisées sur plusieurs lignes en les regroupant logiquement
4. Corriger les mots mal reconnus (ex: "cee" → "α", "LS" → "agglutinogènes") en te basant sur le contexte scolaire
5. Préserver intégralement la structure du sujet : exercices, parties, numérotation, questions
6. Préserver les symboles Unicode mathématiques tels quels
7. Garder les séparateurs de page "────────────────────────────────" si présents

Retourne UNIQUEMENT le texte corrigé, sans commentaires, sans introduction, sans conclusion.`;

async function cleanOcrText(rawText: string, subject: string, title: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Matière : ${subject}\nÉpreuve : ${title}\n\n--- TEXTE OCR BRUT ---\n${rawText}\n--- FIN DU TEXTE ---`,
      },
    ],
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Réponse Claude inattendue');
  return block.text.trim();
}

async function main() {
  console.log(`🧹 Nettoyage OCR des épreuves BEPC${DRY_RUN ? ' (DRY RUN)' : ''}...\n`);

  const where: any = { type: 'BEPC' };
  if (SINGLE_ID) where.id = SINGLE_ID;

  const exams = await prisma.exam.findMany({
    where,
    select: { id: true, title: true, subject: true, content: true },
    orderBy: [{ subject: 'asc' }, { year: 'asc' }],
  });

  console.log(`📋 ${exams.length} épreuve(s) à traiter\n`);

  let done = 0, skipped = 0, errors = 0;

  for (const exam of exams) {
    const raw = exam.content as any;
    if (!raw?.rawText) {
      console.log(`  ⏭ Pas de rawText: ${exam.title}`);
      skipped++;
      continue;
    }

    // Déjà nettoyé ?
    if (raw?.cleaned === true && !SINGLE_ID) {
      console.log(`  ✓ Déjà nettoyé: ${exam.title}`);
      skipped++;
      continue;
    }

    process.stdout.write(`  🔄 ${exam.title}... `);

    try {
      const cleanedText = await cleanOcrText(raw.rawText, exam.subject, exam.title);

      if (DRY_RUN) {
        console.log(`\n--- APERÇU NETTOYÉ ---\n${cleanedText.slice(0, 400)}\n---\n`);
        done++;
        continue;
      }

      await prisma.exam.update({
        where: { id: exam.id },
        data: {
          content: {
            ...raw,
            fullContent: cleanedText,
            cleanedText,
            cleaned: true,
            cleanedAt: new Date().toISOString(),
          } as any,
        },
      });

      console.log(`✅ (${cleanedText.length} chars)`);
      done++;

      // Pause pour éviter le rate limiting
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.log(`❌ Erreur: ${(err as Error).message}`);
      errors++;
    }
  }

  console.log(`\n📊 Résultat:`);
  console.log(`   ✅ Nettoyés: ${done}`);
  console.log(`   ⏭ Ignorés:  ${skipped}`);
  console.log(`   ❌ Erreurs:  ${errors}`);
}

main()
  .catch(e => { console.error('Erreur fatale:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
