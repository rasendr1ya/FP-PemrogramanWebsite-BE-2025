/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import {
  ErrorResponse,
  type IMathGeneratorJson,
  type IMathQuestion,
  prisma,
} from '@/common';
import { FileManager } from '@/utils';

import {
  type ICheckMathAnswer,
  type ICreateMathGenerator,
  type IUpdateMathGenerator,
} from './schema';

export abstract class MathGeneratorService {
  private static readonly slug = 'math-generator';

  static async createGame(data: ICreateMathGenerator, user_id: string) {
    const exist = await prisma.games.findUnique({ where: { name: data.name } });

    if (exist) {
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game name already exists',
      );
    }

    const template = await prisma.gameTemplates.findUnique({
      where: { slug: this.slug },
    });

    if (!template) {
      throw new ErrorResponse(
        StatusCodes.NOT_FOUND,
        'Template not found. Run seed!',
      );
    }

    const generatedQuestions = this.generateQuestions(
      data.operation,
      data.difficulty,
      data.question_count,
    );

    const newGameId = v4();

    let thumbnailPath = '';

    if (data.thumbnail_image) {
      thumbnailPath = await FileManager.upload(
        `game/math/${newGameId}`,
        data.thumbnail_image,
      );
    }

    const gameJson: IMathGeneratorJson = {
      settings: {
        operation: data.operation,
        difficulty: data.difficulty,
        game_type: data.game_type,
        theme: data.theme,
        question_count: data.question_count,
      },
      score_per_question: data.score_per_question,
      questions: generatedQuestions,
    };

    return await prisma.games.create({
      data: {
        id: newGameId,
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailPath,
        is_published: data.is_publish_immediately,
        creator_id: user_id,
        game_template_id: template.id,
        game_json: gameJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        game_template: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  static async getGamePlay(
    game_id: string,
    is_public: boolean,
    user_id?: string,
    role?: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      include: { game_template: true },
    });

    if (!game || game.game_template.slug !== this.slug)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    if (is_public && !game.is_published)
      throw new ErrorResponse(StatusCodes.FORBIDDEN, 'Game is not published');

    if (!is_public && role !== 'SUPER_ADMIN' && game.creator_id !== user_id) {
      throw new ErrorResponse(StatusCodes.FORBIDDEN, 'Access denied');
    }

    const json = game.game_json as unknown as IMathGeneratorJson;

    const cleanQuestions = json.questions.map((q, index) => ({
      index,
      question: q.question,
      options: q.options,
    }));

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      settings: json.settings,
      score_per_question: json.score_per_question,
      questions: cleanQuestions,
    };
  }

