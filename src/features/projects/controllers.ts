import type { FastifyReply, FastifyRequest } from 'fastify';
import { created, success } from '../../shared/utils/response.js';
import { projectsService } from './services.js';
import { createProjectSchema, updateProjectSchema } from './validators.js';

export const projectsController = {
  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { organizationId, consultantId } = request.query as {
      organizationId?: string;
      consultantId?: string;
    };
    const projects = await projectsService.list(
      request.user.tenantId,
      {
        organizationId,
        consultantId,
      },
      request.user.role,
      request.user.organizationId ?? undefined
    );
    success(reply, projects);
  },

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const project = await projectsService.getById(id);
    success(reply, project);
  },

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = createProjectSchema.parse(request.body);
    const project = await projectsService.create(request.user.id, data);
    created(reply, project);
  },

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const data = updateProjectSchema.parse(request.body);
    const project = await projectsService.update(id, data);
    success(reply, project);
  },

  async getProgress(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const progress = await projectsService.getProgress(id);
    success(reply, progress);
  },

  async getChecklist(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const checklist = await projectsService.getChecklist(id);
    success(reply, checklist);
  },

  async getActivities(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const activities = await projectsService.getActivities(id);
    success(reply, activities);
  },

  async resendOnboardingReminder(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    await projectsService.resendOnboardingReminder(id);
    success(reply, { message: 'Lembrete enviado com sucesso' });
  },

  async processOnboardingReminders(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await projectsService.processOnboardingReminders();
    success(reply, { message: 'Processamento de lembretes concluído' });
  },

  async updateChecklistItemText(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { itemId } = request.params as { itemId: string };
    const { content } = request.body as { content: string };
    const item = await projectsService.updateChecklistItemText(itemId, content, request.user.id);
    success(reply, item);
  },

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    await projectsService.delete(id);
    success(reply, null);
  },
};
