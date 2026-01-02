import { type Prisma, type ROLE } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { v4 } from 'uuid';

import { ErrorResponse, type IQuizJson, prisma } from '@/common';
import { FileManager } from '@/utils';

import {
  type ICheckAnswer,
  type ICreateQuiz,
  type IUpdateQuiz,
} from './schema';

export abstract class QuizService {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  private static QUIZ_SLUG = 'quiz';

  static async createQuiz(data: ICreateQuiz, user_id: string) {
    await this.existGameCheck(data.name);

    const newQuizId = v4();
    const quizTemplateId = await this.getGameTemplateId();

    let questionWithImageAmount = 0;

    for (const [index, question] of data.questions.entries()) {
      if (typeof question.question_image_array_index === 'number')
        questionWithImageAmount++;

      const correctAnswer = question.answers.filter(
        item => item.is_correct === true,
      );
      if (correctAnswer.length !== 1)
        throw new ErrorResponse(
          StatusCodes.BAD_REQUEST,
          `There should be 1 correct answer in question no. ${index + 1}`,
        );
    }

    if (
      data.files_to_upload &&
      questionWithImageAmount !== data.files_to_upload.length
    )
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'all uploaded file must be used',
      );

    const thumbnailImagePath = await FileManager.upload(
      `game/quiz/${newQuizId}`,
      data.thumbnail_image,
    );

    const imageArray: string[] = [];

    if (data.files_to_upload) {
      for (const image of data.files_to_upload) {
        const newImagePath = await FileManager.upload(
          `game/quiz/${newQuizId}`,
          image,
        );
        imageArray.push(newImagePath);
      }
    }

    const quizJson: IQuizJson = {
      score_per_question: data.score_per_question,
      is_question_randomized: data.is_question_randomized,
      is_answer_randomized: data.is_answer_randomized,
      questions: data.questions.map(question => ({
        question_text: question.question_text,
        question_image:
          typeof question.question_image_array_index === 'number'
            ? imageArray[question.question_image_array_index]
            : null,
        answers: question.answers,
      })),
    };

    const newGame = await prisma.games.create({
      data: {
        id: newQuizId,
        game_template_id: quizTemplateId,
        creator_id: user_id,
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_publish_immediately,
        game_json: quizJson as unknown as Prisma.InputJsonValue, // gunakan ini agar field Json Prisma dapat menerima object JS
      },
      select: {
        id: true, // select id agar tidak semua dikembalikan
        game_template: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return newGame;
  }

  static async getQuizGameDetail(
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

    if (!game || game.game_template.slug !== this.QUIZ_SLUG)
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

  static async updateQuiz(
    data: IUpdateQuiz,
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

    if (!game || game.game_template.slug !== this.QUIZ_SLUG)
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

    const oldQuizJson = game.game_json as IQuizJson | null;
    const oldImagePaths: string[] = [];

    if (oldQuizJson?.questions) {
      for (const question of oldQuizJson.questions) {
        if (question.question_image) {
          oldImagePaths.push(question.question_image);
        }
      }
    }

    if (game.thumbnail_image) {
      oldImagePaths.push(game.thumbnail_image);
    }

    let questionWithImageAmount = 0;

    if (data.questions) {
      for (const [index, question] of data.questions.entries()) {
        if (typeof question.question_image_array_index === 'number')
          questionWithImageAmount++;

        const correctAnswer = question.answers.filter(
          item => item.is_correct === true,
        );
        if (correctAnswer.length !== 1)
          throw new ErrorResponse(
            StatusCodes.BAD_REQUEST,
            `There should be 1 correct answer in question no. ${index + 1}`,
          );
      }
    }

    if (
      data.files_to_upload &&
      questionWithImageAmount !== data.files_to_upload.length
    )
      throw new ErrorResponse(
        StatusCodes.BAD_REQUEST,
        'All uploaded file must be used',
      );

    let thumbnailImagePath = game.thumbnail_image;

    if (data.thumbnail_image) {
      thumbnailImagePath = await FileManager.upload(
        `game/quiz/${game_id}`,
        data.thumbnail_image,
      );
    }

    const imageArray: string[] = [];

    if (data.files_to_upload) {
      for (const image of data.files_to_upload) {
        const newImagePath = await FileManager.upload(
          `game/quiz/${game_id}`,
          image,
        );
        imageArray.push(newImagePath);
      }
    }

    const quizJson: IQuizJson = {
      score_per_question:
        data.score_per_question ?? oldQuizJson?.score_per_question ?? 0,
      is_question_randomized:
        data.is_question_randomized ??
        oldQuizJson?.is_question_randomized ??
        false,
      is_answer_randomized:
        data.is_answer_randomized ?? oldQuizJson?.is_answer_randomized ?? false,
      questions: data.questions
        ? data.questions.map(question => {
            let questionImage: string | null = null;

            if (typeof question.question_image_array_index === 'number') {
              questionImage = imageArray[question.question_image_array_index];
            } else if (
              typeof question.question_image_array_index === 'string'
            ) {
              questionImage = question.question_image_array_index;
            }

            return {
              question_text: question.question_text,
              question_image: questionImage,
              answers: question.answers,
            };
          })
        : (oldQuizJson?.questions ?? []),
    };

    const updatedGame = await prisma.games.update({
      where: { id: game_id },
      data: {
        name: data.name,
        description: data.description,
        thumbnail_image: thumbnailImagePath,
        is_published: data.is_publish,
        game_json: quizJson as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
      },
    });

    const newImagePaths: string[] = [thumbnailImagePath];

    if (quizJson.questions) {
      for (const question of quizJson.questions) {
        if (question.question_image) {
          newImagePaths.push(question.question_image);
        }
      }
    }

    for (const oldPath of oldImagePaths) {
      if (!newImagePaths.includes(oldPath)) {
        await FileManager.remove(oldPath);
      }
    }

    return updatedGame;
  }

  static async checkAnswer(data: ICheckAnswer, game_id: string) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        game_json: true,
        game_template: {
          select: { slug: true },
        },
      },
    });

