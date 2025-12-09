import type { DocumentChecklist, Project, ProjectActivity } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/appError.js';
import { generateProjectCode } from '../../shared/utils/generateCode.js';
import { projectsRepository } from './repositories.js';
import type { CreateProjectInput, UpdateProjectInput } from './validators.js';

export const projectsService = {
  async list(
    tenantId: string,
    filters?: { organizationId?: string; consultantId?: string }
  ): Promise<Project[]> {
    return projectsRepository.findAll(tenantId, filters);
  },

  async getById(id: string): Promise<Project> {
    const project = await projectsRepository.findById(id);
    if (!project) {
      throw new NotFoundError('Projeto');
    }
    return project;
  },

  async create(consultantId: string, input: CreateProjectInput): Promise<Project> {
    const code = generateProjectCode();

    return projectsRepository.create({
      organization: { connect: { id: input.organizationId } },
      consultant: { connect: { id: consultantId } },
      code,
      name: input.name,
      description: input.description,
      startDate: input.startDate ? new Date(input.startDate) : null,
      targetEndDate: input.targetEndDate ? new Date(input.targetEndDate) : null,
    });
  },

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const project = await projectsRepository.findById(id);
    if (!project) {
      throw new NotFoundError('Projeto');
    }

    return projectsRepository.update(id, {
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      targetEndDate: input.targetEndDate ? new Date(input.targetEndDate) : undefined,
    });
  },

  async getProgress(
    id: string
  ): Promise<{ progress: number; stage: string; checklist: DocumentChecklist[] }> {
    const project = await projectsRepository.findById(id);
    if (!project) {
      throw new NotFoundError('Projeto');
    }

    const checklist = await projectsRepository.findChecklist(id);

    return {
      progress: project.progress,
      stage: project.stage,
      checklist,
    };
  },

  async getChecklist(id: string): Promise<DocumentChecklist[]> {
    return projectsRepository.findChecklist(id);
  },

  async getActivities(id: string): Promise<ProjectActivity[]> {
    return projectsRepository.findActivities(id);
  },

  async logActivity(
    projectId: string,
    userId: string,
    action: string,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<ProjectActivity> {
    return projectsRepository.createActivity({
      project: { connect: { id: projectId } },
      userId,
      action,
      description,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    });
  },
};
