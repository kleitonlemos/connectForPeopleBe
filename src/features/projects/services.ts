import type {
  DocumentChecklist,
  DocumentType,
  Prisma,
  Project,
  ProjectActivity,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { NotFoundError } from '../../shared/errors/appError.js';
import { storageService } from '../../shared/services/storageService.js';
import { generateProjectCode, generateResetToken } from '../../shared/utils/generateCode.js';
import { transformDocumentsUrls, transformOrganizationUrls } from '../../shared/utils/storage.js';
import { authRepository } from '../auth/repositories.js';
import { documentsService } from '../documents/services.js';
import { emailsService } from '../emails/services.js';
import { interviewsService } from '../interviews/services.js';
import { organizationsRepository } from '../organizations/repositories.js';
import { projectsRepository } from './repositories.js';
import type { ProjectSettings } from './types/projectSettings.js';
import {
  type ProjectOnboardingSettings,
  type ProjectOnboardingStepId,
} from './types/projectSettings.js';
import type { CreateProjectInput, UpdateProjectInput } from './validators.js';

export const projectsService = {
  async list(
    tenantId: string,
    filters?: { organizationId?: string; consultantId?: string },
    userRole?: string,
    userOrganizationId?: string
  ): Promise<Project[]> {
    const finalFilters = { ...filters };

    if (userRole === 'CLIENT') {
      if (!userOrganizationId) {
        return [];
      }
      finalFilters.organizationId = userOrganizationId;
    }

    const projects = (await projectsRepository.findAll(tenantId, finalFilters)) as any[];

    return Promise.all(
      projects.map(async project => {
        if (project.organization) {
          project.organization = await transformOrganizationUrls(project.organization);
        }
        return project;
      })
    );
  },

  async getById(id: string): Promise<Project> {
    const project = (await projectsRepository.findById(id)) as any;
    if (!project) {
      throw new NotFoundError('Projeto');
    }

    if (project.organization) {
      project.organization = await transformOrganizationUrls(project.organization);
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
        const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
        await authRepository.setResetToken(user.id, resetToken, expires);

        await projectsRepository.update(project.id, {
          clientUser: { connect: { id: user.id } },
        });

        await emailsService.sendWelcomeEmail({
          recipientName: organization.contactName || organization.tradeName || organization.name,
          recipientEmail: organization.contactEmail,
          projectName: project.name,
          companyName: organization.name,
          loginUrl: `${env.FRONTEND_URL}/onboarding?token=${resetToken}`,
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
    const { name, description, status, stage, startDate, targetEndDate, progress, settings } =
      input;

    let mergedSettings: Prisma.InputJsonValue | undefined;

    if (settings) {
      const existingSettings = (project.settings ?? {}) as ProjectSettings;
      const incomingSettings = settings as ProjectSettings;

      const existingOnboarding = existingSettings.onboarding ?? {};
      const incomingOnboarding = incomingSettings.onboarding ?? {};

      const mergedOnboarding = {
        ...existingOnboarding,
        ...incomingOnboarding,
      };

      mergedSettings = {
        ...existingSettings,
        ...incomingSettings,
        onboarding: mergedOnboarding,
      } as Prisma.InputJsonValue;

      await this.syncChecklistStatus(id, mergedOnboarding, project.organizationId);
    }

    const updatedProject = await projectsRepository.update(id, {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(stage !== undefined && { stage }),
      ...(progress !== undefined && { progress }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(targetEndDate !== undefined && {
        targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
      }),
      ...(settings && { settings: mergedSettings }),
    });

    return updatedProject;
  },

  async syncChecklistStatus(
    projectId: string,
    onboardingSettings?: ProjectOnboardingSettings,
    organizationId?: string
  ): Promise<void> {
    const stepToDocumentTypes: Record<string, DocumentType[]> = {
      'mission-vision': ['MISSION_VISION_VALUES'],
      culture: ['CULTURE_FACTORS', 'POLICY_MANUAL'],
      'org-chart': ['ORGANIZATIONAL_CHART'],
      financial: ['FINANCIAL_DATA'],
      goals: ['GOALS_OBJECTIVES'],
      products: ['PRODUCTS_SERVICES'],
      team: ['TEAM_LIST'],
    };

    if (onboardingSettings) {
      for (const [stepId, docTypes] of Object.entries(stepToDocumentTypes)) {
        const value = onboardingSettings[stepId as ProjectOnboardingStepId];
        if (value) {
          for (const docType of docTypes) {
            await prisma.documentChecklist.updateMany({
              where: {
                projectId,
                documentType: docType,
                status: 'PENDING',
              },
              data: { status: 'UPLOADED' },
            });
          }
        }
      }
    }

    if (organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { mission: true, vision: true, values: true },
      });

      if (org && (org.mission || org.vision || org.values)) {
        await prisma.documentChecklist.updateMany({
          where: {
            projectId,
            documentType: 'MISSION_VISION_VALUES',
            status: 'PENDING',
          },
          data: { status: 'UPLOADED' },
        });
      }
    }

    const checklistItems = await prisma.documentChecklist.findMany({
      where: { projectId },
      include: { documents: { select: { id: true } } },
    });

    for (const item of checklistItems) {
      if (item.documents.length > 0 && item.status === 'PENDING') {
        await prisma.documentChecklist.update({
          where: { id: item.id },
          data: { status: 'UPLOADED' },
        });
      }
    }

    const updatedChecklist = await projectsRepository.findChecklist(projectId);
    const totalItems = updatedChecklist.length;
    if (totalItems > 0) {
      const completedItems = updatedChecklist.filter(
        item => item.status === 'UPLOADED' || item.status === 'VALIDATED'
      ).length;

      const newProgress = Math.round((completedItems / totalItems) * 100);

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { progress: true, stage: true },
      });

      if (project && project.progress !== newProgress) {
        let newStage = project.stage;
        if (newProgress === 100 && project.stage === 'ONBOARDING') {
          newStage = 'DOCUMENT_COLLECTION';
        }

        await prisma.project.update({
          where: { id: projectId },
          data: {
            progress: newProgress,
            stage: newStage as any
          },
        });
      }
    }
  },

  async getProgress(
    id: string
  ): Promise<{ progress: number; stage: string; checklist: DocumentChecklist[] }> {
    const project = await projectsRepository.findById(id);
    if (!project) {
      throw new NotFoundError('Projeto');
    }
    const settings = (project.settings ?? {}) as ProjectSettings;
    await this.syncChecklistStatus(id, settings.onboarding, project.organizationId);

    const checklist = (await projectsRepository.findChecklist(id)) as any[];

    const transformedChecklist = await Promise.all(
      checklist.map(async item => {
        if (item.documents && item.documents.length > 0) {
          const transformedDocs = await transformDocumentsUrls(item.documents);
          return { ...item, documents: transformedDocs };
        }
        return item;
      })
    );

    const refreshedProject = await projectsRepository.findById(id);

    return {
      progress: refreshedProject?.progress ?? project.progress,
      stage: refreshedProject?.stage ?? project.stage,
      checklist: transformedChecklist,
    };
  },

  async getChecklist(id: string): Promise<DocumentChecklist[]> {
    const project = await projectsRepository.findById(id);
    if (!project) {
      throw new NotFoundError('Projeto');
    }

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
      } catch (error) {
        console.error('Erro ao criar checklist padrão', error);
        return [];
      }
    }

    const settings = (project.settings ?? {}) as ProjectSettings;
    await this.syncChecklistStatus(id, settings.onboarding, project.organizationId);

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

  async resendOnboardingReminder(id: string): Promise<void> {
    const project = (await projectsRepository.findById(id)) as any;
    if (!project) {
      throw new NotFoundError('Projeto');
    }

    if (!project.clientUser) {
      throw new Error('Este projeto não possui um usuário cliente associado.');
    }

    const organization = await organizationsRepository.findById(project.organizationId);
    if (!organization) {
      throw new NotFoundError('Organização');
    }

    let onboardingUrl = `${env.FRONTEND_URL}/login`;

    if (project.clientUser.status === 'PENDING') {
      const resetToken = generateResetToken();
      const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
      await authRepository.setResetToken(project.clientUser.id, resetToken, expires);
      onboardingUrl = `${env.FRONTEND_URL}/onboarding?token=${resetToken}`;
    } else {
      onboardingUrl = `${env.FRONTEND_URL}/dashboard/onboarding`;
    }

    await emailsService.sendOnboardingReminder({
      recipientName: project.clientUser.firstName || organization.contactName || 'Usuário',
      recipientEmail: project.clientUser.email,
      projectName: project.name,
      companyName: organization.name,
      onboardingUrl,
    });

    await this.logActivity(
      project.id,
      project.consultantId,
      'EMAIL_SENT',
      'Lembrete de onboarding enviado ao cliente'
    );
  },

  async processOnboardingReminders(): Promise<void> {
    const pendingProjects = await prisma.project.findMany({
      where: {
        stage: 'ONBOARDING',
        progress: { lt: 100 },
        clientUserId: { not: null },
      },
      include: {
        clientUser: true,
        organization: true,
      },
    });

    for (const project of pendingProjects) {
      try {
        await this.resendOnboardingReminder(project.id);
      } catch (error) {
        console.error(`Erro ao processar lembrete automático para o projeto ${project.id}:`, error);
      }
    }
  },

  async delete(id: string): Promise<void> {
    const project = await projectsRepository.findById(id);
    if (!project) {
      throw new NotFoundError('Projeto');
    }

    const documents = await prisma.document.findMany({
      where: { projectId: id },
      select: { id: true },
    });
    for (const doc of documents) {
      try {
        await documentsService.delete(doc.id);
      } catch (error) {
        console.error(`Erro ao deletar documento ${doc.id} do projeto ${id}`, error);
      }
    }

    const interviews = await prisma.interview.findMany({
      where: { projectId: id },
      select: { id: true },
    });
    for (const interview of interviews) {
      try {
        await interviewsService.delete(interview.id);
      } catch (error) {
        console.error(`Erro ao deletar entrevista ${interview.id} do projeto ${id}`, error);
      }
    }

    const reports = await prisma.report.findMany({
      where: { projectId: id },
      select: { id: true, pdfPath: true },
    });
    for (const report of reports) {
      if (report.pdfPath) {
        try {
          await storageService.deleteFile(env.GCS_BUCKET_DOCUMENTS, report.pdfPath);
        } catch (error) {
          console.error(`Erro ao deletar PDF do relatório ${report.id}`, error);
        }
      }
    }

    await projectsRepository.delete(id);
  },
};
