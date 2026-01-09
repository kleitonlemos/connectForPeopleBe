import type { FastifyInstance } from 'fastify';
import { authenticate, authorize } from '../../shared/middlewares/auth.js';
import { projectsController } from './controllers.js';

export async function projectsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', projectsController.list);
  app.get('/:id', projectsController.getById);
  app.post(
    '/',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    projectsController.create
  );
  app.put(
    '/:id',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT', 'CLIENT')] },
    projectsController.update
  );
  app.get('/:id/progress', projectsController.getProgress);
  app.get('/:id/checklist', projectsController.getChecklist);
  app.get('/:id/activities', projectsController.getActivities);
  app.delete(
    '/:id',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    projectsController.delete
  );
}
