import type { FastifyInstance } from 'fastify';
import { authenticate, authorize } from '../../shared/middlewares/auth.js';
import { projectsController } from './controllers.js';

export async function projectsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: [authenticate] }, projectsController.list);
  app.get('/:id', { preHandler: [authenticate] }, projectsController.getById);
  app.post(
    '/',
    { preHandler: [authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    projectsController.create
  );
  app.put(
    '/:id',
    { preHandler: [authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT', 'CLIENT')] },
    projectsController.update
  );
  app.get('/:id/progress', { preHandler: [authenticate] }, projectsController.getProgress);
  app.get('/:id/checklist', { preHandler: [authenticate] }, projectsController.getChecklist);
  app.get('/:id/activities', { preHandler: [authenticate] }, projectsController.getActivities);
  app.post(
    '/:id/resend-onboarding-reminder',
    { preHandler: [authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    projectsController.resendOnboardingReminder
  );

  // Endpoint público para o Scheduler (protegido por SCHEDULER_API_KEY no controller)
  app.post('/process-onboarding-reminders', projectsController.processOnboardingReminders);

  app.delete(
    '/:id',
    { preHandler: [authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    projectsController.delete
  );
}
