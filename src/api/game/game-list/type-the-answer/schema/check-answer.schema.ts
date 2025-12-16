import z from 'zod';

export const CheckTypeTheAnswerSchema = z.object({
  answers: z
    .array(
      z.object({
        question_index: z.number().min(0),
        user_answer: z.string().trim(),
      }),
    )
    .min(1),
  completion_time: z.number().min(0).optional(),
});

export type ICheckTypeTheAnswer = z.infer<typeof CheckTypeTheAnswerSchema>;