  static async checkAnswer(game_id: string, data: ICheckMathAnswer) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      include: { game_template: true },
    });

    if (!game) throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (!game.game_template || game.game_template.slug !== this.slug) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    const json = game.game_json as unknown as IMathGeneratorJson;
    let correctCount = 0;

    const results = data.answers.map(ans => {
      const actualQuestion = json.questions[ans.question_index];

      if (!actualQuestion)
        return {
          question_index: ans.question_index,
          is_correct: false,
          invalid_answer: false,
        };

      const selectedNumber = Number(ans.selected_answer);
      let isCorrect = false;
      let isInvalidAnswer = false;

      if (Number.isNaN(selectedNumber)) {
        isInvalidAnswer = true;
      } else {
        isCorrect = selectedNumber === actualQuestion.answer;
        if (isCorrect) correctCount++;
      }

      return {
        question_index: ans.question_index,
        is_correct: isCorrect,
        invalid_answer: isInvalidAnswer,
        correct_answer: actualQuestion.answer,
      };
    });

    const maxScore = json.questions.length * json.score_per_question;
    const score =
      json.questions.length > 0
        ? (correctCount / json.questions.length) * maxScore
        : 0;

    return {
      score,
      correct_count: correctCount,
      max_score: maxScore,
      results,
    };
  }

  private static generateQuestions(
    operation:
      | 'addition'
      | 'subtraction'
      | 'multiplication'
      | 'division'
      | 'random',
    difficulty: 'easy' | 'medium' | 'hard',
    count: number,
  ): IMathQuestion[] {
    const questions: IMathQuestion[] = [];

    let range = 10;

    if (difficulty === 'medium') {
      range = 20;
    } else if (difficulty === 'hard') {
      range = 50;
    }

    const operations = [
      'addition',
      'subtraction',
      'multiplication',
      'division',
    ];

    for (let index = 0; index < count; index++) {
      const a = Math.floor(Math.random() * range) + 1;
      const b = Math.floor(Math.random() * range) + 1;

      let question = '';

      let answer = 0;

      const currentOperation =
        operation === 'random'
          ? operations[Math.floor(Math.random() * operations.length)]
          : operation;

      switch (currentOperation) {
        case 'addition': {
          question = `${a} + ${b}`;
          answer = a + b;

          break;
        }

        case 'subtraction': {
          question = `${Math.max(a, b)} - ${Math.min(a, b)}`;
          answer = Math.max(a, b) - Math.min(a, b);

          break;
        }

        case 'multiplication': {
          const mult1 = Math.floor(Math.random() * 12) + 1;
          const mult2 = Math.floor(Math.random() * 12) + 1;
          question = `${mult1} × ${mult2}`;
          answer = mult1 * mult2;

          break;
        }

        case 'division': {
          const divisor = Math.floor(Math.random() * 12) + 1;
          const quotient = Math.floor(Math.random() * 12) + 1;
          const dividend = divisor * quotient;
          question = `${dividend} ÷ ${divisor}`;
          answer = quotient;

          break;
        }

        default: {
          question = `${a} + ${b}`;
          answer = a + b;
        }
      }

      const options = [answer];

      while (options.length < 4) {
        let wrongAnswer: number;
        let safety = 0;

        do {
          const offset = Math.floor(Math.random() * 10) + 1;
          wrongAnswer =
            answer > offset && Math.random() < 0.5
              ? answer - offset
              : answer + offset;
          safety++;
        } while (
          (wrongAnswer <= 0 || options.includes(wrongAnswer)) &&
          safety < 50
        );

        if (safety >= 50) {
          wrongAnswer = answer + 1;

          while (options.includes(wrongAnswer) || wrongAnswer <= 0) {
            wrongAnswer++;
          }
        }

        options.push(wrongAnswer);
      }

      options.sort(() => Math.random() - 0.5);

      questions.push({ question, answer, options });
    }

    return questions;
  }

  static async getGameDetail(game_id: string, user_id: string, role: ROLE) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      include: {
        game_template: true,
        _count: { select: { liked: true } },
      },
    });

    if (!game || game.game_template.slug !== this.slug) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    if (role !== 'SUPER_ADMIN' && game.creator_id !== user_id) {
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You do not have permission to view this game',
      );
    }

    const json = game.game_json as unknown as IMathGeneratorJson;

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      is_published: game.is_published,
      creator_id: game.creator_id,
      settings: json.settings,
      score_per_question: json.score_per_question,
      total_played: game.total_played,
      liked_by_count: game._count.liked,
      created_at: game.created_at,
      updated_at: game.updated_at,
    };
  }

  static async updateGame(
    game_id: string,
    data: IUpdateMathGenerator,
    user_id: string,
    role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      include: { game_template: true },
    });

    if (!game || game.game_template.slug !== this.slug) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    if (role !== 'SUPER_ADMIN' && game.creator_id !== user_id) {
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You do not have permission to update this game',
      );
    }

    if (data.name && data.name !== game.name) {
      const exist = await prisma.games.findUnique({
        where: { name: data.name },
      });

      if (exist) {
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Game name already exists',
        );
      }
    }

    const currentJson = game.game_json as unknown as IMathGeneratorJson;
    let newJson = { ...currentJson };

    const isSettingsChanged =
      data.operation !== undefined ||
      data.difficulty !== undefined ||
      data.question_count !== undefined;

    if (isSettingsChanged) {
      const newSettings = {
        operation: data.operation ?? currentJson.settings.operation,
        difficulty: data.difficulty ?? currentJson.settings.difficulty,
        game_type: data.game_type ?? currentJson.settings.game_type,
        theme: data.theme ?? currentJson.settings.theme,
        question_count:
          data.question_count ?? currentJson.settings.question_count,
      };

      const generatedQuestions = this.generateQuestions(
        newSettings.operation,
        newSettings.difficulty,
        newSettings.question_count,
      );

      newJson = {
        settings: newSettings,
        score_per_question:
          data.score_per_question ?? currentJson.score_per_question,
        questions: generatedQuestions,
      };
    } else {
      if (data.game_type !== undefined) {
        newJson.settings.game_type = data.game_type;
      }

      if (data.theme !== undefined) {
        newJson.settings.theme = data.theme;
      }

      if (data.score_per_question !== undefined) {
        newJson.score_per_question = data.score_per_question;
      }
    }

    let thumbnailPath = game.thumbnail_image;

    if (data.thumbnail_image) {
      if (game.thumbnail_image) {
        await FileManager.remove(game.thumbnail_image);
      }

      thumbnailPath = await FileManager.upload(
        `game/math/${game_id}`,
        data.thumbnail_image,
      );
    }

    const updateData: Prisma.GamesUpdateInput = {
      game_json: newJson as unknown as Prisma.InputJsonValue,
      thumbnail_image: thumbnailPath,
      updated_at: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.is_publish !== undefined)
      updateData.is_published = data.is_publish;

    await prisma.games.update({
      where: { id: game_id },
      data: updateData,
    });

    return { id: game_id, updated: true };
  }

  static async deleteGame(game_id: string, user_id: string, role: ROLE) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      include: { game_template: true },
    });

    if (!game || game.game_template.slug !== this.slug) {
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
    }

    if (role !== 'SUPER_ADMIN' && game.creator_id !== user_id) {
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'You do not have permission to delete this game',
      );
    }

    if (game.thumbnail_image) {
      await FileManager.remove(game.thumbnail_image);
    }

    await prisma.games.delete({ where: { id: game_id } });

    return { id: game_id, deleted: true };
  }
}
