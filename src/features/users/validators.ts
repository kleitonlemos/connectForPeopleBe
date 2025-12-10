import { z } from 'zod';

export const listUsersSchema = z.object({
  organizationId: z.string().uuid().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'CONSULTANT', 'CLIENT', 'RESPONDENT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'BLOCKED']).optional(),
  search: z.string().optional(),
});

export const updateUserSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'CONSULTANT', 'CLIENT', 'RESPONDENT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING', 'BLOCKED']).optional(),
});

export type ListUsersInput = z.infer<typeof listUsersSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
