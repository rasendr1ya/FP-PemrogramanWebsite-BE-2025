export interface ITypeTheAnswerJson {
  time_limit_seconds: number;
  score_per_question: number;
  questions: ITypeTheAnswerQuestion[];
}

export interface ITypeTheAnswerQuestion {
  question_text: string;
  correct_answer: string;
}
