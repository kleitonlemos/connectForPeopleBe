import type { UserRole } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ForbiddenError, UnauthorizedError } from '../errors/appError.js';

export interface JwtPayload {
  id: string;
  tenantId: string;
  organizationId: string | null;
  email: string;
  role: UserRole;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    throw new UnauthorizedError('Token inválido ou expirado');
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest): Promise<void> => {
    if (!request.user) {
      throw new UnauthorizedError();
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new ForbiddenError('Você não tem permissão para acessar este recurso');
    }
  };
}

export function tenantGuard(request: FastifyRequest): void {
  const tenantId = request.params as { tenantId?: string };

  if (tenantId.tenantId && request.user.tenantId !== tenantId.tenantId) {
    if (request.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenError('Acesso negado a este tenant');
    }
  }
}

export function organizationGuard(request: FastifyRequest): void {
  const organizationId = request.params as { organizationId?: string };

  if (
    organizationId.organizationId &&
    request.user.organizationId !== organizationId.organizationId
  ) {
    if (!['SUPER_ADMIN', 'ADMIN', 'CONSULTANT'].includes(request.user.role)) {
      throw new ForbiddenError('Acesso negado a esta organização');
    }
  }
}
