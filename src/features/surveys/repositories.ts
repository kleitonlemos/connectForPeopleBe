import type { Prisma, Survey, SurveyInvitation, SurveyResponse } from '@prisma/client';
import { prisma } from '../../config/database.js';

export const surveysRepository = {
  async findByProject(projectId: string): Promise<Survey[]> {
    return prisma.survey.findMany({
      where: { projectId },
      include: {
        _count: { select: { responses: true, invitations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findActiveSurveys(): Promise<Survey[]> {
    const now = new Date();
    return prisma.survey.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string): Promise<Survey | null> {
    return prisma.survey.findUnique({
      where: { id },
      include: {
        sections: {
          include: { questions: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });
  },

  async findByAccessCode(code: string): Promise<Survey | null> {
    return prisma.survey.findUnique({
      where: { accessCode: code },
      include: {
        sections: {
          include: { questions: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });
  },

  async create(data: Prisma.SurveyCreateInput): Promise<Survey> {
    return prisma.survey.create({ data });
  },

  async update(id: string, data: Prisma.SurveyUpdateInput): Promise<Survey> {
    return prisma.survey.update({
      where: { id },
      data,
    });
  },

  async findResponses(surveyId: string): Promise<SurveyResponse[]> {
    return prisma.surveyResponse.findMany({
      where: { surveyId },
      include: { answers: true },
      orderBy: { submittedAt: 'desc' },
    });
  },

  async createResponse(data: Prisma.SurveyResponseCreateInput): Promise<SurveyResponse> {
    return prisma.surveyResponse.create({ data });
  },

  async findInvitations(surveyId: string): Promise<SurveyInvitation[]> {
    return prisma.surveyInvitation.findMany({
      where: { surveyId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findPendingInvitationsForReminder(
    surveyId: string,
    maxReminders: number,
    minLastReminderDate: Date
  ): Promise<SurveyInvitation[]> {
    return prisma.surveyInvitation.findMany({
      where: {
        surveyId,
        status: 'PENDING',
        remindersSent: { lt: maxReminders },
        OR: [{ lastReminderAt: null }, { lastReminderAt: { lt: minLastReminderDate } }],
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async createInvitations(surveyId: string, emails: string[]): Promise<number> {
    const result = await prisma.surveyInvitation.createMany({
      data: emails.map(email => ({
        surveyId,
        email,
        token: crypto.randomUUID(),
      })),
      skipDuplicates: true,
    });
    return result.count;
  },

  async incrementReminders(ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const result = await prisma.surveyInvitation.updateMany({
      where: { id: { in: ids } },
      data: {
        remindersSent: { increment: 1 },
        lastReminderAt: new Date(),
      },
    });

    return result.count;
  },

  async findInvitationByToken(token: string): Promise<SurveyInvitation | null> {
    return prisma.surveyInvitation.findUnique({
      where: { token },
      include: { survey: true },
    });
  },

  async updateInvitation(
    id: string,
    data: Prisma.SurveyInvitationUpdateInput
  ): Promise<SurveyInvitation> {
    return prisma.surveyInvitation.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.survey.delete({
      where: { id },
    });
  },
};
