import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { QuizService } from './quiz.service';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Controller('quiz')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Get('questions')
  @ApiOperation({ summary: 'Get questions for a quiz (without correct answers)' })
  async getQuestions(@Query() query: StartQuizDto) {
    return this.quizService.getQuestions(query);
  }

  @Post('attempts')
  @ApiOperation({ summary: 'Start a new quiz attempt' })
  async startAttempt(@Request() req, @Body() dto: StartQuizDto) {
    return this.quizService.startAttempt(req.user.sub, dto);
  }

  @Post('attempts/:id/submit')
  @ApiOperation({ summary: 'Submit quiz attempt answers' })
  async submitAttempt(
    @Request() req,
    @Param('id') attemptId: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    return this.quizService.submitAttempt(req.user.sub, attemptId, dto);
  }

  @Get('attempts/my')
  @ApiOperation({ summary: 'Get my quiz attempts history' })
  async getMyAttempts(@Request() req) {
    return this.quizService.getMyAttempts(req.user.sub);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Get my progress by subject' })
  async getMyProgress(@Request() req) {
    return this.quizService.getMyProgress(req.user.sub);
  }
}
