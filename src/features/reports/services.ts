import type { Report, ReportVersion } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/appError.js';
import { aiService } from '../ai/services.js';
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

    return reportsRepository.update(id, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
      version: { increment: 1 },
    });
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
