import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateQuestionDto, UpdateQuestionDto } from '../dto/create-question.dto';
import { GenerateQuestionsDto } from '../dto/generate-questions.dto';

@Injectable()
export class AdminQuestionsService {
  private anthropic: Anthropic;

  constructor(private prisma: PrismaService) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async getAll(
    filters: { examId?: string; type?: string; difficulty?: string },
    page: number = 1,
    limit: number = 20,
  ) {
    const where: any = {
      ...(filters.examId && { examId: filters.examId }),
      ...(filters.type && { type: filters.type as any }),
      ...(filters.difficulty && { difficulty: filters.difficulty as any }),
    };

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: {
          exam: { select: { type: true, subject: true, series: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(dto: CreateQuestionDto) {
    const exam = await this.prisma.exam.findUnique({ where: { id: dto.examId } });
    if (!exam) {
      throw new NotFoundException(`Examen introuvable: ${dto.examId}`);
    }

    return this.prisma.question.create({
      data: {
        examId: dto.examId,
        content: dto.content,
        type: dto.type,
        options: dto.options ? dto.options : undefined,
        correctAnswer: dto.correctAnswer,
        explanation: dto.explanation,
        difficulty: dto.difficulty,
      },
      include: {
        exam: { select: { type: true, subject: true, series: true } },
      },
    });
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) {
      throw new NotFoundException(`Question introuvable: ${id}`);
    }

    return this.prisma.question.update({
      where: { id },
      data: {
        ...(dto.content && { content: dto.content }),
        ...(dto.type && { type: dto.type }),
        ...(dto.options !== undefined && { options: dto.options || undefined }),
        ...(dto.correctAnswer !== undefined && { correctAnswer: dto.correctAnswer }),
        ...(dto.explanation !== undefined && { explanation: dto.explanation }),
        ...(dto.difficulty && { difficulty: dto.difficulty }),
      },
    });
  }

  async delete(id: string) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) {
      throw new NotFoundException(`Question introuvable: ${id}`);
    }
    await this.prisma.question.delete({ where: { id } });
    return { success: true };
  }

  async generateWithAI(dto: GenerateQuestionsDto) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new BadRequestException('ANTHROPIC_API_KEY non configurée');
    }

    const typeLabels: Record<string, string> = {
      MULTIPLE_CHOICE: 'QCM (4 options A/B/C/D)',
      TRUE_FALSE: 'Vrai/Faux',
      SHORT_ANSWER: 'Question ouverte (réponse courte)',
      ESSAY: 'Calcul numérique (réponse numérique)',
    };

    const requestedTypes = dto.questionTypes
      .map((t) => typeLabels[t] || t)
      .join(', ');

    const difficultyLabels: Record<string, string> = {
      EASY: 'facile',
      MEDIUM: 'intermédiaire',
      HARD: 'difficile',
      EXPERT: 'expert',
    };

    const prompt = `Tu es un expert des programmes scolaires du Burkina Faso.

Génère exactement ${dto.count} questions de type ${requestedTypes} pour l'examen ${dto.examType}${dto.series ? ' série ' + dto.series : ''}, matière ${dto.subject}, niveau de difficulté ${difficultyLabels[dto.difficulty] || dto.difficulty}.

Les questions doivent être:
- Adaptées au programme officiel burkinabé
- Précises et sans ambiguïté
- En français correct

Réponds UNIQUEMENT avec un tableau JSON valide (sans markdown, sans explication), exactement dans ce format:
[
  {
    "content": "Texte complet de la question",
    "type": "MULTIPLE_CHOICE",
    "options": ["Réponse A", "Réponse B", "Réponse C", "Réponse D"],
    "correctAnswer": "A",
    "explanation": "Explication courte de la bonne réponse"
  }
]

Règles:
- Pour MULTIPLE_CHOICE: options = tableau de 4 éléments, correctAnswer = "A", "B", "C" ou "D"
- Pour TRUE_FALSE: options = null, correctAnswer = "true" ou "false"
- Pour SHORT_ANSWER: options = null, correctAnswer = la réponse attendue en texte court
- Pour ESSAY (calcul): options = null, correctAnswer = le résultat numérique sous forme de texte
- Alterne les types si plusieurs types sont demandés`;

    const message = await this.anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new BadRequestException('Réponse invalide de l\'IA');
    }

    let questions: any[];
    try {
      const text = content.text.trim();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Aucun JSON trouvé dans la réponse');
      }
      questions = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new BadRequestException(`Impossible de parser la réponse IA: ${e.message}`);
    }

    const validated = questions.map((q: any, index: number) => {
      if (!q.content || !q.type || !q.correctAnswer) {
        throw new BadRequestException(`Question ${index + 1} invalide: champs manquants`);
      }
      return {
        content: String(q.content),
        type: q.type,
        options: Array.isArray(q.options) ? q.options : null,
        correctAnswer: String(q.correctAnswer),
        explanation: q.explanation ? String(q.explanation) : null,
        difficulty: dto.difficulty,
      };
    });

    if (dto.saveDirectly && dto.examId) {
      const saved = await this.bulkCreate(
        validated.map((q) => ({ ...q, examId: dto.examId! })) as any[],
      );
      return saved;
    }

    return validated;
  }

  async bulkCreate(questions: any[]) {
    if (!questions.length) return [];

    const examId = questions[0].examId;
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException(`Examen introuvable: ${examId}`);
    }

    const created = await Promise.all(
      questions.map((q) =>
        this.prisma.question.create({
          data: {
            examId: q.examId,
            content: q.content,
            type: q.type,
            options: q.options ? q.options : undefined,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            difficulty: q.difficulty,
          },
        }),
      ),
    );

    return created;
  }
}
