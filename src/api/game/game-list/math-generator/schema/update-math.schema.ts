import z from 'zod';

import { fileSchema, StringToBooleanSchema } from '@/common';

export const UpdateMathGeneratorSchema = z.object({
  name: z.string().max(128).trim().optional(),
  description: z.string().max(256).trim().optional(),
  thumbnail_image: fileSchema({}).optional(),
  is_publish: StringToBooleanSchema.optional(),

  operation: z
    .enum(['addition', 'subtraction', 'multiplication', 'division', 'random'])
    .optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  game_type: z.string().optional(),
  theme: z.string().optional(),

  question_count: z.coerce.number().min(1).max(50).optional(),
  score_per_question: z.coerce.number().min(1).max(1000).optional(),
});

export type IUpdateMathGenerator = z.infer<typeof UpdateMathGeneratorSchema>;
