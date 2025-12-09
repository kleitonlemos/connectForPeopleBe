import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { env } from '../../config/env.js';
import { AppError, ValidationError } from '../errors/appError.js';

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    errors?: Record<string, string[]>;
    stack?: string;
  };
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  request.log.error(error);

  const response: ErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor',
    },
  };

  let statusCode = 500;

  if (error instanceof ValidationError) {
    statusCode = error.statusCode;
    response.error = {
      code: error.code,
      message: error.message,
      errors: error.errors,
    };
  } else if (error instanceof AppError) {
    statusCode = error.statusCode;
    response.error = {
      code: error.code,
      message: error.message,
    };
  } else if (error instanceof ZodError) {
    statusCode = 422;
    const fieldErrors: Record<string, string[]> = {};

    error.errors.forEach(err => {
      const path = err.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(err.message);
    });

    response.error = {
      code: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      errors: fieldErrors,
    };
  } else if (error.statusCode) {
    statusCode = error.statusCode;
    response.error.message = error.message;
  }

  if (env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  reply.status(statusCode).send(response);
}
