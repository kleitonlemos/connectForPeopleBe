import type { FastifyInstance } from 'fastify';
import { authenticate, authorize } from '../../shared/middlewares/auth.js';
import { interviewsController } from './controllers.js';

export async function interviewsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', interviewsController.listByProject);
  app.get('/:id', interviewsController.getById);
  app.post(
    '/',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    interviewsController.create
  );
  app.post(
    '/:id/transcription',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    interviewsController.uploadTranscription
  );
  app.post(
    '/:id/analyze',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    interviewsController.analyzeWithAI
  );
  app.delete(
    '/:id',
    { preHandler: [authorize('SUPER_ADMIN', 'ADMIN', 'CONSULTANT')] },
    interviewsController.delete
  );
}
