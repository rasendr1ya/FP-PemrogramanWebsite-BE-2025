import z from 'zod';

import { StringToBooleanSchema } from '@/common';

export const UpdatePublishStatusSchema = z.object({
  is_publish: z.union([z.boolean(), StringToBooleanSchema]),
});

export type IUpdatePublishStatus = z.infer<typeof UpdatePublishStatusSchema>;
