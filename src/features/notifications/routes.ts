import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.js';
import { notificationController } from './controllers.js';

export async function notificationsRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: [authenticate] }, notificationController.list as any);
  app.get(
    '/notifications/unread-count',
    { preHandler: [authenticate] },
    notificationController.getUnreadCount as any
  );
  app.patch(
    '/notifications/:id/read',
    { preHandler: [authenticate] },
    notificationController.markAsRead as any
  );
  app.patch(
    '/notifications/read-all',
    { preHandler: [authenticate] },
    notificationController.markAllAsRead as any
  );
  app.delete(
    '/notifications/:id',
    { preHandler: [authenticate] },
    notificationController.delete as any
  );

  app.post('/notifications/scheduler', notificationController.runScheduledTasks as any);
}
