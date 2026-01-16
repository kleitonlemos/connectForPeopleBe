import type { Survey, SurveyResponse, SurveyType } from '@prisma/client';
import { env } from '../../config/env.js';
import { NotFoundError } from '../../shared/errors/appError.js';
import { storageService } from '../../shared/services/storageService.js';
import {
  transformOrganizationUrls,
  transformSurveyAnswersUrls,
} from '../../shared/utils/storage.js';
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
    const survey = (await surveysRepository.findByAccessCode(code)) as any;
    if (!survey) {
      throw new NotFoundError('Pesquisa');
    }

    if (survey.project?.organization) {
      survey.project.organization = await transformOrganizationUrls(survey.project.organization);
    }

    return survey;
  },

  async create(input: CreateSurveyInput): Promise<Survey> {
    const accessCode = crypto.randomUUID().split('-')[0]?.toUpperCase() ?? 'DEFAULT';

    let sectionsData: any = {};

    if (input.sections && input.sections.length > 0) {
      sectionsData = {
        sections: {
          create: input.sections.map((section, sIndex) => ({
            title: section.title,
            description: section.description,
            indicator: section.indicator,
            order: section.order ?? sIndex,
            questions: {
              create: section.questions.map((q, qIndex) => ({
                type: q.type,
                text: q.text,
                isRequired: q.isRequired ?? true,
                order: q.order ?? qIndex,
                options: q.options && q.options.length > 0 ? { choices: q.options } : {},
              })),
            },
          })),
        },
      };
    } else if (input.questions && input.questions.length > 0) {
      sectionsData = {
        sections: {
          create: [
            {
              title: 'Perguntas',
              order: 0,
              isRequired: true,
              questions: {
                create: input.questions.map((q, index) => ({
                  type: q.type,
                  text: q.text,
                  isRequired: q.isRequired ?? true,
                  order: q.order ?? index,
                  options: q.options && q.options.length > 0 ? { choices: q.options } : {},
                })),
              },
            },
          ],
        },
      };
    }

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
      ...sectionsData,
    });
  },

  async update(id: string, input: UpdateSurveyInput): Promise<Survey> {
    const survey = await surveysRepository.findById(id);
    if (!survey) {
      throw new NotFoundError('Pesquisa');
    }

    const { startsAt, endsAt, type, questions, sections, ...rest } = input;

    // Se houver novas seções/perguntas no update, por enquanto limpamos as antigas e criamos novas
    // Em uma implementação real, faríamos diffing, mas para simplificar agora:
    let nestedData: any = {};
    if (sections && sections.length > 0) {
      nestedData = {
        sections: {
          deleteMany: {},
          create: sections.map((section, sIndex) => ({
            title: section.title,
            description: section.description,
            indicator: section.indicator,
            order: section.order ?? sIndex,
            questions: {
              create: section.questions.map((q, qIndex) => ({
                type: q.type,
                text: q.text,
                isRequired: q.isRequired ?? true,
                order: q.order ?? qIndex,
                options: q.options && q.options.length > 0 ? { choices: q.options } : {},
              })),
            },
          })),
        },
      };
    } else if (questions && questions.length > 0) {
      nestedData = {
        sections: {
          deleteMany: {},
          create: [
            {
              title: 'Perguntas',
              order: 0,
              isRequired: true,
              questions: {
                create: questions.map((q, index) => ({
                  type: q.type,
                  text: q.text,
                  isRequired: q.isRequired ?? true,
                  order: q.order ?? index,
                  options: q.options && q.options.length > 0 ? { choices: q.options } : {},
                })),
              },
            },
          ],
        },
      };
    }

    return surveysRepository.update(id, {
      ...rest,
      ...(type && { type: type as SurveyType }),
      ...(startsAt && { startsAt: new Date(startsAt) }),
      ...(endsAt && { endsAt: new Date(endsAt) }),
      ...nestedData,
    });
  },

  async submitResponse(
    surveyIdOrCode: string,
    respondentId: string | null,
    input: SubmitResponseInput
  ): Promise<SurveyResponse> {
    let survey = await surveysRepository.findById(surveyIdOrCode);

    if (!survey) {
      survey = await surveysRepository.findByAccessCode(surveyIdOrCode);
    }

    if (!survey) {
      throw new NotFoundError('Pesquisa');
    }

    return surveysRepository.createResponse({
      survey: { connect: { id: survey.id } },
      ...(respondentId && { respondent: { connect: { id: respondentId } } }),
      status: 'COMPLETED',
      submittedAt: new Date(),
      answers: {
        create: input.answers.map((a: any) => ({
          question: { connect: { id: a.questionId } },
          value: a.value ?? {},
          storagePath: a.storagePath,
          textValue: a.textValue,
          numericValue: a.numericValue,
        })),
      },
    });
  },

  async getResponses(surveyId: string): Promise<SurveyResponse[]> {
    const responses = await surveysRepository.findResponses(surveyId);

    // Transformar as URLs dos arquivos nas respostas
    return Promise.all(
      responses.map(async (response: any) => {
        if (response.answers) {
          response.answers = await transformSurveyAnswersUrls(response.answers);
        }
        return response;
      })
    );
  },

  async uploadResponseFile(
    accessCode: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<{ path: string }> {
    const survey = await surveysRepository.findByAccessCode(accessCode);
    if (!survey) {
      throw new NotFoundError('Pesquisa');
    }

    const { path } = await storageService.uploadFile(
      file,
      fileName,
      mimeType,
      `surveys/${survey.id}/responses`
    );

    return { path };
  },

  async getStatistics(surveyId: string) {
    const responses = (await surveysRepository.findResponses(surveyId)) as any[];
    const invitations = await surveysRepository.findInvitations(surveyId);
    const survey = (await surveysRepository.findById(surveyId)) as any;

    if (!survey) {
      throw new NotFoundError('Pesquisa');
    }

    if (survey.project?.organization) {
      survey.project.organization = await transformOrganizationUrls(survey.project.organization);
    }

    const totalResponses = responses.length;
    const totalInvitations = invitations.length;
    const responseRate = invitations.length > 0 ? (totalResponses / totalInvitations) * 100 : 0;

    // Processar resultados por indicador (seção)
    const indicators: Record<
      string,
      {
        name: string;
        score: number;
        totalQuestions: number;
        responses: number;
      }
    > = {};

    if (survey.sections) {
      survey.sections.forEach((section: any) => {
        if (section.indicator) {
          indicators[section.id] = {
            name: section.indicator,
            score: 0,
            totalQuestions: section.questions?.length || 0,
            responses: 0,
          };
        }
      });
    }

    // Calcular scores por indicador
    responses.forEach((response: any) => {
      if (response.answers) {
        response.answers.forEach((answer: any) => {
          const questionId = answer.questionId;
          // Encontrar a seção desta questão
          const section = survey.sections?.find((s: any) =>
            s.questions?.some((q: any) => q.id === questionId)
          );

          if (
            section &&
            section.indicator &&
            answer.numericValue !== null &&
            answer.numericValue !== undefined
          ) {
            indicators[section.id].score += answer.numericValue;
            indicators[section.id].responses++;
          }
        });
      }
    });

    // Normalizar scores (média)
    const indicatorsList = Object.values(indicators).map(ind => ({
      ...ind,
      averageScore: ind.responses > 0 ? ind.score / ind.responses : 0,
    }));

    return {
      totalResponses,
      totalInvitations,
      responseRate,
      indicators: indicatorsList,
      // Também podemos agrupar por questão individual para gráficos mais detalhados
      questions: (survey.sections || [])
        .flatMap((s: any) => s.questions || [])
        .map((q: any) => {
          const qAnswers = responses
            .flatMap((r: any) => r.answers || [])
            .filter((a: any) => a.questionId === q.id);
          const avg =
            qAnswers.reduce((acc: number, curr: any) => acc + (curr.numericValue ?? 0), 0) /
            (qAnswers.length || 1);

          return {
            id: q.id,
            text: q.text,
            type: q.type,
            average: ['SCALE', 'NPS', 'RATING'].includes(q.type) ? avg : null,
            total: qAnswers.length,
            optionsDistribution: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE'].includes(q.type)
              ? (q.options as any)?.choices?.map((opt: string) => ({
                  option: opt,
                  count: qAnswers.filter(
                    (a: any) => (a.value as any)?.selected?.includes(opt) || a.value === opt
                  ).length,
                }))
              : null,
          };
        }),
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

  async sendAllReminders(): Promise<{ surveysProcessed: number; totalReminders: number }> {
    const activeSurveys = await surveysRepository.findActiveSurveys();

    let totalReminders = 0;

    for (const survey of activeSurveys) {
      try {
        const count = await this.sendReminders(survey.id);
        totalReminders += count;
      } catch (error) {
        console.error(`Erro ao enviar lembretes para pesquisa ${survey.id}:`, error);
      }
    }

    return {
      surveysProcessed: activeSurveys.length,
      totalReminders,
    };
  },

  async delete(id: string): Promise<void> {
    const survey = await surveysRepository.findById(id);
    if (!survey) {
      throw new NotFoundError('Pesquisa');
    }

    // Buscar todas as respostas para limpar arquivos do storage
    const responses = (await surveysRepository.findResponses(id)) as any[];
    for (const response of responses) {
      for (const answer of response.answers) {
        if (answer.storagePath) {
          try {
            await storageService.deleteFile(env.GCS_BUCKET_DOCUMENTS, answer.storagePath);
          } catch (error) {
            console.error(
              `Erro ao deletar arquivo de resposta da pesquisa: ${answer.storagePath}`,
              error
            );
          }
        }
      }
    }

    await surveysRepository.delete(id);
  },
};
