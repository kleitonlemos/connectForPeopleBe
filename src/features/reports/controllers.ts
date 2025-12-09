import type { FastifyReply, FastifyRequest } from 'fastify';
import { created, success } from '../../shared/utils/response.js';
import { reportsService } from './services.js';
import { generateReportSchema, updateSectionSchema } from './validators.js';

export const reportsController = {
  async listByProject(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { projectId } = request.query as { projectId: string };
    const reports = await reportsService.listByProject(projectId);
    success(reply, reports);
  },

  async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const report = await reportsService.getById(id);
    success(reply, report);
  },

  async generate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const data = generateReportSchema.parse(request.body);
    const report = await reportsService.generate(request.user.id, data);
    created(reply, report);
  },

  async updateSection(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id, sectionKey } = request.params as { id: string; sectionKey: string };
    const validSections = [
      'executive_summary',
      'cultural_analysis',
      'climate_indicators',
      'action_plan',
    ] as const;
    if (!validSections.includes(sectionKey as (typeof validSections)[number])) {
      throw new Error('Seção inválida');
    }
    const data = updateSectionSchema.parse(request.body);
    const report = await reportsService.updateSection(
      id,
      sectionKey as (typeof validSections)[number],
      data
    );
    success(reply, report);
  },

  async publish(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const report = await reportsService.publish(id);
    success(reply, report);
  },

  async getVersions(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const versions = await reportsService.getVersions(id);
    success(reply, versions);
  },

  async exportPdf(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { id } = request.params as { id: string };
    const url = await reportsService.exportPdf(id);
    success(reply, { exportUrl: url });
  },
};
