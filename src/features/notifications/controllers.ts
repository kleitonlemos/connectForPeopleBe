import type { FastifyReply, FastifyRequest } from 'fastify';
import { success } from '../../shared/utils/response.js';
import { notificationService } from './services.js';

interface ListQuery {
  limit?: string;
  offset?: string;
  status?: string;
}

interface MarkReadParams {
  id: string;
}

export const notificationController = {
  async list(request: FastifyRequest<{ Querystring: ListQuery }>, reply: FastifyReply) {
    const userId = request.user!.id;
    const { limit, offset, status } = request.query;

    const result = await notificationService.list({
      userId,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      status: status as any,
    });

    success(reply, result);
  },

  async getUnreadCount(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const count = await notificationService.getUnreadCount(userId);
    success(reply, { count });
  },

  async markAsRead(request: FastifyRequest<{ Params: MarkReadParams }>, reply: FastifyReply) {
    const userId = request.user!.id;
    const { id } = request.params;
    await notificationService.markAsRead(id, userId);
    success(reply, { message: 'Notificação marcada como lida' });
  },

  async markAllAsRead(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    await notificationService.markAllAsRead(userId);
    success(reply, { message: 'Todas notificações marcadas como lidas' });
  },

  async delete(request: FastifyRequest<{ Params: MarkReadParams }>, reply: FastifyReply) {
    const userId = request.user!.id;
    const { id } = request.params;
    await notificationService.delete(id, userId);
    success(reply, { message: 'Notificação excluída' });
  },

  async runScheduledTasks(_request: FastifyRequest, reply: FastifyReply) {
    const deadlines = await notificationService.checkProjectDeadlines();
    const pending = await notificationService.checkPendingDocuments();

    success(reply, {
      message: 'Tarefas executadas',
      deadlinesChecked: deadlines,
      pendingDocumentsChecked: pending,
    });
  },
};
