import type {
  DocumentChecklist,
  DocumentType,
  Prisma,
  Project,
  ProjectActivity,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { NotFoundError } from '../../shared/errors/appError.js';
import { generateProjectCode, generateResetToken } from '../../shared/utils/generateCode.js';
import { authRepository } from '../auth/repositories.js';
import { emailsService } from '../emails/services.js';
import { organizationsRepository } from '../organizations/repositories.js';
import { projectsRepository } from './repositories.js';
import type { CreateProjectInput, UpdateProjectInput } from './validators.js';

export const projectsService = {
  async list(
    tenantId: string,
    filters?: { organizationId?: string; consultantId?: string },
    userRole?: string,
    userOrganizationId?: string
  ): Promise<Project[]> {
    const finalFilters = { ...filters };

    if (userRole === 'CLIENT' && userOrganizationId) {
      finalFilters.organizationId = userOrganizationId;
    }

    return projectsRepository.findAll(tenantId, finalFilters);
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

    const defaultChecklistItems: Array<{
      documentType: DocumentType;
      instructions: string;
      order: number;
      isRequired: boolean;
    }> = [
      {
        documentType: 'MISSION_VISION_VALUES',
        instructions: 'Missão, visão e valores da empresa',
        order: 1,
        isRequired: true,
      },
      {
        documentType: 'CULTURE_FACTORS',
        instructions: 'Fatores culturais e contexto organizacional',
        order: 2,
        isRequired: true,
      },
      {
        documentType: 'ORGANIZATIONAL_CHART',
        instructions: 'Organograma atualizado da empresa',
        order: 3,
        isRequired: true,
      },
      {
        documentType: 'GOALS_OBJECTIVES',
        instructions: 'Metas e objetivos atuais',
        order: 4,
        isRequired: false,
      },
      {
        documentType: 'PRODUCTS_SERVICES',
        instructions: 'Portfólio de produtos e/ou serviços',
        order: 5,
        isRequired: false,
      },
      {
        documentType: 'TEAM_LIST',
        instructions: 'Lista de colaboradores (departamento e cargo)',
        order: 6,
        isRequired: true,
      },
      {
        documentType: 'POLICY_MANUAL',
        instructions: 'Manual de políticas internas (se houver)',
        order: 7,
        isRequired: false,
      },
      {
        documentType: 'FINANCIAL_DATA',
        instructions: 'Dados financeiros relevantes (se aplicável)',
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
        const tenantId = organization.tenantId;
        let user = await authRepository.findByEmail(tenantId, organization.contactEmail);

        if (!user) {
          const tempPassword = await bcrypt.hash(Math.random().toString(36), 12);
          const [firstName, ...lastNameParts] = (organization.contactName || 'Usuário').split(' ');

          user = await authRepository.create({
            tenant: { connect: { id: tenantId } },
            organization: { connect: { id: organization.id } },
            email: organization.contactEmail,
            passwordHash: tempPassword,
            firstName,
            lastName: lastNameParts.join(' ') || 'Cliente',
            role: 'CLIENT',
            status: 'PENDING',
          });
        }

        const resetToken = generateResetToken();
        const expires = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 horas para ativação
        await authRepository.setResetToken(user.id, resetToken, expires);

        await projectsRepository.update(project.id, {
          clientUser: { connect: { id: user.id } },
        });

        await emailsService.sendWelcomeEmail({
          recipientName: organization.contactName || organization.tradeName || organization.name,
          recipientEmail: organization.contactEmail,
          projectName: project.name,
          companyName: organization.name,
          loginUrl: `${env.FRONTEND_URL}/reset-password?token=${resetToken}`,
        });
      }
    } catch (error) {
      console.error('Erro ao processar onboarding do cliente e enviar e-mail', error);
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
      const defaultChecklistItems: Array<{
        documentType: DocumentType;
        instructions: string;
        order: number;
        isRequired: boolean;
      }> = [
        {
          documentType: 'MISSION_VISION_VALUES',
          instructions: 'Missão, visão e valores da empresa',
          order: 1,
          isRequired: true,
        },
        {
          documentType: 'CULTURE_FACTORS',
          instructions: 'Fatores culturais e contexto organizacional',
          order: 2,
          isRequired: true,
        },
        {
          documentType: 'ORGANIZATIONAL_CHART',
          instructions: 'Organograma atualizado da empresa',
          order: 3,
          isRequired: true,
        },
        {
          documentType: 'GOALS_OBJECTIVES',
          instructions: 'Metas e objetivos atuais',
          order: 4,
          isRequired: false,
        },
        {
          documentType: 'PRODUCTS_SERVICES',
          instructions: 'Portfólio de produtos e/ou serviços',
          order: 5,
          isRequired: false,
        },
        {
          documentType: 'TEAM_LIST',
          instructions: 'Lista de colaboradores (departamento e cargo)',
          order: 6,
          isRequired: true,
        },
        {
          documentType: 'POLICY_MANUAL',
          instructions: 'Manual de políticas internas (se houver)',
          order: 7,
          isRequired: false,
        },
        {
          documentType: 'FINANCIAL_DATA',
          instructions: 'Dados financeiros relevantes (se aplicável)',
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
  async delete(id: string): Promise<void> {
    const project = await projectsRepository.findById(id);
    if (!project) {
      throw new NotFoundError('Projeto');
    }
    await projectsRepository.delete(id);
  },
};
