import type { Interview } from '@prisma/client';
import { env } from '../../config/env.js';
import { NotFoundError } from '../../shared/errors/appError.js';
import { storageService } from '../../shared/services/storageService.js';
import { transformInterviewUrls, transformInterviewsUrls } from '../../shared/utils/storage.js';
import { aiService } from '../ai/services.js';
import { interviewsRepository } from './repositories.js';
import type { CreateInterviewInput, UploadTranscriptionInput } from './validators.js';

export const interviewsService = {
  async listByProject(projectId: string): Promise<Interview[]> {
    const interviews = await interviewsRepository.findByProject(projectId);
    return transformInterviewsUrls(interviews);
  },

  async getById(id: string, includeConfidential = false): Promise<Partial<Interview>> {
    const interview = await interviewsRepository.findById(id);
    if (!interview) {
      throw new NotFoundError('Entrevista');
    }
    const transformed = await transformInterviewUrls(interview);
    if (!includeConfidential) {
      const { interviewee, intervieweeRole, ...safeData } = transformed;
      return safeData;
    }
    return transformed;
  },

  async create(input: CreateInterviewInput, uploadedById: string): Promise<Interview> {
    return interviewsRepository.create({
      project: { connect: { id: input.projectId } },
      uploadedBy: { connect: { id: uploadedById } },
      title: `Entrevista - ${input.intervieweeName}`,
      interviewee: input.intervieweeName,
      intervieweeRole: input.intervieweeRole,
      conductedAt: input.interviewDate ? new Date(input.interviewDate) : null,
      duration: input.duration,
    });
  },

  async uploadTranscription(id: string, input: UploadTranscriptionInput): Promise<Interview> {
    const interview = await interviewsRepository.findById(id);
    if (!interview) {
      throw new NotFoundError('Entrevista');
    }

    const { path } = await storageService.uploadTranscription(
      input.transcription,
      interview.projectId
    );

    const updated = await interviewsRepository.update(id, {
      transcriptionPath: path,
      transcriptionUrl: '', // Mantemos vazio ou limpamos se for o caso
      rawTranscription: input.transcription,
      status: 'TRANSCRIBED',
    });

    return transformInterviewUrls(updated);
  },

  async analyzeWithAI(id: string): Promise<Interview> {
    const interview = await interviewsRepository.findById(id);
    if (!interview || !interview.rawTranscription) {
      throw new NotFoundError('Entrevista ou transcrição');
    }

    const analysis = await aiService.analyzeInterview(
      interview.projectId,
      id,
      interview.rawTranscription
    );

    return interviewsRepository.update(id, {
      analysisResult: analysis as object,
      keyThemes: analysis.themes,
      sentimentScore: analysis.sentimentScore,
      anonymizedSummary: analysis.anonymizedSummary,
      status: 'ANALYZED',
    });
  },

  async delete(id: string): Promise<void> {
    const interview = await interviewsRepository.findById(id);
    if (!interview) {
      throw new NotFoundError('Entrevista');
    }

    if (interview.transcriptionPath) {
      try {
        await storageService.deleteFile(env.GCS_BUCKET_TRANSCRIPTIONS, interview.transcriptionPath);
      } catch (error) {
        console.error(
          `Erro ao deletar transcrição do storage: ${interview.transcriptionPath}`,
          error
        );
      }
    }

    await interviewsRepository.delete(id);
  },
};
