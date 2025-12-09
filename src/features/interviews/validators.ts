import { z } from 'zod';

export const createInterviewSchema = z.object({
  projectId: z.string().uuid(),
  intervieweeName: z.string().min(2),
  intervieweeRole: z.string().optional(),
  intervieweeEmail: z.string().email().optional(),
  interviewDate: z.string().optional(),
  duration: z.number().optional(),
  format: z.enum(['IN_PERSON', 'VIDEO_CALL', 'PHONE']).optional(),
});

export const uploadTranscriptionSchema = z.object({
  transcription: z.string().min(10),
});

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type UploadTranscriptionInput = z.infer<typeof uploadTranscriptionSchema>;
