import type { Interview, Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';

export const interviewsRepository = {
  async findByProject(projectId: string): Promise<Interview[]> {
    return prisma.interview.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string): Promise<Interview | null> {
    return prisma.interview.findUnique({
      where: { id },
      include: {
        aiConversation: true,
      },
    });
  },

  async create(data: Prisma.InterviewCreateInput): Promise<Interview> {
    return prisma.interview.create({ data });
  },

  async update(id: string, data: Prisma.InterviewUpdateInput): Promise<Interview> {
    return prisma.interview.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.interview.delete({
      where: { id },
    });
  },
};
