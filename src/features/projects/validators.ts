import { z } from 'zod';

export const createProjectSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  targetEndDate: z.string().optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'ARCHIVED']).optional(),
  stage: z
    .enum([
      'ONBOARDING',
      'DOCUMENT_COLLECTION',
      'SURVEY_DISTRIBUTION',
      'INTERVIEW_PROCESSING',
      'AI_ANALYSIS',
      'REPORT_GENERATION',
      'REVIEW',
      'DELIVERED',
    ])
    .optional(),
  startDate: z.string().optional().nullable(),
  targetEndDate: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).optional(),
  settings: z.record(z.unknown()).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
