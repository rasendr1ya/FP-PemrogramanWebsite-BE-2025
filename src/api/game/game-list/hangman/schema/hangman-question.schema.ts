import z from 'zod';

export const HangmanQuestionSchema = z.object({
  question: z.string().max(500).trim(),
  answer: z.string().max(200).trim(),
});
