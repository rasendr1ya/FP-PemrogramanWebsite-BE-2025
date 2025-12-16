import {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from 'express';
import { StatusCodes } from 'http-status-codes';

import {
  type AuthedRequest,
  SuccessResponse,
  validateAuth,
  validateBody,
} from '@/common';

import { HangmanService } from './hangman.service';
import {
  CreateHangmanSchema,
  type ICreateHangman,
  type ISaveGameResult,
  type IUpdateHangman,
  SaveGameResultSchema,
  UpdateHangmanSchema,
} from './schema';

export const HangmanController = Router()
  .post(
    '/',
    validateAuth({}),
    validateBody({
      schema: CreateHangmanSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{}, {}, ICreateHangman>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const newGame = await HangmanService.createHangman(
          request.body,
          request.user!.user_id,
        );
        const result = new SuccessResponse(
          StatusCodes.CREATED,
          'Hangman game created',
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
        const game = await HangmanService.getHangmanGameDetail(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get game successfully',
          game,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .get(
    '/:game_id/play/public',
    async (
      request: Request<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await HangmanService.getHangmanGamePlay(
          request.params.game_id,
          true,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get public game successfully',
          game,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .get(
    '/:game_id/play/private',
    validateAuth({}),
    async (
      request: AuthedRequest<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const game = await HangmanService.getHangmanGamePlay(
          request.params.game_id,
          false,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get private game successfully',
          game,
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
    validateBody({
      schema: UpdateHangmanSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IUpdateHangman>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const updatedGame = await HangmanService.updateHangman(
          request.body,
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Game updated',
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
        const result = await HangmanService.deleteHangman(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const successResponse = new SuccessResponse(
          StatusCodes.OK,
          'Game deleted successfully',
          result,
        );

        return response
          .status(successResponse.statusCode)
          .json(successResponse.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .post(
    '/:game_id/result',
    validateAuth({ optional: true }),
    validateBody({
      schema: SaveGameResultSchema,
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, ISaveGameResult>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const leaderboardEntry = await HangmanService.saveGameResult(
          request.params.game_id,
          request.body,
          request.user?.user_id,
        );
        const result = new SuccessResponse(
          StatusCodes.CREATED,
          'Game result saved',
          leaderboardEntry,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .get(
    '/:game_id/leaderboard',
    async (
      request: Request<{ game_id: string }>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const limit = Math.min(
          Math.max(Number.parseInt(request.query.limit as string) || 10, 1),
          100,
        );
        const leaderboard = await HangmanService.getLeaderboard(
          request.params.game_id,
          limit,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Get leaderboard successfully',
          leaderboard,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  );
