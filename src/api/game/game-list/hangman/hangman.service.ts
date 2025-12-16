import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import { ErrorResponse, type IHangmanJson, prisma } from '@/common';
import { FileManager, shuffleArray } from '@/utils';

import {
  type ICreateHangman,
  type ISaveGameResult,
  type IUpdateHangman,
} from './schema';

export abstract class HangmanService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static HANGMAN_SLUG = 'hangman';

  static async createHangman(data: ICreateHangman, user_id: string) {
    await this.existGameCheck(data.name);

    const newHangmanId = v4();
    const hangmanTemplateId = await this.getGameTemplateId();

    const thumbnailImagePath = await FileManager.upload(
      `game/hangman/${newHangmanId}`,
      data.thumbnail_image,
    );

    const hangmanJson: IHangmanJson = {
      score_per_question: data.score_per_question,
      is_question_shuffled: data.is_question_shuffled,
      questions: data.questions.map((question, index) => ({
        id: `question-${String(index + 1).padStart(3, '0')}`,
        question: question.question,
        answer: question.answer,
        order: index + 1,
      })),
    };

    const newGame = await prisma.games.create({
      data: {
        id: newHangmanId,
        game_template_id: hangmanTemplateId,
        creator_id: user_id,
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_publish_immediately,
        game_json: hangmanJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    return newGame;
  }

  static async getHangmanGameDetail(
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

    if (!game || game.game_template.slug !== this.HANGMAN_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot access this game',
      );

    return {
      ...game,
      creator_id: undefined,
      game_template: undefined,
    };
  }

  static async getHangmanGamePlay(
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
      game.game_template.slug !== this.HANGMAN_SLUG
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

    const gameJson = game.game_json as unknown as IHangmanJson | null;

    if (!gameJson)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game data not found');

    // Get creator username
    const creator = await prisma.users.findUnique({
      where: { id: game.creator_id },
      select: { username: true },
    });

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      creator_username: creator?.username || 'Unknown',
      is_published: game.is_published,
      questions: gameJson.is_question_shuffled
        ? shuffleArray(gameJson.questions ?? [])
        : (gameJson.questions ?? []),
    };
  }

  static async updateHangman(
    data: IUpdateHangman,
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

    if (!game || game.game_template.slug !== this.HANGMAN_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot update this game',
      );

    const oldHangmanJson = game.game_json as unknown as IHangmanJson | null;
    // oldImagePaths logic removed as per review

    let newThumbnailImagePath = game.thumbnail_image;

    if (data.thumbnail_image) {
      if (game.thumbnail_image) {
        // Delete old thumbnail if new one is being uploaded
        await FileManager.remove(game.thumbnail_image);
      }

      newThumbnailImagePath = await FileManager.upload(
        `game/hangman/${game_id}`,
        data.thumbnail_image,
      );
    }

    let shouldWipeLeaderboard = false;

    // Check if questions count changed
    if (
      data.questions &&
      oldHangmanJson?.questions &&
      data.questions.length !== oldHangmanJson.questions.length
    ) {
      shouldWipeLeaderboard = true;
    }

    // Check if score_per_question changed
    if (
      data.score_per_question &&
      oldHangmanJson?.score_per_question &&
      data.score_per_question !== oldHangmanJson.score_per_question
    ) {
      shouldWipeLeaderboard = true;
    }

    // Check if question details changed (question text or answer)
    if (data.questions && oldHangmanJson?.questions) {
      for (
        let index = 0;
        index <
        Math.min(data.questions.length, oldHangmanJson.questions.length);
        index++
      ) {
        if (
          data.questions[index].question !==
            oldHangmanJson.questions[index].question ||
          data.questions[index].answer !==
            oldHangmanJson.questions[index].answer
        ) {
          shouldWipeLeaderboard = true;
          break;
        }
      }
    }

    // Wipe leaderboard if needed
    if (shouldWipeLeaderboard) {
      await prisma.leaderboard.deleteMany({
        where: { game_id },
      });
    }

    const hangmanJson: IHangmanJson = {
      score_per_question:
        data.score_per_question ?? oldHangmanJson?.score_per_question ?? 10,
      is_question_shuffled:
        data.is_question_shuffled === undefined
          ? (oldHangmanJson?.is_question_shuffled ?? false)
          : Boolean(data.is_question_shuffled),
      questions:
        data.questions?.map((question, index) => ({
          id: `question-${String(index + 1).padStart(3, '0')}`,
          question: question.question,
          answer: question.answer,
          order: index + 1,
        })) ??
        oldHangmanJson?.questions ??
        [],
    };

    const updatedGame = await prisma.games.update({
      where: { id: game_id },
      data: {
        name: data.name ?? game.name,
        description: data.description ?? game.description,
        thumbnail_image: newThumbnailImagePath,
        is_published: data.is_publish ?? game.is_published,
        game_json: hangmanJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    // Delete old images
    // Redundant deletion Logic removed

    return updatedGame;
  }

  static async deleteHangman(
    game_id: string,
    user_id: string,
    user_role: ROLE,
  ) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        thumbnail_image: true,
        game_json: true,
        creator_id: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.HANGMAN_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot delete this game',
      );

    // oldHangmanJson is not required in delete flow; remove unused variable to satisfy linter
    const oldImagePaths: string[] = [];

    if (game.thumbnail_image) oldImagePaths.push(game.thumbnail_image);

    // Defensive deletion: Delete related records explicitly in case DB Cascade is missing
    await prisma.leaderboard.deleteMany({ where: { game_id } });
    await prisma.likedGames.deleteMany({ where: { game_id } });

    await prisma.games.delete({ where: { id: game_id } });

    // Delete images
    for (const path of oldImagePaths) {
      await FileManager.remove(path);
    }

    return { id: game_id };
  }

  /**
   * Save game result - only for completed games
   * leaderboard hanya untuk yang menyelesaikan semua soal (game completed)
   */
  static async saveGameResult(
    game_id: string,
    data: ISaveGameResult,
    user_id?: string,
  ) {
    // Verify game exists
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.HANGMAN_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    // Only save if score > 0
    if (data.score <= 0) {
      // We can return a mock success or null, but the controller expects an object with id etc.
      // However, if we don't save, we shouldn't return a new ID.
      // Let's return a dummy or throw? Better just strictly return null/undefined and handle in controller?
      // Or better: just don't save, but return a "phantom" result to not break frontend.
      // But Requirement is "Score harus > 0 agar bisa masuk leaderboard".
      // Let's throw an error or just return early.
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Score must be greater than 0 to be recorded',
      );
    }

    if (!user_id) {
      // Anonymous user logic: Just create (or maybe we shouldn't save for anonymous?)
      // Requirement says "satu user satu leaderboard". Anonymous usually implies no persistence or specific handling.
      // For now, let's keep creating for anonymous but standard best effort for auth users.
      const leaderboardEntry = await prisma.leaderboard.create({
        data: {
          game_id,
          user_id: null,
          score: data.score,
          time_taken: data.time_taken,
        },
        select: {
          id: true,
          score: true,
          time_taken: true,
          created_at: true,
        },
      });

      return leaderboardEntry;
    }

    // Check existing entry for this user
    const existingEntry = await prisma.leaderboard.findFirst({
      where: {
        game_id,
        user_id,
      },
    });

    if (existingEntry) {
      // Best Effort Update Logic
      const isBetterScore = data.score > existingEntry.score;
      const isEqualScoreButFaster =
        data.score === existingEntry.score &&
        (data.time_taken ?? Number.POSITIVE_INFINITY) <
          (existingEntry.time_taken ?? Number.POSITIVE_INFINITY);

      if (isBetterScore || isEqualScoreButFaster) {
        const updatedEntry = await prisma.leaderboard.update({
          where: { id: existingEntry.id },
          data: {
            score: data.score,
            time_taken: data.time_taken,
          },
          select: {
            id: true,
            score: true,
            time_taken: true,
            created_at: true,
          },
        });

        return updatedEntry;
      }

      // If not better, return existing
      return {
        id: existingEntry.id,
        score: existingEntry.score,
        time_taken: existingEntry.time_taken,
        created_at: existingEntry.created_at,
      };
    } else {
      // Create new entry
      const leaderboardEntry = await prisma.leaderboard.create({
        data: {
          game_id,
          user_id,
          score: data.score,
          time_taken: data.time_taken,
        },
        select: {
          id: true,
          score: true,
          time_taken: true,
          created_at: true,
        },
      });

      return leaderboardEntry;
    }
  }

  /**
   * Get leaderboard for a game
   * Leaderboard diurutkan berdasarkan score (DESC), kemudian time_taken (ASC)
   */
  static async getLeaderboard(game_id: string, limit: number = 10) {
    // Verify game exists
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: { id: true },
    });

    if (!game) throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    // Get top scores ordered by score DESC, then time_taken ASC
    const leaderboard = await prisma.leaderboard.findMany({
      where: { game_id },
      orderBy: [{ score: 'desc' }, { time_taken: 'asc' }],
      take: limit,
      select: {
        id: true,
        score: true,
        time_taken: true,
        created_at: true,
        user: {
          select: {
            id: true,
            username: true,
            profile_picture: true,
          },
        },
      },
    });

    return leaderboard.map(entry => ({
      userId: entry.user?.id || 'anonymous',
      username: entry.user?.username || 'Anonymous',
      profilePicture: entry.user?.profile_picture,
      score: entry.score,
      timeTaken: entry.time_taken,
      createdAt: entry.created_at,
    }));
  }

  private static async existGameCheck(game_name?: string, game_id?: string) {
    const where: Record<string, unknown> = {};
    if (game_name) where.name = game_name;
    if (game_id) where.id = game_id;

    if (Object.keys(where).length === 0) return null;

    const game = await prisma.games.findFirst({
      where,
      select: { id: true, creator_id: true },
    });

    if (game)
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'Game name is already exist',
      );

    return game;
  }

  private static async getGameTemplateId() {
    const result = await prisma.gameTemplates.findUnique({
      where: { slug: this.HANGMAN_SLUG },
      select: { id: true },
    });

    if (!result)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game template not found');

    return result.id;
  }
}
