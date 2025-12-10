import type { FastifyInstance } from 'fastify';
import { authenticate, authorize } from '../../shared/middlewares/auth.js';
import { usersController } from './controllers.js';

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', { preHandler: [authorize('SUPER_ADMIN', 'ADMIN')] }, usersController.list);

  app.put('/:id', { preHandler: [authorize('SUPER_ADMIN', 'ADMIN')] }, usersController.update);
}
