import {
  type IWinOrLoseQuizAnswerHistory,
  type IWinOrLoseQuizGame,
  type IWinOrLoseQuizGameplay,
} from '@/common';

import { type ICheckAnswerInput } from './schema';

export class WinOrLoseQuizService {
  /**
   * Validate game configuration
   */
  static validateGameConfig(config: IWinOrLoseQuizGame): void {
    if (!config.questions || config.questions.length === 0) {
      throw new Error('Game must have at least one question');
    }

    for (const [index, q] of config.questions.entries()) {
      if (q.correctAnswerIndex >= q.options.length) {
        throw new Error(`Question ${index + 1}: Invalid correctAnswerIndex`);
      }
    }
  }

  /**
   * Create initial gameplay state
   */
  static initializeGameplay(
    gameConfig: IWinOrLoseQuizGame,
  ): IWinOrLoseQuizGameplay {
    return {
      currentQuestionIndex: 0,
      playerPoints: gameConfig.initialPoints || 100,
      answerHistory: [],
      isFinished: false,
    };
  }

  /**
   * Process answer and update gameplay state
   */
  static processAnswer(
    gameConfig: IWinOrLoseQuizGame,
    gameplay: IWinOrLoseQuizGameplay,
    answer: ICheckAnswerInput,
  ): {
    gameplay: IWinOrLoseQuizGameplay;
    result: {
      isCorrect: boolean;
      correctAnswerIndex: number;
      pointsChange: number;
      newPoints: number;
      isGameFinished: boolean;
    };
  } {
    // Validate game state
    if (gameplay.isFinished) {
      throw new Error('Game is already finished');
    }

    if (gameplay.currentQuestionIndex >= gameConfig.questions.length) {
      throw new Error('No more questions available');
    }

    const currentQuestion = gameConfig.questions[gameplay.currentQuestionIndex];

    // Validate bet amount
    if (answer.betAmount > gameplay.playerPoints) {
      throw new Error(
        `Insufficient points. You have ${gameplay.playerPoints} points but trying to bet ${answer.betAmount}`,
      );
    }

    if (gameConfig.minBetAmount && answer.betAmount < gameConfig.minBetAmount) {
      throw new Error(`Bet amount must be at least ${gameConfig.minBetAmount}`);
    }

    if (gameConfig.maxBetAmount && answer.betAmount > gameConfig.maxBetAmount) {
      throw new Error(`Bet amount cannot exceed ${gameConfig.maxBetAmount}`);
    }

    // Validate answer index
    if (answer.selectedAnswerIndex >= currentQuestion.options.length) {
      throw new Error('Invalid answer index');
    }

    // Check if answer is correct
    const isCorrect =
      answer.selectedAnswerIndex === currentQuestion.correctAnswerIndex;

    // Calculate points change
    const pointsChange = isCorrect ? answer.betAmount : -answer.betAmount;
    const newPoints = gameplay.playerPoints + pointsChange;

    // Create answer history entry
    const historyEntry: IWinOrLoseQuizAnswerHistory = {
      questionIndex: gameplay.currentQuestionIndex,
      betAmount: answer.betAmount,
      selectedAnswerIndex: answer.selectedAnswerIndex,
      isCorrect,
      pointsChange,
    };

    // Update gameplay state
    const updatedGameplay: IWinOrLoseQuizGameplay = {
      ...gameplay,
      playerPoints: newPoints,
      answerHistory: [...gameplay.answerHistory, historyEntry],
      currentQuestionIndex: gameplay.currentQuestionIndex + 1,
      isFinished:
        gameplay.currentQuestionIndex + 1 >= gameConfig.questions.length ||
        newPoints <= 0,
    };

    // Set final score if game is finished
    if (updatedGameplay.isFinished) {
      updatedGameplay.finalScore = newPoints;
    }

    return {
      gameplay: updatedGameplay,
      result: {
        isCorrect,
        correctAnswerIndex: currentQuestion.correctAnswerIndex,
        pointsChange,
        newPoints,
        isGameFinished: updatedGameplay.isFinished,
      },
    };
  }

  /**
   * Get current question (without revealing answer)
   */
  static getCurrentQuestion(
    gameConfig: IWinOrLoseQuizGame,
    gameplay: IWinOrLoseQuizGameplay,
  ) {
    if (gameplay.isFinished) {
      return null;
    }

    if (gameplay.currentQuestionIndex >= gameConfig.questions.length) {
      return null;
    }

    const question = gameConfig.questions[gameplay.currentQuestionIndex];

    return {
      questionIndex: gameplay.currentQuestionIndex,
      question: question.question,
      options: question.options,
      // Don't send correctAnswerIndex to client!
    };
  }

  /**
   * Calculate final statistics
   */
  static calculateStatistics(gameplay: IWinOrLoseQuizGameplay) {
    const totalQuestions = gameplay.answerHistory.length;
    const correctAnswers = gameplay.answerHistory.filter(
      h => h.isCorrect,
    ).length;
    const wrongAnswers = totalQuestions - correctAnswers;
    const totalBet = gameplay.answerHistory.reduce(
      (sum, h) => sum + h.betAmount,
      0,
    );

    return {
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      accuracy:
        totalQuestions > 0
          ? Math.round((correctAnswers / totalQuestions) * 100)
          : 0,
      finalScore: gameplay.finalScore || gameplay.playerPoints,
      totalBet,
    };
  }
}
