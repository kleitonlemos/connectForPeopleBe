import type { Document, Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';

export const documentsRepository = {
  async findByProject(projectId: string): Promise<Document[]> {
    return prisma.document.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string): Promise<Document | null> {
    return prisma.document.findUnique({
      where: { id },
    });
  },

  async create(data: Prisma.DocumentCreateInput): Promise<Document> {
    return prisma.document.create({ data });
  },

  async update(id: string, data: Prisma.DocumentUpdateInput): Promise<Document> {
    return prisma.document.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.document.delete({
      where: { id },
    });
  },
};
