import type { FastifyReply, FastifyRequest } from 'fastify';
import { created, success } from '../../shared/utils/response.js';
import { organizationsService } from './services.js';
import {
  createOrganizationSchema,
  importTeamMembersSchema,
  updateOrganizationSchema,
} from './validators.js';

export const organizationsController = {
  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const orgs = await organizationsService.list(request.user.tenantId);
    success(reply, orgs);
  },

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const org = await organizationsService.getById(
      id,
      request.user.tenantId,
      request.user.role,
      request.user.organizationId ?? undefined
    );
    success(reply, org);
  },

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = createOrganizationSchema.parse(request.body);
    const org = await organizationsService.create(request.user.tenantId, data);
    created(reply, org);
  },

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const data = updateOrganizationSchema.parse(request.body);
    const org = await organizationsService.update(id, data);
    success(reply, org);
  },

  async listTeamMembers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const members = await organizationsService.listTeamMembers(id);
    success(reply, members);
  },

  async importTeamMembers(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const data = importTeamMembersSchema.parse(request.body);
    const count = await organizationsService.importTeamMembers(id, data);
    success(reply, { imported: count });
  },
};
