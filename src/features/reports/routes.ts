import type { FastifyInstance } from 'fastify';
import { authenticate, authorize } from '../../shared/middlewares/auth.js';
import { reportsController } from './controllers.js';

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', reportsController.listByProject);
  app.get('/:id', reportsController.getById);
  app.post(
    '/generate',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    reportsController.generate
  );
  app.put(
    '/:id/sections/:sectionKey',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    reportsController.updateSection
  );
  app.post(
    '/:id/publish',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    reportsController.publish
  );
  app.get('/:id/export', reportsController.exportPdf);
  app.get('/:id/versions', reportsController.getVersions);
}
