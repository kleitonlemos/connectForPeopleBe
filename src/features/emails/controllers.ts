import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../../config/env.js';
import { success } from '../../shared/utils/response.js';
import { emailsService } from './services.js';
import {
  sendBulkSurveyInvitesSchema,
  sendReportPublishedSchema,
  sendSurveyInviteSchema,
  sendSurveyReminderSchema,
  sendWelcomeEmailSchema,
  testEmailSchema,
} from './validators.js';

export const emailsController = {
  async sendWelcome(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = sendWelcomeEmailSchema.parse(request.body);

    const result = await emailsService.sendWelcomeEmail({
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      projectName: data.projectName,
      companyName: data.companyName,
      loginUrl: `${env.FRONTEND_URL}/login`,
    });

    if (!result.success) {
      reply.status(500).send({ error: 'Erro ao enviar e-mail', details: result.error });
      return;
    }

    success(reply, { messageId: result.messageId });
  },

  async sendSurveyInvite(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = sendSurveyInviteSchema.parse(request.body);

    const result = await emailsService.sendSurveyInvite({
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      surveyName: data.surveyName,
      surveyUrl: `${env.FRONTEND_URL}/survey/${data.surveyId}`,
      companyName: data.companyName,
      deadline: data.deadline,
    });

    if (!result.success) {
      reply.status(500).send({ error: 'Erro ao enviar e-mail', details: result.error });
      return;
    }

    success(reply, { messageId: result.messageId });
  },

  async sendBulkSurveyInvites(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = sendBulkSurveyInvitesSchema.parse(request.body);

    const invites = data.recipients.map(r => ({
      recipientName: r.name,
      recipientEmail: r.email,
      surveyName: data.surveyName,
      surveyUrl: `${env.FRONTEND_URL}/survey/${data.surveyId}`,
      companyName: data.companyName,
      deadline: data.deadline,
    }));

    const result = await emailsService.sendBulkSurveyInvites(invites);
    success(reply, result);
  },

  async sendSurveyReminder(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = sendSurveyReminderSchema.parse(request.body);

    const result = await emailsService.sendSurveyReminder({
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      surveyName: data.surveyName,
      surveyUrl: `${env.FRONTEND_URL}/survey/${data.surveyId}`,
      companyName: data.companyName,
      deadline: data.deadline,
      daysRemaining: data.daysRemaining,
    });

    if (!result.success) {
      reply.status(500).send({ error: 'Erro ao enviar e-mail', details: result.error });
      return;
    }

    success(reply, { messageId: result.messageId });
  },

  async sendReportPublished(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = sendReportPublishedSchema.parse(request.body);

    const result = await emailsService.sendReportPublished({
      recipientName: data.recipientName,
      recipientEmail: data.recipientEmail,
      reportTitle: data.reportTitle,
      reportUrl: `${env.FRONTEND_URL}/report/${data.reportId}`,
      companyName: data.companyName,
    });

    if (!result.success) {
      reply.status(500).send({ error: 'Erro ao enviar e-mail', details: result.error });
      return;
    }

    success(reply, { messageId: result.messageId });
  },

  async testConnection(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const isConnected = await emailsService.verifyConnection();

    if (!isConnected) {
      reply.status(500).send({ success: false, message: 'Falha na conexão SMTP' });
      return;
    }

    success(reply, { message: 'Conexão SMTP OK' });
  },

  async sendTestEmail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = testEmailSchema.parse(request.body);

    const result = await emailsService.sendWelcomeEmail({
      recipientName: 'Teste',
      recipientEmail: data.email,
      projectName: 'Projeto de Teste',
      companyName: 'Empresa Teste',
      loginUrl: `${env.FRONTEND_URL}/login`,
    });

    if (!result.success) {
      reply.status(500).send({ success: false, error: result.error });
      return;
    }

    success(reply, { message: 'E-mail de teste enviado com sucesso', messageId: result.messageId });
  },
};
