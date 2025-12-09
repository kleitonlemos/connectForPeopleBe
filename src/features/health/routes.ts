import type { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_, reply) => {
    const dbHealth = await checkDatabase();

    const response = {
      status: dbHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth ? 'up' : 'down',
      },
    };

    reply.status(dbHealth ? 200 : 503).send(response);
  });
}

async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
