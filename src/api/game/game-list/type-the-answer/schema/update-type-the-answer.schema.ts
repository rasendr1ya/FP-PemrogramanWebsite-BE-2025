import z from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

import { TypeTheAnswerQuestionSchema } from './create-type-the-answer.schema';

export const UpdateTypeTheAnswerSchema = z.object({
  name: z.string().max(128).trim().optional(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}).optional(),
  is_publish: StringToBooleanSchema.optional(),
  time_limit_seconds: z.coerce.number().min(1).max(3600).optional(),
  score_per_question: z.coerce.number().min(1).max(1000).optional(),
  questions: StringToObjectSchema(
    z.array(TypeTheAnswerQuestionSchema).min(1).max(50),
  ).optional(),
});

export type IUpdateTypeTheAnswer = z.infer<typeof UpdateTypeTheAnswerSchema>;
