import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  projectId: z.string().uuid(),
  checklistItemId: z.string().uuid().optional(),
  documentType: z.string(),
  description: z.string().optional(),
});

export const validateDocumentSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  validationNotes: z.string().optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type ValidateDocumentInput = z.infer<typeof validateDocumentSchema>;
