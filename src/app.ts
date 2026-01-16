import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { env } from './config/env.js';
import { aiRoutes } from './features/ai/routes.js';
import { authRoutes } from './features/auth/routes.js';
import { documentsRoutes } from './features/documents/routes.js';
import { emailsRoutes } from './features/emails/routes.js';
import { healthRoutes } from './features/health/routes.js';
import { interviewsRoutes } from './features/interviews/routes.js';
import { notificationsRoutes } from './features/notifications/routes.js';
import { organizationsRoutes } from './features/organizations/routes.js';
import { projectsRoutes } from './features/projects/routes.js';
import { reportsRoutes } from './features/reports/routes.js';
import { surveysRoutes } from './features/surveys/routes.js';
import { tenantsRoutes } from './features/tenants/routes.js';
import { usersRoutes } from './features/users/routes.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    transport:
      env.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
  onProtoPoisoning: 'remove',
  onConstructorPoisoning: 'remove',
});

// Registrar o parser de JSON customizado para permitir corpos vazios
app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
  if (typeof body === 'string' && body.trim() === '') {
    done(null, {});
    return;
  }
  try {
    const json = JSON.parse(body as string);
    done(null, json);
  } catch (err) {
    done(err as Error, null);
  }
});

const corsOrigin = env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map(o => o.trim());

await app.register(cors, {
  origin: corsOrigin,
  credentials: true,
});

await app.register(helmet);

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

await app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: { expiresIn: env.JWT_EXPIRES_IN },
});

await app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

app.setErrorHandler(errorHandler);

await app.register(healthRoutes, { prefix: '/api' });
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(tenantsRoutes, { prefix: '/api/tenants' });
await app.register(organizationsRoutes, { prefix: '/api/organizations' });
await app.register(projectsRoutes, { prefix: '/api/projects' });
await app.register(documentsRoutes, { prefix: '/api/documents' });
await app.register(surveysRoutes, { prefix: '/api/surveys' });
await app.register(interviewsRoutes, { prefix: '/api/interviews' });
await app.register(reportsRoutes, { prefix: '/api/reports' });
await app.register(emailsRoutes, { prefix: '/api/emails' });
await app.register(usersRoutes, { prefix: '/api/users' });
await app.register(aiRoutes, { prefix: '/api' });
await app.register(notificationsRoutes, { prefix: '/api' });

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

export { app };
