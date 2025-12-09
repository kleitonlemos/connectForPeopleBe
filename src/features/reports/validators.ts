import { z } from 'zod';

export const generateReportSchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(['EXECUTIVE_SUMMARY', 'FULL_DIAGNOSTIC', 'ACTION_PLAN', 'CUSTOM']),
  title: z.string().min(2),
});

export const updateSectionSchema = z.object({
  content: z.string(),
});

export type GenerateReportInput = z.infer<typeof generateReportSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
