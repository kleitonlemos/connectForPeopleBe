import type { FastifyInstance } from 'fastify';
import { authenticate, authorize, cronOrAuthorize } from '../../shared/middlewares/auth.js';
import { surveysController } from './controllers.js';

export async function surveysRoutes(app: FastifyInstance): Promise<void> {
  app.get('/public/:code', surveysController.getByAccessCode);
  app.post('/public/:code/respond', surveysController.submitResponse);

  app.register(async protectedRoutes => {
    protectedRoutes.get('/', { preHandler: [authenticate] }, surveysController.listByProject);
    protectedRoutes.get('/:id', { preHandler: [authenticate] }, surveysController.getById);
    protectedRoutes.post(
      '/',
      { preHandler: [authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
      surveysController.create
    );
    protectedRoutes.put(
      '/:id',
      { preHandler: [authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
      surveysController.update
    );
    protectedRoutes.post(
      '/:id/send-invitations',
      { preHandler: [authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
      surveysController.sendInvitations
    );
    protectedRoutes.post(
      '/:id/send-reminders',
      { preHandler: [cronOrAuthorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
      surveysController.sendReminders
    );
    protectedRoutes.get(
      '/:id/responses',
      { preHandler: [authenticate] },
      surveysController.getResponses
    );
    protectedRoutes.get(
      '/:id/statistics',
      { preHandler: [authenticate] },
      surveysController.getStatistics
    );
  });
}
