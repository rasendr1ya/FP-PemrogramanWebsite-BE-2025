import z from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

import { HangmanQuestionSchema } from './hangman-question.schema';

export const CreateHangmanSchema = z.object({
  name: z.string().max(128).trim(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}),
  is_publish_immediately: StringToBooleanSchema.default(false),
  is_question_shuffled: StringToBooleanSchema.default(false),
  score_per_question: z.coerce.number().min(1).max(1000),
  questions: StringToObjectSchema(
    z.array(HangmanQuestionSchema).min(1).max(50),
  ),
});

export type ICreateHangman = z.infer<typeof CreateHangmanSchema>;
