import type { FastifyReply, FastifyRequest } from 'fastify';
import { success } from '../../shared/utils/response.js';
import { aiChatService } from './chatService.js';

interface ChatBody {
  message: string;
  projectId: string;
  conversationId?: string;
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
};
