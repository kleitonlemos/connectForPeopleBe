import type { FastifyInstance } from 'fastify';
import { authenticate, authorize } from '../../shared/middlewares/auth.js';
import { organizationsController } from './controllers.js';

export async function organizationsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get(
    '/',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    organizationsController.list
  );
  app.get('/:id', organizationsController.getById);
  app.post(
    '/',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    organizationsController.create
  );
  app.put(
    '/:id',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    organizationsController.update
  );
  app.get('/:id/team-members', organizationsController.listTeamMembers);
  app.post(
    '/:id/team-members/import',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    organizationsController.importTeamMembers
  );
}
