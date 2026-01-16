import type { Document } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { NotFoundError } from '../../shared/errors/appError.js';
import { storageService } from '../../shared/services/storageService.js';
import { transformDocumentUrls, transformDocumentsUrls } from '../../shared/utils/storage.js';
import { documentsRepository } from './repositories.js';
import type { UploadDocumentInput, ValidateDocumentInput } from './validators.js';

export const documentsService = {
  async listByProject(projectId: string): Promise<Document[]> {
    const docs = await documentsRepository.findByProject(projectId);
    return transformDocumentsUrls(docs);
  },

  async getById(id: string): Promise<Document> {
    const doc = await documentsRepository.findById(id);
    if (!doc) {
      throw new NotFoundError('Documento');
    }
    return transformDocumentUrls(doc);
  },

  async upload(
    input: UploadDocumentInput,
    file: Buffer,
    fileName: string,
    mimeType: string,
    uploadedById: string,
    organizationId: string
  ): Promise<Document> {
    // Se organizationId não foi fornecido, buscar do projeto
    let finalOrganizationId = organizationId;

    if (!finalOrganizationId) {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { organizationId: true },
      });

      if (!project) {
        throw new NotFoundError('Projeto');
      }

      finalOrganizationId = project.organizationId;
    }

    const { path } = await storageService.uploadDocument(
      file,
      fileName,
      mimeType,
      finalOrganizationId
    );

    // Se checklistItemId não foi fornecido mas temos o documentType, tentar encontrar
    let finalChecklistItemId = input.checklistItemId;
    if (!finalChecklistItemId) {
      const checklistItem = await prisma.documentChecklist.findUnique({
        where: {
          projectId_documentType: {
            projectId: input.projectId,
            documentType: input.documentType,
          },
        },
        select: { id: true },
      });

      if (checklistItem) {
        finalChecklistItemId = checklistItem.id;
      }
    }

    const doc = await documentsRepository.create({
      project: { connect: { id: input.projectId } },
      organization: { connect: { id: finalOrganizationId } },
      uploadedBy: { connect: { id: uploadedById } },
      ...(finalChecklistItemId && {
        checklistItem: { connect: { id: finalChecklistItemId } },
      }),
      name: fileName,
      fileName,
      fileUrl: '', // Não salvamos mais a URL fixa no banco
      storagePath: path,
      fileSize: file.length,
      mimeType,
      type: input.documentType,
      description: input.description,
      status: 'UPLOADED',
      metadata: input.mapping ? { mapping: input.mapping } : {},
    });

    // Atualizar status do item no checklist se existir
    if (finalChecklistItemId) {
      await prisma.documentChecklist.update({
        where: { id: finalChecklistItemId },
        data: { status: 'UPLOADED' },
      });
    }

    return transformDocumentUrls(doc);
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
      await storageService.deleteFile(env.GCS_BUCKET_DOCUMENTS, doc.storagePath);
    }

    await documentsRepository.delete(id);
  },
};
