export type EmailType =
  | 'WELCOME'
  | 'SURVEY_INVITE'
  | 'SURVEY_REMINDER'
  | 'REPORT_PUBLISHED'
  | 'PASSWORD_RESET'
  | 'ACCOUNT_ACTIVATED';

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailData {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
}

export interface WelcomeEmailData {
  recipientName: string;
  recipientEmail: string;
  projectName: string;
  companyName: string;
  loginUrl: string;
}

export interface SurveyInviteEmailData {
  recipientName?: string;
  recipientEmail: string;
  surveyName: string;
  surveyUrl: string;
  companyName: string;
  deadline?: string;
}

export interface SurveyReminderEmailData {
  recipientName?: string;
  recipientEmail: string;
  surveyName: string;
  surveyUrl: string;
  companyName: string;
  deadline?: string;
  daysRemaining?: number;
}

export interface ReportPublishedEmailData {
  recipientName: string;
  recipientEmail: string;
  reportTitle: string;
  reportUrl: string;
  companyName: string;
}

export interface PasswordResetEmailData {
  recipientName: string;
  recipientEmail: string;
  resetUrl: string;
}

export interface AccountActivatedEmailData {
  recipientName: string;
  recipientEmail: string;
  loginUrl: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkSendResult {
  total: number;
  sent: number;
  failed: number;
  errors: { email: string; error: string }[];
}
