import type { FastifyReply } from 'fastify';

interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
    totalPages?: number;
  };
}

interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
}

export function success<T>(reply: FastifyReply, data: T, statusCode = 200): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
  };
  reply.status(statusCode).send(response);
}

export function created<T>(reply: FastifyReply, data: T): void {
  success(reply, data, 201);
}

export function noContent(reply: FastifyReply): void {
  reply.status(204).send();
}

export function paginated<T>(reply: FastifyReply, data: T[], meta: PaginationMeta): void {
  const response: SuccessResponse<T[]> = {
    success: true,
    data,
    meta: {
      page: meta.page,
      perPage: meta.perPage,
      total: meta.total,
      totalPages: Math.ceil(meta.total / meta.perPage),
    },
  };
  reply.status(200).send(response);
}
