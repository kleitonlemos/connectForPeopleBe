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
    try {
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

      // Fallback para MIME type genérico baseado na extensão
      let finalMimeType = mimeType;
      if (mimeType === 'application/octet-stream' || !mimeType) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'xlsx')
          finalMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        else if (ext === 'xls') finalMimeType = 'application/vnd.ms-excel';
        else if (ext === 'csv') finalMimeType = 'text/csv';
      }

      console.log('Document upload request:', { fileName, mimeType: finalMimeType, metadataStr });

      let metadata;
      try {
        metadata = uploadDocumentSchema.parse(JSON.parse(metadataStr));
      } catch (e) {
        console.error('Error parsing metadata:', metadataStr, e);
        throw e;
      }

      const doc = await documentsService.upload(
        metadata,
        fileBuffer,
        fileName,
        finalMimeType,
        request.user.id,
        request.user.organizationId ?? ''
      );

      created(reply, doc);
    } catch (error) {
      console.error('Upload error in controller:', error);
      throw error;
    }
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
