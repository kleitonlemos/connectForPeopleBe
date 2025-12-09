import type { FastifyInstance } from 'fastify';
import { authenticate, authorize } from '../../shared/middlewares/auth.js';
import { documentsController } from './controllers.js';

export async function documentsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/project/:projectId', documentsController.listByProject);
  app.get('/:id', documentsController.getById);
  app.post('/', documentsController.upload);
  app.put(
    '/:id/validate',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    documentsController.validate
  );
  app.delete(
    '/:id',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    documentsController.delete
  );
}
