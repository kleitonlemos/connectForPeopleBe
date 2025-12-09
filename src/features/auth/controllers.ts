import type { FastifyReply, FastifyRequest } from 'fastify';
import { created, success } from '../../shared/utils/response.js';
import { authService } from './services.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from './validators.js';

export const authController = {
  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as { email: string; password: string; tenantId: string };
    const { tenantId, ...credentials } = body;
    const validated = loginSchema.parse(credentials);

    const { user, tokenPayload } = await authService.login(tenantId, validated);
    const token = await reply.jwtSign(tokenPayload);

    success(reply, { user, token });
  },

  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const validated = registerSchema.parse(request.body);
    const result = await authService.register(validated);

    created(reply, result);
  },

  async forgotPassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as { email: string; tenantId: string };
    const { tenantId, email } = body;
    forgotPasswordSchema.parse({ email });

    await authService.forgotPassword(tenantId, email);

    success(reply, { message: 'Se o e-mail existir, você receberá um link de recuperação' });
  },

  async resetPassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const validated = resetPasswordSchema.parse(request.body);
    await authService.resetPassword(validated.token, validated.password);

    success(reply, { message: 'Senha alterada com sucesso' });
  },

  async changePassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const validated = changePasswordSchema.parse(request.body);
    await authService.changePassword(
      request.user.id,
      validated.currentPassword,
      validated.newPassword
    );

    success(reply, { message: 'Senha alterada com sucesso' });
  },

  async me(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = await authService.getProfile(request.user.id);

    success(reply, result);
  },
};
