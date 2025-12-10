import type { FastifyReply, FastifyRequest } from 'fastify';
import { success } from '../../shared/utils/response.js';
import { aiChatService } from './chatService.js';
import { aiService } from './services.js';

interface ChatBody {
  message: string;
  projectId: string;
  conversationId?: string;
}

interface GenerateReportBody {
  projectId: string;
  includeSurveys: boolean;
  includeInterviews: boolean;
  includeDocuments: boolean;
  customInstructions?: string;
}

export const aiController = {
  async chat(request: FastifyRequest<{ Body: ChatBody }>, reply: FastifyReply) {
    const { message, projectId, conversationId } = request.body;
    const userId = request.user!.id;

    if (!projectId) {
      return reply.status(400).send({ success: false, error: 'projectId é obrigatório' });
    }

    const response = await aiChatService.sendMessage({
      userId,
      message,
      projectId,
      conversationId,
    });

    success(reply, response);
  },

  async listConversations(request: FastifyRequest, reply: FastifyReply) {
    const userId = request.user!.id;
    const conversations = await aiChatService.listConversations(userId);
    success(reply, conversations);
  },

  async getMessages(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    const messages = await aiChatService.getMessages(id);
    success(reply, messages);
  },

  async deleteConversation(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    await aiChatService.deleteConversation(id);
    success(reply, { deleted: true });
  },

  async generateReport(request: FastifyRequest<{ Body: GenerateReportBody }>, reply: FastifyReply) {
    const { projectId, includeSurveys, includeInterviews, includeDocuments, customInstructions } =
      request.body;

    if (!projectId) {
      return reply.status(400).send({ success: false, error: 'projectId é obrigatório' });
    }

    const report = await aiService.generateReport({
      projectId,
      includeSurveys,
      includeInterviews,
      includeDocuments,
      customInstructions,
    });

    success(reply, report);
  },
};
