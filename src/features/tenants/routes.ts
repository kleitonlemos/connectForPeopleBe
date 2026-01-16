import type { FastifyInstance } from 'fastify';
import { authenticate, authorize } from '../../shared/middlewares/auth.js';
import { tenantsController } from './controllers.js';

export async function tenantsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', { preHandler: [authorize('SUPER_ADMIN')] }, tenantsController.list);
  app.get('/:id', { preHandler: [authorize('SUPER_ADMIN', 'ADMIN')] }, tenantsController.getById);
  app.post('/', { preHandler: [authorize('SUPER_ADMIN')] }, tenantsController.create);
  app.put('/:id', { preHandler: [authorize('SUPER_ADMIN')] }, tenantsController.update);

  app.post('/:id/logo', { preHandler: [authorize('SUPER_ADMIN')] }, tenantsController.uploadLogo);
  app.post(
    '/:id/favicon',
    { preHandler: [authorize('SUPER_ADMIN')] },
    tenantsController.uploadFavicon
  );

  app.delete('/:id', { preHandler: [authorize('SUPER_ADMIN')] }, tenantsController.delete);
}
