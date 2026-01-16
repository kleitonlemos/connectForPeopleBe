import type { FastifyReply, FastifyRequest } from 'fastify';
import { created, noContent, success } from '../../shared/utils/response.js';
import { tenantsService } from './services.js';
import { createTenantSchema, updateTenantSchema } from './validators.js';

export const tenantsController = {
  async list(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const tenants = await tenantsService.list();
    success(reply, tenants);
  },

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const tenant = await tenantsService.getById(id);
    success(reply, tenant);
  },

  async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = createTenantSchema.parse(request.body);
    const tenant = await tenantsService.create(data);
    created(reply, tenant);
  },

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const data = updateTenantSchema.parse(request.body);
    const tenant = await tenantsService.update(id, data);
    success(reply, tenant);
  },

  async uploadLogo(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const part = await request.file();

    if (!part) {
      throw new Error('Arquivo não enviado');
    }

    const buffer = await part.toBuffer();
    const tenant = await tenantsService.uploadLogo(id, buffer, part.filename, part.mimetype);
    success(reply, tenant);
  },

  async uploadFavicon(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const part = await request.file();

    if (!part) {
      throw new Error('Arquivo não enviado');
    }

    const buffer = await part.toBuffer();
    const tenant = await tenantsService.uploadFavicon(id, buffer, part.filename, part.mimetype);
    success(reply, tenant);
  },

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    await tenantsService.delete(id);
    noContent(reply);
  },
};
