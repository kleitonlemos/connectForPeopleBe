import { z } from 'zod';

export const sendWelcomeEmailSchema = z.object({
  recipientName: z.string().min(1),
  recipientEmail: z.string().email(),
  projectName: z.string().min(1),
  companyName: z.string().min(1),
});

export const sendSurveyInviteSchema = z.object({
  recipientName: z.string().optional(),
  recipientEmail: z.string().email(),
  surveyName: z.string().min(1),
  surveyId: z.string().uuid(),
  companyName: z.string().min(1),
  deadline: z.string().optional(),
});

export const sendBulkSurveyInvitesSchema = z.object({
  surveyId: z.string().uuid(),
  surveyName: z.string().min(1),
  companyName: z.string().min(1),
  deadline: z.string().optional(),
  recipients: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      })
    )
    .min(1),
});

export const sendSurveyReminderSchema = z.object({
  recipientName: z.string().optional(),
  recipientEmail: z.string().email(),
  surveyName: z.string().min(1),
  surveyId: z.string().uuid(),
  companyName: z.string().min(1),
  deadline: z.string().optional(),
  daysRemaining: z.number().optional(),
});

export const sendReportPublishedSchema = z.object({
  recipientName: z.string().min(1),
  recipientEmail: z.string().email(),
  reportTitle: z.string().min(1),
  reportId: z.string().uuid(),
  companyName: z.string().min(1),
});

export const testEmailSchema = z.object({
  email: z.string().email(),
});

export type SendWelcomeEmailInput = z.infer<typeof sendWelcomeEmailSchema>;
export type SendSurveyInviteInput = z.infer<typeof sendSurveyInviteSchema>;
export type SendBulkSurveyInvitesInput = z.infer<typeof sendBulkSurveyInvitesSchema>;
export type SendSurveyReminderInput = z.infer<typeof sendSurveyReminderSchema>;
export type SendReportPublishedInput = z.infer<typeof sendReportPublishedSchema>;
export type TestEmailInput = z.infer<typeof testEmailSchema>;
