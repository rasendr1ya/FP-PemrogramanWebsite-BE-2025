import z from 'zod';

export const CheckMathAnswerSchema = z.object({
  answers: z
    .array(
      z.object({
        question_index: z.number().int().min(0),
        selected_answer: z.coerce.number(),
      }),
    )
    .min(1),
});

export type ICheckMathAnswer = z.infer<typeof CheckMathAnswerSchema>;