    if (!game || game.game_template.slug !== this.QUIZ_SLUG)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    const quizJson = game.game_json as unknown as IQuizJson;
    const results = [];
    let correctCount = 0;
    const totalAnswered = data.answers.length;

    for (const answer of data.answers) {
      const questionIndex = answer.question_index;
      const selectedAnswerIndex = answer.selected_answer_index;

      if (questionIndex < 0 || questionIndex >= quizJson.questions.length) {
        results.push({
          question_index: questionIndex,
          selected_answer_index: selectedAnswerIndex,
          is_correct: false,
          correct_answer_index: -1,
          selected_answer_text: 'Invalid question index',
          correct_answer_text: 'N/A',
          error: 'Question index out of range',
        });
        continue;
      }

      const question = quizJson.questions[questionIndex];

      if (
        selectedAnswerIndex < 0 ||
        selectedAnswerIndex >= question.answers.length
      ) {
        results.push({
          question_index: questionIndex,
          selected_answer_index: selectedAnswerIndex,
          is_correct: false,
          correct_answer_index: -1,
          selected_answer_text: 'Invalid answer index',
          correct_answer_text: 'N/A',
          error: 'Answer index out of range',
        });
        continue;
      }

      const selectedAnswer = question.answers[selectedAnswerIndex];
      const correctAnswer = question.answers.find(ans => ans.is_correct);
      const correctAnswerIndex = question.answers.findIndex(
        ans => ans.is_correct,
      );

      const isCorrect = selectedAnswer.is_correct;
      if (isCorrect) correctCount++;

      results.push({
        question_index: questionIndex,
        selected_answer_index: selectedAnswerIndex,
        is_correct: isCorrect,
        correct_answer_index: correctAnswerIndex,
        selected_answer_text: selectedAnswer.answer_text,
        correct_answer_text: correctAnswer?.answer_text || 'N/A',
      });
    }

    const score = correctCount * quizJson.score_per_question;
    const maxScore = quizJson.questions.length * quizJson.score_per_question;
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;

    return {
      game_id,
      total_questions: quizJson.questions.length,
      correct_answers: correctCount,
      incorrect_answers: totalAnswered - correctCount,
      score,
      max_score: maxScore,
      percentage: Math.round(percentage * 100) / 100,
      results,
    };
  }

  static async getQuizPlay(
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
      game.game_template.slug !== this.QUIZ_SLUG
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

    const quizJson = game.game_json as unknown as IQuizJson | null;

    if (!quizJson)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Quiz data not found');

    const questionsWithIndex = (quizJson.questions ?? []).map(
      (q, question_index) => ({
        question_index,
        question_text: q.question_text,
        question_image: q.question_image ?? null,
        answers: (q.answers ?? []).map((a, answer_index) => ({
          answer_index,
          answer_text: a.answer_text,
          is_correct: typeof a.is_correct === 'boolean' ? a.is_correct : false,
        })),
      }),
    );

    if (quizJson.is_question_randomized && questionsWithIndex.length > 0) {
      this.shuffleArray(questionsWithIndex);
    }

    const cleanedQuestions = questionsWithIndex.map(question => {
      const answers = question.answers.map(ans => ({
        answer_text: ans.answer_text,
        answer_index: ans.answer_index,
      }));

      if (quizJson.is_answer_randomized) this.shuffleArray(answers);

      return {
        question_text: question.question_text,
        question_image: question.question_image ?? null,
        question_index: question.question_index,
        answers,
      };
    });

    return {
      id: game.id,
      name: game.name,
      description: game.description,
      thumbnail_image: game.thumbnail_image,
      score_per_question: quizJson.score_per_question,
      questions: cleanedQuestions,
      is_published: game.is_published,
    };
  }

  static async deleteQuiz(game_id: string, user_id: string, user_role: ROLE) {
    const game = await prisma.games.findUnique({
      where: { id: game_id },
      select: {
        id: true,
        thumbnail_image: true,
        game_json: true,
        creator_id: true,
      },
    });

    if (!game) throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game not found');

    if (user_role !== 'SUPER_ADMIN' && game.creator_id !== user_id)
      throw new ErrorResponse(
        StatusCodes.FORBIDDEN,
        'User cannot delete this game',
      );

    const oldQuizJson = game.game_json as IQuizJson | null;
    const oldImagePaths: string[] = [];

    if (oldQuizJson?.questions) {
      for (const question of oldQuizJson.questions) {
        if (question.question_image)
          oldImagePaths.push(question.question_image);
      }
    }

    if (game.thumbnail_image) oldImagePaths.push(game.thumbnail_image);

    for (const path of oldImagePaths) {
      await FileManager.remove(path);
    }

    await prisma.games.delete({ where: { id: game_id } });

    return { id: game_id };
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
      where: { slug: this.QUIZ_SLUG },
      select: { id: true },
    });

    if (!result)
      throw new ErrorResponse(StatusCodes.NOT_FOUND, 'Game template not found');

    return result.id;
  }

  private static shuffleArray<T>(array: T[]): T[] {
    for (let index = array.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
    }

    return array;
  }
}
