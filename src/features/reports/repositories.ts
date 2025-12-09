import type { Prisma, Report, ReportVersion } from '@prisma/client';
import { prisma } from '../../config/database.js';

export const reportsRepository = {
  async findByProject(projectId: string): Promise<Report[]> {
    return prisma.report.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string): Promise<Report | null> {
    return prisma.report.findUnique({
      where: { id },
    });
  },

  async create(data: Prisma.ReportCreateInput): Promise<Report> {
    return prisma.report.create({ data });
  },

  async update(id: string, data: Prisma.ReportUpdateInput): Promise<Report> {
    return prisma.report.update({
      where: { id },
      data,
    });
  },

  async findVersions(reportId: string): Promise<ReportVersion[]> {
    return prisma.reportVersion.findMany({
      where: { reportId },
      orderBy: { version: 'desc' },
    });
  },

  async createVersion(data: Prisma.ReportVersionCreateInput): Promise<ReportVersion> {
    return prisma.reportVersion.create({ data });
  },
};
