import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';
import {
  passwordResetTemplate,
  reportPublishedTemplate,
  surveyInviteTemplate,
  surveyReminderTemplate,
  welcomeTemplate,
} from './templates.js';
import type {
  BulkSendResult,
  EmailData,
  PasswordResetEmailData,
  ReportPublishedEmailData,
  SendEmailResult,
  SurveyInviteEmailData,
  SurveyReminderEmailData,
  WelcomeEmailData,
} from './types.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS) {
      throw new Error('Configuração SMTP incompleta. Verifique as variáveis de ambiente.');
    }
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendEmail(data: EmailData): Promise<SendEmailResult> {
  try {
    const transport = getTransporter();

    const recipients = Array.isArray(data.to) ? data.to : [data.to];
    const toAddresses = recipients
      .map(r => (r.name ? `"${r.name}" <${r.email}>` : r.email))
      .join(', ');

    const info = await transport.sendMail({
      from: env.SMTP_FROM,
      to: toAddresses,
      subject: data.subject,
      html: data.html,
      text: data.text,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao enviar e-mail:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

async function sendBulkEmails(emails: EmailData[]): Promise<BulkSendResult> {
  const result: BulkSendResult = {
    total: emails.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  for (const email of emails) {
    const sendResult = await sendEmail(email);

    if (sendResult.success) {
      result.sent++;
    } else {
      result.failed++;
      const recipient = Array.isArray(email.to) ? email.to[0]?.email : email.to.email;
      result.errors.push({
        email: recipient ?? 'unknown',
        error: sendResult.error ?? 'Erro desconhecido',
      });
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return result;
}

export const emailsService = {
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<SendEmailResult> {
    const template = welcomeTemplate(data);
    return sendEmail({
      to: { email: data.recipientEmail, name: data.recipientName },
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  },

  async sendSurveyInvite(data: SurveyInviteEmailData): Promise<SendEmailResult> {
    const template = surveyInviteTemplate(data);
    return sendEmail({
      to: { email: data.recipientEmail, name: data.recipientName },
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  },

  async sendBulkSurveyInvites(invites: SurveyInviteEmailData[]): Promise<BulkSendResult> {
    const emails = invites.map(data => {
      const template = surveyInviteTemplate(data);
      return {
        to: { email: data.recipientEmail, name: data.recipientName },
        subject: template.subject,
        html: template.html,
        text: template.text,
      };
    });

    return sendBulkEmails(emails);
  },

  async sendSurveyReminder(data: SurveyReminderEmailData): Promise<SendEmailResult> {
    const template = surveyReminderTemplate(data);
    return sendEmail({
      to: { email: data.recipientEmail, name: data.recipientName },
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  },

  async sendBulkSurveyReminders(reminders: SurveyReminderEmailData[]): Promise<BulkSendResult> {
    const emails = reminders.map(data => {
      const template = surveyReminderTemplate(data);
      return {
        to: { email: data.recipientEmail, name: data.recipientName },
        subject: template.subject,
        html: template.html,
        text: template.text,
      };
    });

    return sendBulkEmails(emails);
  },

  async sendReportPublished(data: ReportPublishedEmailData): Promise<SendEmailResult> {
    const template = reportPublishedTemplate(data);
    return sendEmail({
      to: { email: data.recipientEmail, name: data.recipientName },
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  },

  async sendPasswordReset(data: PasswordResetEmailData): Promise<SendEmailResult> {
    const template = passwordResetTemplate(data);
    return sendEmail({
      to: { email: data.recipientEmail, name: data.recipientName },
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  },

  async verifyConnection(): Promise<boolean> {
    try {
      const transport = getTransporter();
      await transport.verify();
      return true;
    } catch (error) {
      console.error('Erro ao verificar conexão SMTP:', error);
      return false;
    }
  },
};
