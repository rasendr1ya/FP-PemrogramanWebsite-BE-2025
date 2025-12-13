import { z } from 'zod';

const questionSchema = z.object({
  question: z.string().min(1, 'Question cannot be empty'),
  options: z
    .array(z.string().min(1, 'Option cannot be empty'))
    .min(2, 'At least 2 options required')
    .max(6, 'Maximum 6 options allowed'),
  correctAnswerIndex: z.number().int().min(0),
});

export const createWinOrLoseQuizSchema = z
  .object({
    name: z.string().min(1).max(128).trim().optional(),
    description: z.string().max(256).trim().optional(),
    thumbnail_image: z.string().optional(),
    is_published: z.boolean().optional().default(false),
    questions: z
      .array(questionSchema)
      .min(1, 'At least 1 question required')
      .refine(
        questions =>
          questions.every(q => q.correctAnswerIndex < q.options.length),
        {
          message: 'correctAnswerIndex must be valid for all questions',
        },
      ),
    initialPoints: z.number().int().positive().optional().default(100),
    maxBetAmount: z.number().int().positive().optional(),
    minBetAmount: z.number().int().positive().optional().default(1),
  })
  .refine(
    data => {
      if (data.maxBetAmount && data.minBetAmount) {
        return data.maxBetAmount >= data.minBetAmount;
      }

      return true;
    },
    {
      message: 'maxBetAmount must be >= minBetAmount',
    },
  );

export type ICreateWinOrLoseQuizInput = z.infer<
  typeof createWinOrLoseQuizSchema
>;
