/**
 * Script d'importation des sujets BEPC réels
 * Source: PDFs dans /home/dao-wakilou/Documents/Pédja/Sujets/
 *
 * Sujets importés:
 * - Mathématiques: BEPC 2012-2025 (1er et 2ème tour)
 * - SVT: BEPC 2015-2021
 * - Français: BEPC 2019 (1er tour)
 * - Physique-Chimie: BEPC 2025
 */

import { PrismaClient, DifficultyLevel } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const PROCESSED_DIR = path.join(__dirname, '../../Sujets/processed');

function readProcessedFile(subject: string, filename: string): string {
  const filePath = path.join(PROCESSED_DIR, subject, filename);
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch {
    console.warn(`  ⚠ Fichier non trouvé: ${filePath}`);
    return '';
  }
}

interface BepcExam {
  title: string;
  subject: string;
  year: number;
  tour: string;
  duration: number;
  difficulty: DifficultyLevel;
  tags: string[];
  contentFile: string;
  subjectDir: string;
  description: string;
}

// ============================================
// DÉFINITION DES EXAMENS
// ============================================

const mathsExams: BepcExam[] = [
  // 2012
  { year: 2012, tour: '1er', contentFile: 'bepc_maths_2012_1.txt' },
  { year: 2012, tour: '2ème', contentFile: 'bepc_maths_2012_2.txt' },
  // 2013
  { year: 2013, tour: '1er', contentFile: 'bepc_maths_2013_1.txt' },
  { year: 2013, tour: '2ème', contentFile: 'bepc_maths_2013_2.txt' },
  // 2014
  { year: 2014, tour: '1er', contentFile: 'bepc_maths_2014_1.txt' },
  { year: 2014, tour: '2ème', contentFile: 'bepc_maths_2014_2.txt' },
  // 2015
  { year: 2015, tour: '1er', contentFile: 'bepc_maths_2015_1.txt' },
  { year: 2015, tour: '2ème', contentFile: 'bepc_maths_2015_2.txt' },
  // 2016
  { year: 2016, tour: '1er', contentFile: 'bepc_maths_2016_1.txt' },
  { year: 2016, tour: '2ème', contentFile: 'bepc_maths_2016_2.txt' },
  // 2017
  { year: 2017, tour: '1er', contentFile: 'bepc_maths_2017_1.txt' },
  { year: 2017, tour: '2ème', contentFile: 'bepc_maths_2017_2.txt' },
  // 2018
  { year: 2018, tour: '1er', contentFile: 'bepc_maths_2018_1.txt' },
  { year: 2018, tour: '2ème', contentFile: 'bepc_maths_2018_2.txt' },
  // 2019
  { year: 2019, tour: '1er', contentFile: 'bepc_maths_2019_1.txt' },
  { year: 2019, tour: '2ème', contentFile: 'bepc_maths_2019_2.txt' },
  // 2020
  { year: 2020, tour: '1er', contentFile: 'bepc_maths_2020_1.txt' },
  { year: 2020, tour: '2ème', contentFile: 'bepc_maths_2020_2.txt' },
  // 2021
  { year: 2021, tour: '1er', contentFile: 'bepc_maths_2021_1.txt' },
  { year: 2021, tour: '2ème', contentFile: 'bepc_maths_2021_2.txt' },
  // 2022
  { year: 2022, tour: '1er', contentFile: 'bepc_maths_2022_1.txt' },
  { year: 2022, tour: '2ème', contentFile: 'bepc_maths_2022_2.txt' },
  // 2023
  { year: 2023, tour: '1er', contentFile: 'bepc_maths_2023_1.txt' },
  { year: 2023, tour: '2ème', contentFile: 'bepc_maths_2023_2.txt' },
  // 2024
  { year: 2024, tour: '1er', contentFile: 'bepc_maths_2024_1.txt' },
  { year: 2024, tour: '2ème', contentFile: 'bepc_maths_2024_2.txt' },
  // 2025
  { year: 2025, tour: '1er', contentFile: 'bepc_maths_2025_1.txt' },
].map((e) => ({
  ...e,
  title: `BEPC Mathématiques ${e.year} - ${e.tour} tour`,
  subject: 'Mathématiques',
  duration: 120,
  difficulty: DifficultyLevel.MEDIUM,
  tags: ['BEPC', 'Mathématiques', String(e.year), 'Collège', `${e.tour} tour`],
  subjectDir: 'maths',
  description: `Épreuve de mathématiques du BEPC, session ${e.year}, ${e.tour} tour. Coefficient 5, durée 2 heures. Source: recueil officiel Burkina Faso.`,
}));

const svtExams: BepcExam[] = [2015, 2016, 2017, 2018, 2019, 2020, 2021].map((year) => ({
  title: `BEPC SVT ${year}`,
  subject: 'Sciences de la Vie et de la Terre',
  year,
  tour: '1er',
  duration: 90,
  difficulty: DifficultyLevel.MEDIUM,
  tags: ['BEPC', 'SVT', 'Sciences', String(year), 'Collège'],
  contentFile: `bepc_svt_${year}.txt`,
  subjectDir: 'svt',
  description: `Épreuve de Sciences de la Vie et de la Terre du BEPC, session ${year}. Coefficient 3, durée 1h30. 2 sujets au choix. Source: MESFPT Burkina Faso.`,
}));

