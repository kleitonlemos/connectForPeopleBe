import type { FastifyReply, FastifyRequest } from 'fastify';
import { created, noContent, success } from '../../shared/utils/response.js';
import { interviewsService } from './services.js';
import { createInterviewSchema, uploadTranscriptionSchema } from './validators.js';

export const interviewsController = {
  async listByProject(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { projectId } = request.query as { projectId: string };
    const interviews = await interviewsService.listByProject(projectId);
    success(reply, interviews);
  },

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const interview = await interviewsService.getById(id);
    success(reply, interview);
  },

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = createInterviewSchema.parse(request.body);
    const interview = await interviewsService.create(data, request.user.id);
    created(reply, interview);
  },

  async uploadTranscription(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const data = uploadTranscriptionSchema.parse(request.body);
    const interview = await interviewsService.uploadTranscription(id, data);
    success(reply, interview);
  },

  async analyzeWithAI(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const interview = await interviewsService.analyzeWithAI(id);
    success(reply, interview);
  },

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    await interviewsService.delete(id);
    noContent(reply);
  },
};
