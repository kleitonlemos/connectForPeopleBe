import type { Document, DocumentType } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/appError.js';
import { storageService } from '../../shared/services/storageService.js';
import { documentsRepository } from './repositories.js';
import type { UploadDocumentInput, ValidateDocumentInput } from './validators.js';

export const documentsService = {
  async listByProject(projectId: string): Promise<Document[]> {
    return documentsRepository.findByProject(projectId);
  },

  async getById(id: string): Promise<Document> {
    const doc = await documentsRepository.findById(id);
    if (!doc) {
      throw new NotFoundError('Documento');
    }
    return doc;
  },

  async upload(
    input: UploadDocumentInput,
    file: Buffer,
    fileName: string,
    mimeType: string,
    uploadedById: string,
    organizationId: string
  ): Promise<Document> {
    const { path, publicUrl } = await storageService.uploadDocument(
      file,
      fileName,
      mimeType,
      organizationId
    );

    return documentsRepository.create({
      project: { connect: { id: input.projectId } },
      organization: { connect: { id: organizationId } },
      uploadedBy: { connect: { id: uploadedById } },
      name: fileName,
      fileName,
      fileUrl: publicUrl,
      storagePath: path,
      fileSize: file.length,
      mimeType,
      type: input.documentType as DocumentType,
      description: input.description,
      status: 'UPLOADED',
    });
  },

  async validate(
    id: string,
    validatedById: string,
    input: ValidateDocumentInput
  ): Promise<Document> {
    const doc = await documentsRepository.findById(id);
    if (!doc) {
      throw new NotFoundError('Documento');
    }

    return documentsRepository.update(id, {
      status: input.status === 'APPROVED' ? 'VALIDATED' : 'REJECTED',
      validationNotes: input.validationNotes,
      validatedBy: { connect: { id: validatedById } },
    });
  },

  async delete(id: string): Promise<void> {
    const doc = await documentsRepository.findById(id);
    if (!doc) {
      throw new NotFoundError('Documento');
    }

    if (doc.storagePath) {
      await storageService.deleteFile('documents', doc.storagePath);
    }

    await documentsRepository.delete(id);
  },
};
