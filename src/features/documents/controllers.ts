import type { FastifyReply, FastifyRequest } from 'fastify';
import { created, noContent, success } from '../../shared/utils/response.js';
import { documentsService } from './services.js';
import { uploadDocumentSchema, validateDocumentSchema } from './validators.js';

export const documentsController = {
  async listByProject(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { projectId } = request.params as { projectId: string };
    const docs = await documentsService.listByProject(projectId);
    success(reply, docs);
  },

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const doc = await documentsService.getById(id);
    success(reply, doc);
  },

  async upload(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const file = await request.file();
    if (!file) {
      throw new Error('Arquivo não enviado');
    }

    const buffer = await file.toBuffer();
    const body = request.body as Record<string, unknown>;
    const metadata = uploadDocumentSchema.parse(JSON.parse((body['metadata'] as string) || '{}'));

    const doc = await documentsService.upload(
      metadata,
      buffer,
      file.filename,
      file.mimetype,
      request.user.id,
      request.user.organizationId ?? ''
    );

    created(reply, doc);
  },

  async validate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const data = validateDocumentSchema.parse(request.body);
    const doc = await documentsService.validate(id, request.user.id, data);
    success(reply, doc);
  },

  async delete(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    await documentsService.delete(id);
    noContent(reply);
  },
};
