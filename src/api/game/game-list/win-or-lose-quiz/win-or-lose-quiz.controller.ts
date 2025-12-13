/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { type Prisma } from '@prisma/client';
import {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from 'express';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import {
  type AuthedRequest,
  ErrorResponse,
  type IWinOrLoseQuizGame,
  type IWinOrLoseQuizGameplay,
  prisma,
  SuccessResponse,
  validateAuth,
  validateBody,
} from '@/common';

import {
  checkAnswerRequestSchema,
  createWinOrLoseQuizSchema,
  type ICheckAnswerRequest,
  type ICreateWinOrLoseQuizInput,
  type IUpdateWinOrLoseQuizInput,
  updateWinOrLoseQuizSchema,
} from './schema';
import { WinOrLoseQuizService } from './win-or-lose-quiz.service';

// In-memory store for gameplay sessions (can be replaced with Redis in production)
const gameplayStore = new Map<string, IWinOrLoseQuizGameplay>();

export const WinOrLoseQuizController = Router()
  .post(
    '/',
    validateAuth({}),
    validateBody({ schema: createWinOrLoseQuizSchema }),
    async (
      request: AuthedRequest<{}, {}, ICreateWinOrLoseQuizInput>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const data = request.body;
        const userId = request.user!.user_id;

        // Check if game name already exists
        const existingGame = await prisma.games.findUnique({
          where: { name: data.name },
          select: { id: true },
        });

        if (existingGame) {
          throw new ErrorResponse(
            StatusCodes.BAD_REQUEST,
            'Game name already exists',
          );
        }

        // Get game template ID for win-or-lose-quiz
        const gameTemplate = await prisma.gameTemplates.findUnique({
          where: { slug: 'win-or-lose-quiz' },
          select: { id: true },
        });

        if (!gameTemplate) {
          throw new ErrorResponse(
            StatusCodes.NOT_FOUND,
            'Game template not found',
          );
        }

        // Validate game config
        const gameConfig: IWinOrLoseQuizGame = {
          questions: data.questions,
          initialPoints: data.initialPoints || 100,
          maxBetAmount: data.maxBetAmount,
          minBetAmount: data.minBetAmount || 1,
        };

        WinOrLoseQuizService.validateGameConfig(gameConfig);

        // Create game in database
        const newGameId = v4();
        const newGame = await prisma.games.create({
          data: {
            id: newGameId,
            game_template_id: gameTemplate.id,
            creator_id: userId,
            name: data.name || `Win or Lose Quiz ${newGameId.slice(0, 8)}`,
            description: data.description || 'A betting-based quiz game',
            thumbnail_image: data.thumbnail_image || '/default-thumbnail.png',
            is_published: data.is_published || false,
            game_json: gameConfig as unknown as Prisma.JsonObject,
          },
          select: {
            id: true,
            name: true,
            description: true,
            is_published: true,
            created_at: true,
          },
        });

        const result = new SuccessResponse(
          StatusCodes.CREATED,
          'Win or Lose Quiz created successfully',
          newGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .get(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { game_id } = request.params;
        const userId = request.user!.user_id;
        const userRole = request.user!.role;

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
            total_played: true,
            created_at: true,
            game_template: {
              select: { slug: true },
            },
          },
        });

        if (!game || game.game_template.slug !== 'win-or-lose-quiz') {
          throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
        }

        if (userRole !== 'SUPER_ADMIN' && game.creator_id !== userId) {
          throw new ErrorResponse(
            StatusCodes.FORBIDDEN,
            'User cannot access this game',
          );
        }

        const result = new SuccessResponse(
          StatusCodes.OK,
          'Game retrieved successfully',
          {
            ...game,
            creator_id: undefined,
            game_template: undefined,
          },
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .patch(
    '/:game_id',
    validateAuth({}),
    validateBody({ schema: updateWinOrLoseQuizSchema }),
    async (
      request: AuthedRequest<
        { game_id: string },
        {},
        IUpdateWinOrLoseQuizInput
      >,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { game_id } = request.params;
        const data = request.body;
        const userId = request.user!.user_id;
        const userRole = request.user!.role;

        const game = await prisma.games.findUnique({
          where: { id: game_id },
          select: {
            id: true,
            creator_id: true,
            game_json: true,
            game_template: {
              select: { slug: true },
            },
          },
        });

        if (!game || game.game_template.slug !== 'win-or-lose-quiz') {
          throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
        }

        if (userRole !== 'SUPER_ADMIN' && game.creator_id !== userId) {
          throw new ErrorResponse(
            StatusCodes.FORBIDDEN,
            'User cannot update this game',
          );
        }

        // Check if new name conflicts with existing game
        if (data.name) {
          const existingGame = await prisma.games.findUnique({
            where: { name: data.name },
            select: { id: true },
          });

          if (existingGame && existingGame.id !== game_id) {
            throw new ErrorResponse(
              StatusCodes.BAD_REQUEST,
              'Game name already exists',
            );
          }
        }

        const oldGameConfig = game.game_json as unknown as IWinOrLoseQuizGame;

        // Merge old and new config
        const updatedGameConfig: IWinOrLoseQuizGame = {
          questions: data.questions ?? oldGameConfig.questions,
          initialPoints: data.initialPoints ?? oldGameConfig.initialPoints,
          maxBetAmount: data.maxBetAmount ?? oldGameConfig.maxBetAmount,
          minBetAmount: data.minBetAmount ?? oldGameConfig.minBetAmount,
        };

        // Validate updated config
        WinOrLoseQuizService.validateGameConfig(updatedGameConfig);

        const updatedGame = await prisma.games.update({
          where: { id: game_id },
          data: {
            name: data.name,
            description: data.description,
            thumbnail_image: data.thumbnail_image,
            is_published: data.is_published,
            game_json: updatedGameConfig as unknown as Prisma.JsonObject,
          },
          select: {
            id: true,
            name: true,
            description: true,
            is_published: true,
            updated_at: true,
          },
        });

        const result = new SuccessResponse(
          StatusCodes.OK,
          'Game updated successfully',
          updatedGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .delete(
    '/:game_id',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { game_id } = request.params;
        const userId = request.user!.user_id;
        const userRole = request.user!.role;

        const game = await prisma.games.findUnique({
          where: { id: game_id },
          select: {
            id: true,
            creator_id: true,
            game_template: {
              select: { slug: true },
            },
          },
        });

        if (!game || game.game_template.slug !== 'win-or-lose-quiz') {
          throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
        }

        if (userRole !== 'SUPER_ADMIN' && game.creator_id !== userId) {
          throw new ErrorResponse(
            StatusCodes.FORBIDDEN,
            'User cannot delete this game',
          );
        }

        await prisma.games.delete({
          where: { id: game_id },
        });

        const result = new SuccessResponse(
          StatusCodes.OK,
          'Game deleted successfully',
          { id: game_id },
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .post(
    '/:game_id/play',
    async (
      request: Request<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { game_id } = request.params;

        const game = await prisma.games.findUnique({
          where: { id: game_id },
          select: {
            id: true,
            name: true,
            description: true,
            thumbnail_image: true,
            is_published: true,
            game_json: true,
            game_template: {
              select: { slug: true },
            },
          },
        });

        if (!game || game.game_template.slug !== 'win-or-lose-quiz') {
          throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
        }

        if (!game.is_published) {
          throw new ErrorResponse(
            StatusCodes.FORBIDDEN,
            'Game is not published',
          );
        }

        const gameConfig = game.game_json as unknown as IWinOrLoseQuizGame;

        // Initialize gameplay
        const gameplay = WinOrLoseQuizService.initializeGameplay(gameConfig);

        // Generate session ID
        const sessionId = v4();

        // Store gameplay state
        gameplayStore.set(sessionId, gameplay);

        // Get first question
        const currentQuestion = WinOrLoseQuizService.getCurrentQuestion(
          gameConfig,
          gameplay,
        );

        // Increment total played counter
        await prisma.games.update({
          where: { id: game_id },
          data: {
            total_played: {
              increment: 1,
            },
          },
        });

        const result = new SuccessResponse(
          StatusCodes.OK,
          'Game started successfully',
          {
            sessionId,
            gameId: game_id,
            gameName: game.name,
            playerPoints: gameplay.playerPoints,
            currentQuestion,
            totalQuestions: gameConfig.questions.length,
            minBetAmount: gameConfig.minBetAmount || 1,
            maxBetAmount: gameConfig.maxBetAmount,
          },
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .post(
    '/:game_id/answer',
    validateBody({ schema: checkAnswerRequestSchema }),
    async (
      request: Request<{ game_id: string }, {}, ICheckAnswerRequest>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { game_id } = request.params;
        const { sessionId, selectedAnswerIndex, betAmount } = request.body;

        if (!sessionId) {
          throw new ErrorResponse(
            StatusCodes.BAD_REQUEST,
            'Session ID is required',
          );
        }

        // Get gameplay state
        const gameplay = gameplayStore.get(sessionId);

        if (!gameplay) {
          throw new ErrorResponse(
            StatusCodes.NOT_FOUND,
            'Gameplay session not found or expired',
          );
        }

        // Get game config
        const game = await prisma.games.findUnique({
          where: { id: game_id },
          select: {
            game_json: true,
            game_template: {
              select: { slug: true },
            },
          },
        });

        if (!game || game.game_template.slug !== 'win-or-lose-quiz') {
          throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');
        }

        const gameConfig = game.game_json as unknown as IWinOrLoseQuizGame;

        // Process answer
        const { gameplay: updatedGameplay, result: answerResult } =
          WinOrLoseQuizService.processAnswer(gameConfig, gameplay, {
            selectedAnswerIndex,
            betAmount,
          });

        // Update gameplay state
        gameplayStore.set(sessionId, updatedGameplay);

        // Get next question (if game not finished)
        const nextQuestion = answerResult.isGameFinished
          ? null
          : WinOrLoseQuizService.getCurrentQuestion(
              gameConfig,
              updatedGameplay,
            );

        // Calculate statistics if game finished
        const statistics = answerResult.isGameFinished
          ? WinOrLoseQuizService.calculateStatistics(updatedGameplay)
          : null;

        // Clean up session if game finished
        if (answerResult.isGameFinished) {
          gameplayStore.delete(sessionId);
        }

        const result = new SuccessResponse(
          StatusCodes.OK,
          answerResult.isCorrect ? 'Correct answer!' : 'Wrong answer',
          {
            isCorrect: answerResult.isCorrect,
            correctAnswerIndex: answerResult.correctAnswerIndex,
            pointsChange: answerResult.pointsChange,
            newPoints: answerResult.newPoints,
            isGameFinished: answerResult.isGameFinished,
            nextQuestion,
            statistics,
          },
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .get(
    '/:game_id/stats/:session_id',
    (
      request: Request<{ game_id: string; session_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const { session_id } = request.params;

        const gameplay = gameplayStore.get(session_id);

        if (!gameplay) {
          throw new ErrorResponse(
            StatusCodes.NOT_FOUND,
            'Gameplay session not found',
          );
        }

        const statistics = WinOrLoseQuizService.calculateStatistics(gameplay);

        const result = new SuccessResponse(
          StatusCodes.OK,
          'Statistics retrieved successfully',
          statistics,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  );
