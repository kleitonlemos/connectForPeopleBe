import type { NotificationStatus, NotificationType, Prisma } from '@prisma/client';
import { prisma } from '../../config/database.js';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Prisma.InputJsonValue;
}

interface NotificationFilters {
  userId: string;
  status?: NotificationStatus;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

export const notificationService = {
  async create(input: CreateNotificationInput) {
    return prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        metadata: input.metadata ?? {},
        status: 'PENDING',
      },
    });
  },

  async createMany(notifications: CreateNotificationInput[]) {
    return prisma.notification.createMany({
      data: notifications.map(n => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        metadata: n.metadata ?? {},
        status: 'PENDING' as NotificationStatus,
      })),
    });
  },

  async list(filters: NotificationFilters) {
    const { userId, status, type, limit = 20, offset = 0 } = filters;

    const where = {
      userId,
      ...(status && { status }),
      ...(type && { type }),
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  },

  async getUnreadCount(userId: string) {
    return prisma.notification.count({
      where: {
        userId,
        status: { in: ['PENDING', 'SENT'] },
      },
    });
  },

  async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { status: 'READ', readAt: new Date() },
    });
  },

  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, status: { in: ['PENDING', 'SENT'] } },
      data: { status: 'READ', readAt: new Date() },
    });
  },

  async delete(notificationId: string, userId: string) {
    return prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  },

  async notifyProjectCreated(projectId: string, creatorId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { organization: { include: { users: true } } },
    });

    if (!project) return;

    const usersToNotify = project.organization.users.filter(u => u.id !== creatorId).map(u => u.id);

    if (usersToNotify.length === 0) return;

    await this.createMany(
      usersToNotify.map(userId => ({
        userId,
        type: 'PROJECT_CREATED' as NotificationType,
        title: 'Novo projeto criado',
        message: `O projeto "${project.name}" foi criado`,
        link: `/dashboard/projects/${project.id}`,
        metadata: { projectId: project.id },
      }))
    );
  },

  async notifyDocumentUploaded(documentId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        project: {
          include: {
            organization: {
              include: {
                users: { where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'CONSULTANT'] } } },
              },
            },
          },
        },
      },
    });

    if (!document) return;

    const admins = document.project.organization.users;

    await this.createMany(
      admins.map(user => ({
        userId: user.id,
        type: 'DOCUMENT_UPLOADED' as NotificationType,
        title: 'Novo documento enviado',
        message: `Um novo documento foi enviado no projeto "${document.project.name}"`,
        link: `/dashboard/documents/${document.id}`,
        metadata: { documentId, projectId: document.projectId },
      }))
    );
  },

  async notifySurveyCompleted(surveyId: string) {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        project: {
          include: {
            organization: {
              include: {
                users: { where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'CONSULTANT'] } } },
              },
            },
          },
        },
      },
    });

    if (!survey) return;

    const responses = await prisma.surveyResponse.count({ where: { surveyId } });
    const admins = survey.project.organization.users;

    await this.createMany(
      admins.map(user => ({
        userId: user.id,
        type: 'SURVEY_COMPLETED' as NotificationType,
        title: 'Pesquisa finalizada',
        message: `A pesquisa "${survey.name}" foi finalizada com ${responses} respostas`,
        link: `/dashboard/surveys/${survey.id}`,
        metadata: { surveyId, projectId: survey.projectId, responses },
      }))
    );
  },

  async notifyInterviewAnalyzed(interviewId: string) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: {
        project: {
          include: {
            organization: {
              include: {
                users: { where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'CONSULTANT'] } } },
              },
            },
          },
        },
      },
    });

    if (!interview) return;

    const admins = interview.project.organization.users;

    await this.createMany(
      admins.map(user => ({
        userId: user.id,
        type: 'INTERVIEW_ANALYZED' as NotificationType,
        title: 'Entrevista analisada',
        message: `A análise da entrevista #${interview.id.slice(0, 8)} foi concluída`,
        link: `/dashboard/interviews/${interview.id}`,
        metadata: { interviewId, projectId: interview.projectId },
      }))
    );
  },

  async notifyReportGenerated(reportId: string) {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        project: {
          include: { organization: { include: { users: true } } },
        },
      },
    });

    if (!report) return;

    const users = report.project.organization.users;

    await this.createMany(
      users.map(user => ({
        userId: user.id,
        type: 'REPORT_GENERATED' as NotificationType,
        title: 'Relatório gerado',
        message: `O relatório "${report.title}" está pronto`,
        link: `/dashboard/reports/${report.id}`,
        metadata: { reportId, projectId: report.projectId },
      }))
    );
  },

  async checkProjectDeadlines() {
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const projects = await prisma.project.findMany({
      where: {
        status: 'IN_PROGRESS',
        targetEndDate: {
          gte: new Date(),
          lte: threeDaysFromNow,
        },
      },
      include: {
        organization: { include: { users: true } },
      },
    });

    for (const project of projects) {
      const existingNotification = await prisma.notification.findFirst({
        where: {
          type: 'PROJECT_DEADLINE' as any,
          metadata: { path: ['projectId'], equals: project.id },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (existingNotification) continue;

      const daysUntilDeadline = Math.ceil(
        (project.targetEndDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      await this.createMany(
        project.organization.users.map(user => ({
          userId: user.id,
          type: 'PROJECT_DEADLINE' as NotificationType,
          title: 'Prazo se aproximando',
          message: `O projeto "${project.name}" vence em ${daysUntilDeadline} dia${
            daysUntilDeadline > 1 ? 's' : ''
          }`,
          link: `/dashboard/projects/${project.id}`,
          metadata: { projectId: project.id, daysUntilDeadline },
        }))
      );
    }

    return projects.length;
  },

  async checkPendingDocuments() {
    const documents = await prisma.document.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: {
        project: {
          include: {
            organization: {
              include: {
                users: { where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'CONSULTANT'] } } },
              },
            },
          },
        },
      },
    });

    const projectDocuments = new Map<string, typeof documents>();
    for (const doc of documents) {
      const existing = projectDocuments.get(doc.projectId) || [];
      existing.push(doc);
      projectDocuments.set(doc.projectId, existing);
    }

    for (const [projectId, docs] of projectDocuments) {
      const existingNotification = await prisma.notification.findFirst({
        where: {
          type: 'DOCUMENT_PENDING' as any,
          metadata: { path: ['projectId'], equals: projectId },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });

      if (existingNotification) continue;

      const project = docs[0].project;
      const admins = project.organization.users;

      await this.createMany(
        admins.map((user: { id: string }) => ({
          userId: user.id,
          type: 'DOCUMENT_PENDING' as NotificationType,
          title: 'Documentos pendentes',
          message: `${docs.length} documento${
            docs.length > 1 ? 's' : ''
          } aguardando validação no projeto "${project.name}"`,
          link: `/dashboard/documents?project=${projectId}&status=pending`,
          metadata: { projectId, documentCount: docs.length },
        }))
      );
    }

    return documents.length;
  },
};
