import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../shared/middlewares/auth.js';
import { authController } from './controllers.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/login', authController.login);
  app.post('/register', authController.register);
  app.post('/forgot-password', authController.forgotPassword);
  app.post('/reset-password', authController.resetPassword);

  app.get('/me', { preHandler: [authenticate] }, authController.me);
  app.post('/change-password', { preHandler: [authenticate] }, authController.changePassword);
}
