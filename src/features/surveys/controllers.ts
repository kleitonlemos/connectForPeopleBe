import type { FastifyReply, FastifyRequest } from 'fastify';
import { created, success } from '../../shared/utils/response.js';
import { surveysService } from './services.js';
import {
  createSurveySchema,
  sendInvitationsSchema,
  submitResponseSchema,
  updateSurveySchema,
} from './validators.js';

export const surveysController = {
  async listByProject(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { projectId } = request.query as { projectId: string };
    const surveys = await surveysService.listByProject(projectId);
    success(reply, surveys);
  },

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const survey = await surveysService.getById(id);
    success(reply, survey);
  },

  async getByAccessCode(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { code } = request.params as { code: string };
    const survey = await surveysService.getByAccessCode(code);
    success(reply, survey);
  },

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = createSurveySchema.parse(request.body);
    const survey = await surveysService.create(data);
    created(reply, survey);
  },

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const data = updateSurveySchema.parse(request.body);
    const survey = await surveysService.update(id, data);
    success(reply, survey);
  },

  async submitResponse(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { code } = request.params as { code: string };
    const data = submitResponseSchema.parse(request.body);
    const response = await surveysService.submitResponse(code, null, data);
    created(reply, response);
  },

  async getResponses(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const responses = await surveysService.getResponses(id);
    success(reply, responses);
  },

  async getStatistics(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const stats = await surveysService.getStatistics(id);
    success(reply, stats);
  },

  async uploadResponseFile(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { code } = request.params as { code: string };
    const part = await request.file();

    if (!part) {
      throw new Error('Arquivo não enviado');
    }

    const buffer = await part.toBuffer();
    const result = await surveysService.uploadResponseFile(
      code,
      buffer,
      part.filename,
      part.mimetype
    );
    success(reply, result);
  },

  async sendInvitations(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const data = sendInvitationsSchema.parse(request.body);
    const count = await surveysService.sendInvitations(id, data);
    success(reply, { sent: count });
  },

  async sendReminders(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const count = await surveysService.sendReminders(id);
    success(reply, { sent: count });
  },

  async sendAllReminders(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await surveysService.sendAllReminders();
    success(reply, result);
  },

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    await surveysService.delete(id);
    success(reply, { deleted: true });
  },
};
