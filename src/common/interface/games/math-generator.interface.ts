export interface IMathGeneratorJson {
  settings: {
    operation:
      | 'addition'
      | 'subtraction'
      | 'multiplication'
      | 'division'
      | 'random';
    difficulty: 'easy' | 'medium' | 'hard';
    game_type: string;
    theme: string;
    question_count: number;
  };
  score_per_question: number;
  questions: IMathQuestion[];
}

export interface IMathQuestion {
  question: string;
  answer: number;
  options: number[];
}
