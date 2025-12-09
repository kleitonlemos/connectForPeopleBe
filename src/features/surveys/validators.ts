import { z } from 'zod';

export const createSurveySchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(['PARTNERS', 'LEADERSHIP', 'CLIMATE', 'CUSTOM']),
  name: z.string().min(2),
  description: z.string().optional(),
  instructions: z.string().optional(),
  isAnonymous: z.boolean().default(true),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
});

export const updateSurveySchema = createSurveySchema.partial().omit({ projectId: true });

export const submitResponseSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      value: z.unknown(),
      textValue: z.string().optional(),
      numericValue: z.number().optional(),
    })
  ),
});

export const sendInvitationsSchema = z.object({
  emails: z.array(z.string().email()),
});

export type CreateSurveyInput = z.infer<typeof createSurveySchema>;
export type UpdateSurveyInput = z.infer<typeof updateSurveySchema>;
export type SubmitResponseInput = z.infer<typeof submitResponseSchema>;
export type SendInvitationsInput = z.infer<typeof sendInvitationsSchema>;