const francaisExams: BepcExam[] = [
  {
    title: 'BEPC Français 2019 - 1er tour',
    subject: 'Français',
    year: 2019,
    tour: '1er',
    duration: 150,
    difficulty: DifficultyLevel.MEDIUM,
    tags: ['BEPC', 'Français', '2019', 'Collège', '1er tour'],
    contentFile: 'bepc_francais_2019_1.txt',
    subjectDir: 'francais',
    description: 'Épreuve de français du BEPC, session 2019, 1er tour. Coefficient 4, durée 2h30. Texte + questions de langue + expression écrite. Source: MESFPT Burkina Faso.',
  },
];

const pcExams: BepcExam[] = [
  {
    title: 'BEPC Physique-Chimie 2025 - 1er tour',
    subject: 'Physique-Chimie',
    year: 2025,
    tour: '1er',
    duration: 90,
    difficulty: DifficultyLevel.MEDIUM,
    tags: ['BEPC', 'Physique', 'Chimie', '2025', 'Collège', '1er tour'],
    contentFile: 'bepc_pc_2025.txt',
    subjectDir: 'pc',
    description: 'Épreuve de Physique-Chimie du BEPC, session 2025, 1er tour. Coefficient 4, durée 1h30. Chimie (10 pts) + Physique (10 pts). Source: MESFPT/SG/DGECC_2025.',
  },
];

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Parse le texte brut en sections structurées
 */
function parseExamContent(rawText: string, subject: string): object {
  const lines = rawText.split('\n').filter((l) => l.trim());

  // Extraire durée et coefficient si présents
  const durationMatch = rawText.match(/Durée\s*:?\s*(\d+)\s*h(?:eure)?(?:s)?\s*(?:(\d+)\s*mn?)?/i);
  const coefMatch = rawText.match(/Coefficient\s*:?\s*(\d+)/i);

  // Détecter les sections principales
  const sections: Array<{ id: string; title: string; text: string }> = [];
  let currentSection = '';
  let currentTitle = '';
  const sectionTexts: string[] = [];

  for (const line of lines) {
    // Détecter en-têtes de sections (EXERCICE, PARTIE, CHIMIE, PHYSIQUE, etc.)
    if (
      /^(EXERCICE|PARTIE|CHIMIE|PHYSIQUE|PREMIÈRE PARTIE|DEUXIÈME PARTIE|PREMIÈRE|DEUXIÈME|I\.|II\.|III\.)/i.test(
        line.trim(),
      )
    ) {
      if (currentSection) {
        sections.push({
          id: `s${sections.length + 1}`,
          title: currentTitle,
          text: sectionTexts.join('\n'),
        });
        sectionTexts.length = 0;
      }
      currentTitle = line.trim();
      currentSection = line.trim();
    } else {
      sectionTexts.push(line);
    }
  }
  if (currentSection) {
    sections.push({
      id: `s${sections.length + 1}`,
      title: currentTitle,
      text: sectionTexts.join('\n'),
    });
  }

  return {
    // fullContent = champ attendu par le frontend (StructuredExamView)
    fullContent: rawText,
    rawText,
    subject,
    source: 'PDF_OFFICIEL_BURKINA_FASO',
    extractedAt: new Date().toISOString(),
    duration: durationMatch
      ? parseInt(durationMatch[1]) * 60 + (durationMatch[2] ? parseInt(durationMatch[2]) : 0)
      : null,
    coefficient: coefMatch ? parseInt(coefMatch[1]) : null,
    sections: sections.length > 0
      ? sections.map((s) => ({ ...s, content: s.text }))
      : [{ id: 's1', title: 'Contenu', content: rawText, text: rawText }],
  };
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log('📚 Importation des sujets BEPC réels...\n');

  const allExams = [...mathsExams, ...svtExams, ...francaisExams, ...pcExams];

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const exam of allExams) {
    try {
      // Vérifier si l'examen existe déjà (par titre unique)
      const existing = await prisma.exam.findFirst({
        where: {
          title: exam.title,
          type: 'BEPC',
          year: exam.year,
        },
      });

      if (existing) {
        console.log(`  ⏭ Déjà présent: ${exam.title}`);
        skipped++;
        continue;
      }

      // Lire le texte du fichier
      const rawText = readProcessedFile(exam.subjectDir, exam.contentFile);
      if (!rawText) {
        console.log(`  ⚠ Texte vide pour: ${exam.title}`);
        errors++;
        continue;
      }

      // Parser le contenu
      const content = parseExamContent(rawText, exam.subject);

      // Créer l'examen dans la DB
      await prisma.exam.create({
        data: {
          title: exam.title,
          type: 'BEPC',
          year: exam.year,
          subject: exam.subject,
          description: exam.description,
          difficulty: exam.difficulty,
          duration: exam.duration,
          tags: exam.tags,
          university: 'NONE',
          faculty: null,
          series: null,
          niveau: 'Collège',
          isPublished: true,
          totalQuestions: 0,
          content: content as any,
        },
      });

      console.log(`  ✅ Créé: ${exam.title}`);
      created++;
    } catch (err) {
      console.error(`  ❌ Erreur pour ${exam.title}:`, (err as Error).message);
      errors++;
    }
  }

  console.log(`\n📊 Résultat:`);
  console.log(`   ✅ Créés:   ${created}`);
  console.log(`   ⏭ Ignorés: ${skipped} (déjà présents)`);
  console.log(`   ❌ Erreurs: ${errors}`);
  console.log(`\n🎉 Importation terminée !`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur fatale:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
