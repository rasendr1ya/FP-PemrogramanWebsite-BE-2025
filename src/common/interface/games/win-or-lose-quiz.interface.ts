export interface IWinOrLoseQuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface IWinOrLoseQuizGame {
  questions: IWinOrLoseQuizQuestion[];
  initialPoints?: number; // Default 100
  maxBetAmount?: number; // Optional limit
  minBetAmount?: number; // Default 1
}

export interface IWinOrLoseQuizAnswerHistory {
  questionIndex: number;
  betAmount: number;
  selectedAnswerIndex: number;
  isCorrect: boolean;
  pointsChange: number; // Positive or negative
}

export interface IWinOrLoseQuizGameplay {
  currentQuestionIndex: number;
  playerPoints: number;
  answerHistory: IWinOrLoseQuizAnswerHistory[];
  isFinished: boolean;
  finalScore?: number;
}
