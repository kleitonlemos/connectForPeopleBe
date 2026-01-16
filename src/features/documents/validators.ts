import { DocumentType } from '@prisma/client';
import { z } from 'zod';

export const uploadDocumentSchema = z.object({
  projectId: z.string().uuid(),
  checklistItemId: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(''))
    .transform(val => (val === '' ? undefined : val)),
  documentType: z.nativeEnum(DocumentType),
  description: z.string().optional().nullable(),
  mapping: z.record(z.string()).optional(),
});

export const validateDocumentSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  validationNotes: z.string().optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
export type ValidateDocumentInput = z.infer<typeof validateDocumentSchema>;
