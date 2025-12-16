import z from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

import { HangmanQuestionSchema } from './hangman-question.schema';

export const UpdateHangmanSchema = z.object({
  name: z.string().max(128).trim().optional(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}).optional(),
  is_publish: StringToBooleanSchema.optional(),
  is_question_shuffled: StringToBooleanSchema.optional(),
  score_per_question: z.coerce.number().min(1).max(1000).optional(),
  questions: StringToObjectSchema(
    z.array(HangmanQuestionSchema).min(1).max(50),
  ).optional(),
});

export type IUpdateHangman = z.infer<typeof UpdateHangmanSchema>;
