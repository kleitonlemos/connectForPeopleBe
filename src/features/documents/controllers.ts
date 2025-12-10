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
    const parts = request.parts();
    let fileBuffer: Buffer | null = null;
    let fileName = '';
    let mimeType = '';
    let metadataStr = '{}';

    for await (const part of parts) {
      if (part.type === 'file') {
        fileBuffer = await part.toBuffer();
        fileName = part.filename;
        mimeType = part.mimetype;
      } else if (part.fieldname === 'metadata') {
        metadataStr = part.value as string;
      }
    }

    if (!fileBuffer) {
      throw new Error('Arquivo não enviado');
    }

    const metadata = uploadDocumentSchema.parse(JSON.parse(metadataStr));

    const doc = await documentsService.upload(
      metadata,
      fileBuffer,
      fileName,
      mimeType,
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
