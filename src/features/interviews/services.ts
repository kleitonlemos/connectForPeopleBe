import type { Interview } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/appError.js';
import { storageService } from '../../shared/services/storageService.js';
import { aiService } from '../ai/services.js';
import { interviewsRepository } from './repositories.js';
import type { CreateInterviewInput, UploadTranscriptionInput } from './validators.js';

export const interviewsService = {
  async listByProject(projectId: string): Promise<Interview[]> {
    return interviewsRepository.findByProject(projectId);
  },

  async getById(id: string, includeConfidential = false): Promise<Partial<Interview>> {
    const interview = await interviewsRepository.findById(id);
    if (!interview) {
      throw new NotFoundError('Entrevista');
    }
    if (!includeConfidential) {
      const { interviewee, intervieweeRole, ...safeData } = interview;
      return safeData;
    }
    return interview;
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

    const { publicUrl } = await storageService.uploadTranscription(
      input.transcription,
      interview.projectId
    );

    return interviewsRepository.update(id, {
      transcriptionUrl: publicUrl,
      rawTranscription: input.transcription,
      status: 'TRANSCRIBED',
    });
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

    await interviewsRepository.delete(id);
  },
};
