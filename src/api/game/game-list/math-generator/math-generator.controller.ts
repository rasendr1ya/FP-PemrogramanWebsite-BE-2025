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

import { MathGeneratorService } from './math-generator.service';
import {
  CheckMathAnswerSchema,
  CreateMathGeneratorSchema,
  type ICheckMathAnswer,
  type ICreateMathGenerator,
  type IUpdateMathGenerator,
  UpdateMathGeneratorSchema,
} from './schema';

export const MathGeneratorController = Router()
  .post(
    '/',
    validateAuth({}),
    validateBody({
      schema: CreateMathGeneratorSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<{}, unknown, ICreateMathGenerator>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await MathGeneratorService.createGame(
          request.body,
          request.user!.user_id,
        );
        const result_ = new SuccessResponse(
          StatusCodes.CREATED,
          'Game created',
          result,
        );

        return response.status(result_.statusCode).json(result_.json());
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
        const result = await MathGeneratorService.getGameDetail(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result_ = new SuccessResponse(
          StatusCodes.OK,
          'Game detail fetched',
          result,
        );

        return response.status(result_.statusCode).json(result_.json());
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
        const result = await MathGeneratorService.getGamePlay(
          request.params.game_id,
          true,
        );
        const result_ = new SuccessResponse(
          StatusCodes.OK,
          'Game data fetched',
          result,
        );

        return response.status(result_.statusCode).json(result_.json());
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
        const result = await MathGeneratorService.getGamePlay(
          request.params.game_id,
          false,
          request.user!.user_id,
          request.user!.role,
        );
        const result_ = new SuccessResponse(
          StatusCodes.OK,
          'Game data fetched',
          result,
        );

        return response.status(result_.statusCode).json(result_.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .post(
    '/:game_id/check',
    validateBody({ schema: CheckMathAnswerSchema }),
    async (
      request: Request<{ game_id: string }, {}, ICheckMathAnswer>,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await MathGeneratorService.checkAnswer(
          request.params.game_id,
          request.body,
        );
        const result_ = new SuccessResponse(
          StatusCodes.OK,
          'Answers checked',
          result,
        );

        return response.status(result_.statusCode).json(result_.json());
      } catch (error) {
        return next(error);
      }
    },
  )
  .patch(
    '/:game_id',
    validateAuth({}),
    validateBody({
      schema: UpdateMathGeneratorSchema,
      file_fields: [{ name: 'thumbnail_image', maxCount: 1 }],
    }),
    async (
      request: AuthedRequest<
        { game_id: string },
        unknown,
        IUpdateMathGenerator
      >,
      response: Response,
      next: NextFunction,
    ) => {
      try {
        const result = await MathGeneratorService.updateGame(
          request.params.game_id,
          request.body,
          request.user!.user_id,
          request.user!.role,
        );
        const result_ = new SuccessResponse(
          StatusCodes.OK,
          'Game updated',
          result,
        );

        return response.status(result_.statusCode).json(result_.json());
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
        const result = await MathGeneratorService.deleteGame(
          request.params.game_id,
          request.user!.user_id,
          request.user!.role,
        );
        const result_ = new SuccessResponse(
          StatusCodes.OK,
          'Game deleted successfully',
          result,
        );

        return response.status(result_.statusCode).json(result_.json());
      } catch (error) {
        return next(error);
      }
    },
  );
