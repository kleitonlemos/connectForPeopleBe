import type { DocumentChecklist, Prisma, Project, ProjectActivity } from '@prisma/client';
import { prisma } from '../../config/database.js';

export const projectsRepository = {
  async findAll(
    tenantId: string,
    filters?: { organizationId?: string; consultantId?: string }
  ): Promise<Project[]> {
    return prisma.project.findMany({
      where: {
        organization: { tenantId },
        ...(filters?.organizationId && { organizationId: filters.organizationId }),
        ...(filters?.consultantId && { consultantId: filters.consultantId }),
      },
      include: {
        organization: { select: { id: true, name: true, logoUrl: true } },
        consultant: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: { id },
      include: {
        organization: true,
        consultant: { select: { id: true, firstName: true, lastName: true, email: true } },
        clientUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  },

  async findByCode(code: string): Promise<Project | null> {
    return prisma.project.findUnique({
      where: { code },
    });
  },

  async create(data: Prisma.ProjectCreateInput): Promise<Project> {
    return prisma.project.create({ data });
  },

  async update(id: string, data: Prisma.ProjectUpdateInput): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.project.delete({
      where: { id },
    });
  },

  async findActivities(projectId: string): Promise<ProjectActivity[]> {
    return prisma.projectActivity.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  },

  async createActivity(data: Prisma.ProjectActivityCreateInput): Promise<ProjectActivity> {
    return prisma.projectActivity.create({ data });
  },

  async findChecklist(projectId: string): Promise<DocumentChecklist[]> {
    return prisma.documentChecklist.findMany({
      where: { projectId },
      include: {
        documents: { select: { id: true, fileName: true, fileUrl: true, status: true } },
      },
      orderBy: { order: 'asc' },
    });
  },

  async createChecklistItems(
    projectId: string,
    items: Array<{
      documentType: string;
      instructions?: string;
      order: number;
      isRequired?: boolean;
    }>
  ): Promise<number> {
    const result = await prisma.documentChecklist.createMany({
      data: items.map(item => ({
        projectId,
        documentType: item.documentType as Parameters<
          typeof prisma.documentChecklist.create
        >[0]['data']['documentType'],
        instructions: item.instructions,
        order: item.order,
        isRequired: item.isRequired ?? true,
      })),
    });
    return result.count;
  },

  async updateChecklistItem(
    id: string,
    data: Prisma.DocumentChecklistUpdateInput
  ): Promise<DocumentChecklist> {
    return prisma.documentChecklist.update({
      where: { id },
      data,
    });
  },
};
