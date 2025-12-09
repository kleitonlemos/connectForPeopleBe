import type { FastifyInstance } from 'fastify';
import { authenticate, authorize } from '../../shared/middlewares/auth.js';
import { surveysController } from './controllers.js';

export async function surveysRoutes(app: FastifyInstance): Promise<void> {
  app.get('/public/:code', surveysController.getByAccessCode);
  app.post('/public/:code/respond', surveysController.submitResponse);

  app.register(async protectedRoutes => {
    protectedRoutes.addHook('preHandler', authenticate);

    protectedRoutes.get('/', surveysController.listByProject);
    protectedRoutes.get('/:id', surveysController.getById);
    protectedRoutes.post(
      '/',
      { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
      surveysController.create
    );
    protectedRoutes.put(
      '/:id',
      { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
      surveysController.update
    );
    protectedRoutes.post(
      '/:id/send-invitations',
      { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
      surveysController.sendInvitations
    );
    protectedRoutes.get('/:id/responses', surveysController.getResponses);
    protectedRoutes.get('/:id/statistics', surveysController.getStatistics);
  });
}
