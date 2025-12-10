import type { FastifyReply, FastifyRequest } from 'fastify';
import { success } from '../../shared/utils/response.js';
import { usersService } from './services.js';
import { listUsersSchema, updateUserSchema } from './validators.js';

export const usersController = {
  async list(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const query = listUsersSchema.parse(request.query);
    const users = await usersService.list(request.user.tenantId, query);
    success(reply, users);
  },

  async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const data = updateUserSchema.parse(request.body);
    const user = await usersService.update(request.user.tenantId, id, data);
    success(reply, user);
  },
};
