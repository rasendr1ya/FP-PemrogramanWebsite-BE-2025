import { type Prisma } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import {
  ErrorResponse,
  type ITypeTheAnswerJson,
  prisma,
  type ROLE,
} from '@/common';
import { FileManager } from '@/utils';

import {
  type ICheckTypeTheAnswer,
  type ICreateTypeTheAnswer,
  type IUpdateTypeTheAnswer,
} from './schema';

export abstract class TypeTheAnswerService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static TYPE_THE_ANSWER_SLUG = 'type-the-answer';

  static async createTypeTheAnswer(
    data: ICreateTypeTheAnswer,
    user_id: string,
  ) {
    await this.existGameCheck(data.name);

    const newGameId = v4();
    const templateId = await this.getGameTemplateId();

    const thumbnailImagePath = await FileManager.upload(
      `game/type-the-answer/${newGameId}`,
      data.thumbnail_image,
    );

    const gameJson: ITypeTheAnswerJson = {
      time_limit_seconds: data.time_limit_seconds,
      score_per_question: data.score_per_question,
      questions: data.questions.map(question => ({
        question_text: question.question_text,
        correct_answer: question.correct_answer,
      })),
    };

    const newGame = await prisma.games.create({
      data: {
        id: newGameId,
        game_template_id: templateId,
        creator_id: user_id,
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_publish_immediately,
        game_json: gameJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    return newGame;
  }

  static async getTypeTheAnswerGameDetail(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnail_image: true,
        is_published: true,
        created_at: true,
        game_json: true,
        creator_id: true,
        total_played: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.TYPE_THE_ANSWER_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot access this game',
      );

    const gameJson = game.game_json as ITypeTheAnswerJson | null;

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      is_published: game.is_published,
      created_at: game.created_at,
      total_played: game.total_played,
      time_limit_seconds: gameJson?.time_limit_seconds ?? 60,
      score_per_question: gameJson?.score_per_question ?? 10,
      questions: gameJson?.questions ?? [],
    };
  }

  static async updateTypeTheAnswer(
    data: IUpdateTypeTheAnswer,
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnail_image: true,
        is_published: true,
        game_json: true,
        creator_id: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.TYPE_THE_ANSWER_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot access this game',
      );

    if (data.name) {
      const isNameExist = await prisma.games.findUnique({
        where: { name: data.name },
        select: { id: true },
      });

      if (isNameExist && isNameExist.id !== game_id)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          'Game name is already used',
        );
    }

    const oldGameJson = game.game_json as ITypeTheAnswerJson | null;

    let newThumbnailPath = game.thumbnail_image;

    if (data.thumbnail_image) {
      await FileManager.remove(game.thumbnail_image);
      newThumbnailPath = await FileManager.upload(
        `game/type-the-answer/${game_id}`,
        data.thumbnail_image,
      );
    }

    const newGameJson: ITypeTheAnswerJson = {
      time_limit_seconds:
        data.time_limit_seconds ?? oldGameJson?.time_limit_seconds ?? 60,
      score_per_question:
        data.score_per_question ?? oldGameJson?.score_per_question ?? 10,
      questions: data.questions
        ? data.questions.map(q => ({
            question_text: q.question_text,
            correct_answer: q.correct_answer,
          }))
        : (oldGameJson?.questions ?? []),
    };

    const updatedGame = await prisma.games.update({
      where: { id: game_id },
      data: {
        name: data.name ?? game.name,
        description: data.description ?? game.description,
        thumbnail_image: newThumbnailPath,
        is_published: data.is_publish ?? game.is_published,
        game_json: newGameJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    return updatedGame;
  }

  static async deleteTypeTheAnswer(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        thumbnail_image: true,
        creator_id: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.TYPE_THE_ANSWER_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot delete this game',
      );

    await FileManager.remove(game.thumbnail_image);

    await prisma.games.delete({
      where: { id: game_id },
    });

    return { id: game_id };
  }

  static async getTypeTheAnswerPlay(
    game_id: string,
    is_public: boolean,
    user_id?: string,
    user_role?: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnail_image: true,
        is_published: true,
        game_json: true,
        creator_id: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (
      !game ||
      (is_public && !game.is_published) ||
      game.game_template.slug !== this.TYPE_THE_ANSWER_SLUG
    )
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (
      !is_public &&
      user_role !== 'SUPER_ADMIN' &&
      game.creator_id !== user_id
    )
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot get this game data',
      );

    const gameJson = game.game_json as ITypeTheAnswerJson;

    const questionsWithIndex = (gameJson.questions ?? []).map(
      (q, question_index) => ({
        question_index,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
      }),
    );

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      is_published: game.is_published,
      time_limit_seconds: gameJson.time_limit_seconds,
      score_per_question: gameJson.score_per_question,
      questions: questionsWithIndex,
    };
  }

  static async checkAnswer(data: ICheckTypeTheAnswer, game_id: string) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        is_published: true,
        game_json: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.TYPE_THE_ANSWER_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (!game.is_published)
      throw new ErrorResponse(StatusCodes.FORBIDDEN, 'Game is not published');

    const gameJson = game.game_json as ITypeTheAnswerJson;

    let correctCount = 0;
    const results = data.answers.map(answer => {
      const question = gameJson.questions[answer.question_index];
      if (!question)
        return { question_index: answer.question_index, is_correct: false };

      const isCorrect =
        question.correct_answer.toLowerCase().trim() ===
        answer.user_answer.toLowerCase().trim();

      if (isCorrect) correctCount++;

      return {
        question_index: answer.question_index,
        is_correct: isCorrect,
      };
    });

    const totalQuestions = gameJson.questions.length;
    const score = correctCount * gameJson.score_per_question;
    const percentage = (correctCount / totalQuestions) * 100;

    return {
      score,
      correct_count: correctCount,
      total_questions: totalQuestions,
      percentage: Math.round(percentage * 100) / 100,
      results,
    };
  }

  private static async existGameCheck(name: string) {
    const existingGame = await prisma.games.findUnique({
      where: { name },
      select: { id: true },
    });

    if (existingGame)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game name is already used',
      );
  }

  private static async getGameTemplateId() {
    const template = await prisma.gameTemplates.findUnique({
      where: { slug: this.TYPE_THE_ANSWER_SLUG },
      select: { id: true },
    });

    if (!template)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game template not found');

    return template.id;
  }
}
