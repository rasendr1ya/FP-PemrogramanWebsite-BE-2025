import z from 'zod';

export const SaveGameResultSchema = z.object({
  score: z.number().min(0),
  time_taken: z.number().min(0).optional(),
});

export type ISaveGameResult = z.infer<typeof SaveGameResultSchema>;
