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

import {
  CheckTypeTheAnswerSchema,
  CreateTypeTheAnswerSchema,
  type ICheckTypeTheAnswer,
  type ICreateTypeTheAnswer,
  type IUpdateTypeTheAnswer,
  UpdateTypeTheAnswerSchema,
} from './schema';
import { TypeTheAnswerService } from './type-the-answer.service';

export const TypeTheAnswerController = Router()
  .post(
    '/',
    validateAuth({}),
    validateBody({
      schema: CreateTypeTheAnswerSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{}, {}, ICreateTypeTheAnswer>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const newGame = await TypeTheAnswerService.createTypeTheAnswer(
          request.body,
          request.user!.user_id,
        );
        const result = new SuccessResponse(
          StatusCodes.CREATED,
          'Type The Answer game created',
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
        const game = await TypeTheAnswerService.getTypeTheAnswerGameDetail(
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
        const game = await TypeTheAnswerService.getTypeTheAnswerPlay(
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
        const game = await TypeTheAnswerService.getTypeTheAnswerPlay(
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
      schema: UpdateTypeTheAnswerSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{ game_id: string }, {}, IUpdateTypeTheAnswer>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const updatedGame = await TypeTheAnswerService.updateTypeTheAnswer(
          request.body,
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Type The Answer game updated',
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
        const deletedGame = await TypeTheAnswerService.deleteTypeTheAnswer(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Type The Answer game deleted',
          deletedGame,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .post(
    '/:game_id/check',
    validateBody({ schema: CheckTypeTheAnswerSchema }),
    async (
      request: Request<{ game_id: string }, {}, ICheckTypeTheAnswer>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const checkResult = await TypeTheAnswerService.checkAnswer(
          request.body,
          request.params.game_id,
        );
        const result = new SuccessResponse(
          StatusCodes.OK,
          'Answer checked successfully',
          checkResult,
        );

        return response.status(result.statusCode).json(result.json());
      } catch (error) {
        return next(error);
      }
    },
  );
