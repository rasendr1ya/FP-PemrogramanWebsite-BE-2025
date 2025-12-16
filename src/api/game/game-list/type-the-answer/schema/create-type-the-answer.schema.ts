import z from 'zod';

import {
  fileSchema,
  StringToBooleanSchema,
  StringToObjectSchema,
} from '@/common';

export const TypeTheAnswerQuestionSchema = z.object({
  question_text: z.string().max(2000).trim(),
  correct_answer: z.string().max(512).trim(),
});

export const CreateTypeTheAnswerSchema = z.object({
  name: z.string().max(128).trim(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}),
  is_publish_immediately: StringToBooleanSchema.default(false),
  time_limit_seconds: z.coerce.number().min(1).max(3600),
  score_per_question: z.coerce.number().min(1).max(1000),
  questions: StringToObjectSchema(
    z.array(TypeTheAnswerQuestionSchema).min(1).max(50),
  ),
});

export type ICreateTypeTheAnswer = z.infer<typeof CreateTypeTheAnswerSchema>;
