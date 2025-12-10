import type { Report, ReportVersion } from '@prisma/client';
import { env } from '../../config/env.js';
import { NotFoundError } from '../../shared/errors/appError.js';
import { aiService } from '../ai/services.js';
import { authRepository } from '../auth/repositories.js';
import { emailsService } from '../emails/services.js';
import { organizationsRepository } from '../organizations/repositories.js';
import { projectsRepository } from '../projects/repositories.js';
import { reportsRepository } from './repositories.js';
import type { GenerateReportInput, UpdateSectionInput } from './validators.js';

type ReportSectionType =
  | 'executive_summary'
  | 'cultural_analysis'
  | 'climate_indicators'
  | 'action_plan';

export const reportsService = {
  async listByProject(projectId: string): Promise<Report[]> {
    return reportsRepository.findByProject(projectId);
  },

  async getById(id: string): Promise<Report> {
    const report = await reportsRepository.findById(id);
    if (!report) {
      throw new NotFoundError('Relatório');
    }
    return report;
  },

  async generate(createdById: string, input: GenerateReportInput): Promise<Report> {
    const executiveSummary = await aiService.generateReportSection(
      input.projectId,
      'executive_summary',
      { instructions: 'Gere um resumo executivo inicial baseado nos dados coletados.' }
    );

    return reportsRepository.create({
      project: { connect: { id: input.projectId } },
      createdBy: { connect: { id: createdById } },
      title: input.title,
      executiveSummary,
      status: 'DRAFT',
    });
  },

  async updateSection(
    id: string,
    sectionKey: ReportSectionType,
    input: UpdateSectionInput
  ): Promise<Report> {
    const report = await reportsRepository.findById(id);
    if (!report) {
      throw new NotFoundError('Relatório');
    }

    const updateData: Record<string, string> = {};
    const sectionFieldMap: Record<ReportSectionType, string> = {
      executive_summary: 'executiveSummary',
      cultural_analysis: 'culturalAnalysis',
      climate_indicators: 'qualitativeAnalysis',
      action_plan: 'actionPlan',
    };

    const fieldName = sectionFieldMap[sectionKey];
    if (fieldName) {
      updateData[fieldName] = input.content;
    }

    return reportsRepository.update(id, updateData);
  },

  async publish(id: string): Promise<Report> {
    const report = await reportsRepository.findById(id);
    if (!report) {
      throw new NotFoundError('Relatório');
    }

    const currentVersion = report.version;
    await reportsRepository.createVersion({
      report: { connect: { id } },
      version: currentVersion,
      content: {
        executiveSummary: report.executiveSummary,
        culturalAnalysis: report.culturalAnalysis,
        climateIndicators: report.climateIndicators,
        qualitativeAnalysis: report.qualitativeAnalysis,
        actionPlan: report.actionPlan,
      },
      changedBy: 'system',
    });

    const updated = await reportsRepository.update(id, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      version: { increment: 1 },
    });

    try {
      const project = await projectsRepository.findById(report.projectId);

      if (!project) {
        throw new NotFoundError('Projeto');
      }

      const organization = await organizationsRepository.findById(project.organizationId);

      const clientUser = project.clientUserId
        ? await authRepository.findById(project.clientUserId)
        : null;

      const recipientEmail = clientUser?.email ?? organization?.contactEmail;
      const companyName = organization?.name ?? 'Organização';

      if (recipientEmail) {
        const recipientName = clientUser
          ? `${clientUser.firstName} ${clientUser.lastName}`
          : companyName;

        await emailsService.sendReportPublished({
          recipientName,
          recipientEmail,
          reportTitle: updated.title,
          reportUrl: `${env.FRONTEND_URL}/dashboard/reports/${updated.id}`,
          companyName,
        });
      }
    } catch (error) {
      console.error('Erro ao enviar e-mail de relatório publicado', error);
    }

    return updated;
  },

  async getVersions(id: string): Promise<ReportVersion[]> {
    return reportsRepository.findVersions(id);
  },

  async exportPdf(id: string): Promise<string> {
    const report = await reportsRepository.findById(id);
    if (!report) {
      throw new NotFoundError('Relatório');
    }

    return `export-url-placeholder-${id}`;
  },
};
