export interface IHangmanQuestion {
  id: string;
  question: string;
  answer: string;
  order: number;
}

export interface IHangmanJson {
  score_per_question: number;
  is_question_shuffled: boolean;
  questions: IHangmanQuestion[];
}
