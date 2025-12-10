import OpenAI from 'openai';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const AI_MODEL = 'gpt-5-mini';

interface AnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  sentimentScore: number;
  themes: string[];
  keyInsights: string[];
  anonymizedSummary: string;
  actionItems: string[];
}

export const aiService = {
  async analyzeInterview(
    projectId: string,
    interviewId: string,
    transcription: string
  ): Promise<AnalysisResult> {
    let conversation = await prisma.aIConversation.findFirst({
      where: { projectId, purpose: 'interview_analysis' },
    });

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: {
          projectId,
          purpose: 'interview_analysis',
          model: AI_MODEL,
        },
      });
    }

    const systemPrompt = `Você é um especialista em análise de entrevistas de diagnóstico organizacional.
Sua tarefa é analisar transcrições de entrevistas e extrair insights valiosos.

REGRAS IMPORTANTES:
1. NUNCA identifique o entrevistado diretamente
2. Foque em padrões de comportamento e sentimentos
3. Extraia temas recorrentes e dores
4. Mantenha total anonimato nas citações
5. Seja objetivo e profissional

Responda SEMPRE em JSON válido com a estrutura:
{
  "sentiment": "positive|neutral|negative|mixed",
  "sentimentScore": 0.0 a 1.0,
  "themes": ["tema1", "tema2"],
  "keyInsights": ["insight1", "insight2"],
  "anonymizedSummary": "resumo sem identificação",
  "actionItems": ["ação1", "ação2"]
}`;

    const response = await openai.responses.create({
      model: AI_MODEL,
      instructions: systemPrompt,
      input: `Analise a seguinte transcrição de entrevista:\n\n${transcription}`,
      ...(conversation.lastResponseId && { previous_response_id: conversation.lastResponseId }),
      reasoning: { effort: 'high' },
    });

    await prisma.aIConversation.update({
      where: { id: conversation.id },
      data: {
        lastResponseId: response.id,
        totalTokensUsed: { increment: response.usage?.total_tokens ?? 0 },
      },
    });

    await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: transcription.substring(0, 1000),
        tokensUsed: response.usage?.input_tokens ?? 0,
      },
    });

    const outputText = response.output_text;
    await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: outputText,
        responseId: response.id,
        tokensUsed: response.usage?.output_tokens ?? 0,
      },
    });

    const analysis = JSON.parse(outputText) as AnalysisResult;

    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        aiConversationId: conversation.id,
        analysisResult: analysis as object,
        sentimentScore: analysis.sentimentScore,
        keyThemes: analysis.themes,
        anonymizedSummary: analysis.anonymizedSummary,
        status: 'ANALYZED',
      },
    });

    return analysis;
  },

  async generateReportSection(
    projectId: string,
    sectionType: 'executive_summary' | 'cultural_analysis' | 'climate_indicators' | 'action_plan',
    contextData: Record<string, unknown>
  ): Promise<string> {
    const prompts: Record<string, string> = {
      executive_summary: 'Gere um resumo executivo profissional baseado nos dados fornecidos.',
      cultural_analysis: 'Analise a cultura organizacional com base nos documentos e pesquisas.',
      climate_indicators: 'Compile os indicadores de clima organizacional em formato narrativo.',
      action_plan: 'Sugira um plano de ação baseado nos problemas identificados.',
    };

    let conversation = await prisma.aIConversation.findFirst({
      where: { projectId, purpose: `report_${sectionType}` },
    });

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: {
          projectId,
          purpose: `report_${sectionType}`,
          model: AI_MODEL,
        },
      });
    }

    const response = await openai.responses.create({
      model: AI_MODEL,
      instructions: `Você é um consultor de RH especializado em diagnóstico organizacional.
${prompts[sectionType]}
Escreva de forma profissional e objetiva.`,
      input: JSON.stringify(contextData),
      ...(conversation.lastResponseId && { previous_response_id: conversation.lastResponseId }),
      reasoning: { effort: 'high' },
    });

    await prisma.aIConversation.update({
      where: { id: conversation.id },
      data: {
        lastResponseId: response.id,
        totalTokensUsed: { increment: response.usage?.total_tokens ?? 0 },
      },
    });

    return response.output_text;
  },

  async generateReport(input: {
    projectId: string;
    includeSurveys: boolean;
    includeInterviews: boolean;
    includeDocuments: boolean;
    customInstructions?: string;
  }) {
    const { projectId, includeSurveys, includeInterviews, includeDocuments, customInstructions } =
      input;

    const contextParts: string[] = [];

    if (includeSurveys) {
      const surveys = await prisma.survey.findMany({
        where: { projectId },
        include: {
          responses: { include: { answers: true } },
          sections: { include: { questions: true } },
        },
      });
      if (surveys.length > 0) {
        contextParts.push(`## Dados das Pesquisas\n${JSON.stringify(surveys, null, 2)}`);
      }
    }

    if (includeInterviews) {
      const interviews = await prisma.interview.findMany({
        where: { projectId },
        select: {
          id: true,
          intervieweeRole: true,
          analysisResult: true,
          keyThemes: true,
          sentimentScore: true,
        },
      });
      if (interviews.length > 0) {
        contextParts.push(`## Análise das Entrevistas\n${JSON.stringify(interviews, null, 2)}`);
      }
    }

    if (includeDocuments) {
      const documents = await prisma.document.findMany({
        where: { projectId, status: 'VALIDATED' },
        select: { type: true, name: true, description: true },
      });
      if (documents.length > 0) {
        contextParts.push(`## Documentos Validados\n${JSON.stringify(documents, null, 2)}`);
      }
    }

    const customPart = customInstructions
      ? `\n\n## Instruções Adicionais do Consultor\n${customInstructions}`
      : '';

    let conversation = await prisma.aIConversation.findFirst({
      where: { projectId, purpose: 'full_report' },
    });

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: {
          projectId,
          purpose: 'full_report',
          model: AI_MODEL,
        },
      });
    }

    const response = await openai.responses.create({
      model: AI_MODEL,
      instructions: `Você é um consultor sênior de RH e diagnóstico organizacional.
Gere um relatório executivo completo baseado nos dados fornecidos.

O relatório deve conter:
1. Sumário Executivo
2. Metodologia
3. Análise de Clima Organizacional
4. Pontos Fortes Identificados
5. Áreas de Melhoria
6. Recomendações Estratégicas
7. Plano de Ação Sugerido

Seja profissional, objetivo e baseie-se exclusivamente nos dados fornecidos.
${customPart}`,
      input: contextParts.join('\n\n'),
      ...(conversation.lastResponseId && { previous_response_id: conversation.lastResponseId }),
      reasoning: { effort: 'high' },
    });

    await prisma.aIConversation.update({
      where: { id: conversation.id },
      data: {
        lastResponseId: response.id,
        totalTokensUsed: { increment: response.usage?.total_tokens ?? 0 },
      },
    });

    const existingReport = await prisma.report.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (existingReport) {
      const updated = await prisma.report.update({
        where: { id: existingReport.id },
        data: {
          executiveSummary: response.output_text,
          generatedContent: { fullReport: response.output_text },
          status: 'DRAFT',
          metadata: {
            includedSurveys: includeSurveys,
            includedInterviews: includeInterviews,
            includedDocuments: includeDocuments,
            customInstructions: customInstructions ?? null,
            generatedAt: new Date().toISOString(),
          },
        },
      });
      return updated;
    }

    return {
      message: 'Relatório gerado. Crie um relatório na página de relatórios para salvá-lo.',
    };
  },
};
