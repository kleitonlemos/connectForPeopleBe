import { z } from 'zod';

const questionSchema = z.object({
  id: z.string().uuid().optional(),
  text: z.string().min(1),
  type: z.enum([
    'TEXT',
    'TEXTAREA',
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'SCALE',
    'NPS',
    'RATING',
    'DATE',
    'FILE',
  ]),
  isRequired: z.boolean().default(true),
  order: z.number().optional(),
  options: z.array(z.string()).optional(),
});

const sectionSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  indicator: z.string().optional(),
  order: z.number().optional(),
  questions: z.array(questionSchema),
});

export const createSurveySchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(['PARTNERS', 'LEADERSHIP', 'CLIMATE', 'CUSTOM']),
  name: z.string().min(2),
  description: z.string().optional(),
  instructions: z.string().optional(),
  isAnonymous: z.boolean().default(true),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  questions: z.array(questionSchema).optional(),
  sections: z.array(sectionSchema).optional(),
});

export const updateSurveySchema = createSurveySchema.partial().omit({ projectId: true });

export const submitResponseSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      value: z.unknown(),
      storagePath: z.string().optional().nullable(),
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
