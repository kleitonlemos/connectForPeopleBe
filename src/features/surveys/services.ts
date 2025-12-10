import type { Survey, SurveyResponse, SurveyType } from '@prisma/client';
import { env } from '../../config/env.js';
import { NotFoundError } from '../../shared/errors/appError.js';
import { emailsService } from '../emails/services.js';
import { organizationsRepository } from '../organizations/repositories.js';
import { projectsRepository } from '../projects/repositories.js';
import { surveysRepository } from './repositories.js';
import type {
  CreateSurveyInput,
  SendInvitationsInput,
  SubmitResponseInput,
  UpdateSurveyInput,
} from './validators.js';

export const surveysService = {
  async listByProject(projectId: string): Promise<Survey[]> {
    return surveysRepository.findByProject(projectId);
  },

  async getById(id: string): Promise<Survey> {
    const survey = await surveysRepository.findById(id);
    if (!survey) {
      throw new NotFoundError('Pesquisa');
    }
    return survey;
  },

  async getByAccessCode(code: string): Promise<Survey> {
    const survey = await surveysRepository.findByAccessCode(code);
    if (!survey) {
      throw new NotFoundError('Pesquisa');
    }
    return survey;
  },

  async create(input: CreateSurveyInput): Promise<Survey> {
    const accessCode = crypto.randomUUID().split('-')[0]?.toUpperCase() ?? 'DEFAULT';

    return surveysRepository.create({
      project: { connect: { id: input.projectId } },
      type: input.type as SurveyType,
      name: input.name,
      accessCode,
      description: input.description,
      instructions: input.instructions,
      isAnonymous: input.isAnonymous,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
    });
  },

  async update(id: string, input: UpdateSurveyInput): Promise<Survey> {
    const survey = await surveysRepository.findById(id);
    if (!survey) {
      throw new NotFoundError('Pesquisa');
    }

    const { startsAt, endsAt, type, ...rest } = input;
    return surveysRepository.update(id, {
      ...rest,
      ...(type && { type: type as SurveyType }),
      ...(startsAt && { startsAt: new Date(startsAt) }),
      ...(endsAt && { endsAt: new Date(endsAt) }),
    });
  },

  async submitResponse(
    surveyId: string,
    respondentId: string | null,
    input: SubmitResponseInput
  ): Promise<SurveyResponse> {
    const survey = await surveysRepository.findById(surveyId);
    if (!survey) {
      throw new NotFoundError('Pesquisa');
    }

    return surveysRepository.createResponse({
      survey: { connect: { id: surveyId } },
      ...(respondentId && { respondent: { connect: { id: respondentId } } }),
      status: 'COMPLETED',
      submittedAt: new Date(),
      answers: {
        create: input.answers.map(a => ({
          question: { connect: { id: a.questionId } },
          value: a.value ?? {},
          textValue: a.textValue,
          numericValue: a.numericValue,
        })),
      },
    });
  },

  async getResponses(surveyId: string): Promise<SurveyResponse[]> {
    return surveysRepository.findResponses(surveyId);
  },

  async getStatistics(surveyId: string) {
    const responses = await surveysRepository.findResponses(surveyId);
    const invitations = await surveysRepository.findInvitations(surveyId);

    return {
      totalResponses: responses.length,
      totalInvitations: invitations.length,
      responseRate: invitations.length > 0 ? (responses.length / invitations.length) * 100 : 0,
    };
  },

  async sendInvitations(surveyId: string, input: SendInvitationsInput): Promise<number> {
    const survey = await surveysRepository.findById(surveyId);

    if (!survey) {
      throw new NotFoundError('Pesquisa');
    }

    const project = await projectsRepository.findById(survey.projectId);

    if (!project) {
      throw new NotFoundError('Projeto');
    }

    const organization = await organizationsRepository.findById(project.organizationId);

    const count = await surveysRepository.createInvitations(surveyId, input.emails);

    const companyName = organization?.name ?? 'Organização';
    const surveyUrl = `${env.FRONTEND_URL}/survey/${survey.accessCode}`;
    const surveyName = survey.name;

    const invites = input.emails.map(email => ({
      recipientEmail: email,
      surveyName,
      surveyUrl,
      companyName,
    }));

    try {
      await emailsService.sendBulkSurveyInvites(invites);
    } catch (error) {
      console.error('Erro ao enviar convites de pesquisa', error);
    }

    return count;
  },

  async sendReminders(surveyId: string): Promise<number> {
    const survey = await surveysRepository.findById(surveyId);

    if (!survey) {
      throw new NotFoundError('Pesquisa');
    }

    const project = await projectsRepository.findById(survey.projectId);

    if (!project) {
      throw new NotFoundError('Projeto');
    }

    const organization = await organizationsRepository.findById(project.organizationId);

    const now = new Date();
    const maxReminders = 3;
    const minHoursBetweenReminders = 24;
    const minLastReminderDate = new Date(now.getTime() - minHoursBetweenReminders * 60 * 60 * 1000);

    const invitations = await surveysRepository.findPendingInvitationsForReminder(
      surveyId,
      maxReminders,
      minLastReminderDate
    );

    if (invitations.length === 0) {
      return 0;
    }

    const companyName = organization?.name ?? 'Organização';
    const surveyUrl = `${env.FRONTEND_URL}/survey/${survey.accessCode}`;
    const surveyName = survey.name;

    const reminders = invitations.map(invitation => {
      const deadline = survey.endsAt ? survey.endsAt.toISOString() : undefined;
      let daysRemaining: number | undefined;

      if (survey.endsAt) {
        const diffMs = survey.endsAt.getTime() - now.getTime();
        if (diffMs > 0) {
          daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }
      }

      return {
        recipientEmail: invitation.email,
        recipientName: invitation.name ?? undefined,
        surveyName,
        surveyUrl,
        companyName,
        deadline,
        daysRemaining,
      };
    });

    try {
      await emailsService.sendBulkSurveyReminders(reminders);
      await surveysRepository.incrementReminders(invitations.map(invitation => invitation.id));
    } catch (error) {
      console.error('Erro ao enviar lembretes de pesquisa', error);
    }

    return invitations.length;
  },
};
