import type { Survey, SurveyResponse, SurveyType } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/appError.js';
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
    return surveysRepository.createInvitations(surveyId, input.emails);
  },
};
