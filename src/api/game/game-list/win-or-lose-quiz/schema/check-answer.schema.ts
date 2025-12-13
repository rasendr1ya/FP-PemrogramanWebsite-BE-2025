import { z } from 'zod';

// Schema for validating the request body
export const checkAnswerRequestSchema = z.object({
  sessionId: z.string(),
  selectedAnswerIndex: z.number().int().min(0),
  betAmount: z.number().int().positive().min(1),
});

// Type for the service (without sessionId)
export const checkAnswerSchema = z.object({
  selectedAnswerIndex: z.number().int().min(0),
  betAmount: z.number().int().positive().min(1),
});

export type ICheckAnswerRequest = z.infer<typeof checkAnswerRequestSchema>;
export type ICheckAnswerInput = z.infer<typeof checkAnswerSchema>;
