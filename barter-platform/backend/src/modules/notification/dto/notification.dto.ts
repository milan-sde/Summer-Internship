import { z } from 'zod';

// Query validation schema for GET /api/notifications
export const GetNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
  unread: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

export type GetNotificationsQueryDto = z.infer<typeof GetNotificationsQuerySchema>;
