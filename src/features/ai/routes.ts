import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.js';
import { aiController } from './controllers.js';

export async function aiRoutes(app: FastifyInstance) {
  app.post('/ai/chat', { preHandler: [authenticate] }, aiController.chat as any);
  app.get(
    '/ai/conversations',
    { preHandler: [authenticate] },
    aiController.listConversations as any
  );
  app.get(
    '/ai/conversations/:id/messages',
    { preHandler: [authenticate] },
    aiController.getMessages as any
  );
}
