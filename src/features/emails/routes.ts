import type { FastifyInstance } from 'fastify';
import { authenticate, authorize } from '../../shared/middlewares/auth.js';
import { emailsController } from './controllers.js';

export async function emailsRoutes(app: FastifyInstance): Promise<void> {
  app.register(async protectedRoutes => {
    protectedRoutes.addHook('preHandler', authenticate);

    protectedRoutes.post(
      '/welcome',
      { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
      emailsController.sendWelcome
    );

    protectedRoutes.post(
      '/survey-invite',
      { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
      emailsController.sendSurveyInvite
    );

    protectedRoutes.post(
      '/survey-invites/bulk',
      { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
      emailsController.sendBulkSurveyInvites
    );

    protectedRoutes.post(
      '/survey-reminder',
      { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
      emailsController.sendSurveyReminder
    );

    protectedRoutes.post(
      '/report-published',
      { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
      emailsController.sendReportPublished
    );

    protectedRoutes.get(
      '/test-connection',
      { preHandler: [authorize('SUPER_ADMIN', 'ADMIN')] },
      emailsController.testConnection
    );

    protectedRoutes.post(
      '/test',
      { preHandler: [authorize('SUPER_ADMIN', 'ADMIN')] },
      emailsController.sendTestEmail
    );
  });
}
