import type { DocumentChecklist, Prisma, Project, ProjectActivity } from '@prisma/client';
import { env } from '../../config/env.js';
import { NotFoundError } from '../../shared/errors/appError.js';
import { generateProjectCode } from '../../shared/utils/generateCode.js';
import { emailsService } from '../emails/services.js';
import { organizationsRepository } from '../organizations/repositories.js';
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

    const project = await projectsRepository.create({
      organization: { connect: { id: input.organizationId } },
      consultant: { connect: { id: consultantId } },
      code,
      name: input.name,
      description: input.description,
      startDate: input.startDate ? new Date(input.startDate) : null,
      targetEndDate: input.targetEndDate ? new Date(input.targetEndDate) : null,
    });

    const defaultChecklistItems = [
      {
        documentType: 'ORGANIZATION_CHART',
        instructions: 'Organograma atualizado da empresa',
        order: 1,
        isRequired: true,
      },
      {
        documentType: 'STRATEGIC_PLAN',
        instructions: 'Planejamento estratégico vigente',
        order: 2,
        isRequired: false,
      },
      {
        documentType: 'HR_POLICY',
        instructions: 'Políticas de RH e benefícios',
        order: 3,
        isRequired: true,
      },
      {
        documentType: 'JOB_DESCRIPTIONS',
        instructions: 'Descrições de cargos',
        order: 4,
        isRequired: false,
      },
      {
        documentType: 'EMPLOYEE_LIST',
        instructions: 'Lista de colaboradores com departamento e cargo',
        order: 5,
        isRequired: true,
      },
      {
        documentType: 'PERFORMANCE_DATA',
        instructions: 'Dados de avaliação de desempenho',
        order: 6,
        isRequired: false,
      },
      {
        documentType: 'TURNOVER_DATA',
        instructions: 'Dados de turnover dos últimos 12 meses',
        order: 7,
        isRequired: false,
      },
      {
        documentType: 'BENEFITS_PACKAGE',
        instructions: 'Pacote de benefícios oferecidos',
        order: 8,
        isRequired: false,
      },
    ];

    try {
      await projectsRepository.createChecklistItems(project.id, defaultChecklistItems);
    } catch (error) {
      console.error('Erro ao criar checklist do projeto', error);
    }

    try {
      const organization = await organizationsRepository.findById(input.organizationId);

      if (organization?.contactEmail) {
        await emailsService.sendWelcomeEmail({
          recipientName: organization.tradeName || organization.name,
          recipientEmail: organization.contactEmail,
          projectName: project.name,
          companyName: organization.name,
          loginUrl: `${env.FRONTEND_URL}/login`,
        });
      }
    } catch (error) {
      console.error('Erro ao enviar e-mail de boas-vindas do projeto', error);
    }

    return project;
  },

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const project = await projectsRepository.findById(id);
    if (!project) {
      throw new NotFoundError('Projeto');
    }
    const { settings, ...rest } = input;

    let mergedSettings: Prisma.InputJsonValue | undefined;

    if (settings) {
      const existingSettings = (project.settings ?? {}) as Record<string, unknown>;
      const incomingSettings = settings as Record<string, unknown>;

      const existingOnboarding =
        (existingSettings['onboarding'] as Record<string, unknown> | undefined) ?? {};
      const incomingOnboarding =
        (incomingSettings['onboarding'] as Record<string, unknown> | undefined) ?? {};

      mergedSettings = {
        ...existingSettings,
        ...incomingSettings,
        onboarding: {
          ...existingOnboarding,
          ...incomingOnboarding,
        },
      } as Prisma.InputJsonValue;
    }

    return projectsRepository.update(id, {
      ...rest,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      targetEndDate: input.targetEndDate ? new Date(input.targetEndDate) : undefined,
      ...(settings && { settings: mergedSettings }),
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
    const checklist = await projectsRepository.findChecklist(id);

    if (checklist.length === 0) {
      const defaultChecklistItems = [
        {
          documentType: 'ORGANIZATION_CHART',
          instructions: 'Organograma atualizado da empresa',
          order: 1,
          isRequired: true,
        },
        {
          documentType: 'STRATEGIC_PLAN',
          instructions: 'Planejamento estratégico vigente',
          order: 2,
          isRequired: false,
        },
        {
          documentType: 'HR_POLICY',
          instructions: 'Políticas de RH e benefícios',
          order: 3,
          isRequired: true,
        },
        {
          documentType: 'JOB_DESCRIPTIONS',
          instructions: 'Descrições de cargos',
          order: 4,
          isRequired: false,
        },
        {
          documentType: 'EMPLOYEE_LIST',
          instructions: 'Lista de colaboradores com departamento e cargo',
          order: 5,
          isRequired: true,
        },
        {
          documentType: 'PERFORMANCE_DATA',
          instructions: 'Dados de avaliação de desempenho',
          order: 6,
          isRequired: false,
        },
        {
          documentType: 'TURNOVER_DATA',
          instructions: 'Dados de turnover dos últimos 12 meses',
          order: 7,
          isRequired: false,
        },
        {
          documentType: 'BENEFITS_PACKAGE',
          instructions: 'Pacote de benefícios oferecidos',
          order: 8,
          isRequired: false,
        },
      ];

      try {
        await projectsRepository.createChecklistItems(id, defaultChecklistItems);
        return projectsRepository.findChecklist(id);
      } catch (error) {
        console.error('Erro ao criar checklist padrão', error);
        return [];
      }
    }

    return checklist;
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
