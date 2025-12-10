import OpenAI from 'openai';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const AI_MODEL = 'gpt-5-mini';

interface SendMessageInput {
  userId: string;
  message: string;
  projectId: string;
  conversationId?: string;
}

interface ChatResponse {
  conversationId: string;
  message: {
    role: 'assistant';
    content: string;
  };
}

const SYSTEM_PROMPT = `Você é o Assistente IA da plataforma Connect For People, especializado em diagnóstico organizacional.

Suas capacidades:
- Ajudar a interpretar dados de pesquisas de clima e engajamento
- Sugerir perguntas para entrevistas de diagnóstico
- Analisar padrões em feedbacks de colaboradores
- Recomendar ações baseadas em indicadores de RH
- Explicar metodologias de diagnóstico organizacional
- Auxiliar na criação de relatórios executivos

Você é profissional, objetivo e sempre mantém a confidencialidade dos dados.
Responda de forma clara e estruturada, usando bullet points quando apropriado.
Seja proativo em sugerir próximos passos ou análises complementares.`;

export const aiChatService = {
  async sendMessage(input: SendMessageInput): Promise<ChatResponse> {
    const { userId, message, projectId, conversationId } = input;

    let conversation;

    if (conversationId) {
      conversation = await prisma.aIConversation.findUnique({
        where: { id: conversationId },
      });
    }

    if (!conversation) {
      conversation = await prisma.aIConversation.create({
        data: {
          projectId: projectId,
          purpose: 'assistant_chat',
          model: AI_MODEL,
          metadata: { userId },
        },
      });
    }

    await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    });

    const response = await openai.responses.create({
      model: AI_MODEL,
      instructions: SYSTEM_PROMPT,
      input: message,
      ...(conversation.lastResponseId && { previous_response_id: conversation.lastResponseId }),
      reasoning: { effort: 'medium' },
    });

    const assistantMessage =
      response.output_text || 'Desculpe, não consegui processar sua mensagem.';

    await prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantMessage,
        responseId: response.id,
        tokensUsed: response.usage?.total_tokens || 0,
      },
    });

    await prisma.aIConversation.update({
      where: { id: conversation.id },
      data: {
        lastResponseId: response.id,
        totalTokensUsed: { increment: response.usage?.total_tokens || 0 },
      },
    });

    return {
      conversationId: conversation.id,
      message: {
        role: 'assistant',
        content: assistantMessage,
      },
    };
  },

  async listConversations(userId: string) {
    const conversations = await prisma.aIConversation.findMany({
      where: {
        purpose: 'assistant_chat',
        metadata: { path: ['userId'], equals: userId },
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return conversations.map(c => ({
      id: c.id,
      projectId: c.projectId,
      lastMessage: c.messages[0]?.content.substring(0, 100) || '',
      updatedAt: c.updatedAt,
    }));
  },

  async getMessages(conversationId: string) {
    const messages = await prisma.aIMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return messages;
  },
};
