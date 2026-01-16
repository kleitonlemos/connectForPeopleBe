import type { User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../shared/errors/appError.js';
import { generateResetToken } from '../../shared/utils/generateCode.js';
import { transformUserUrls } from '../../shared/utils/storage.js';
import { emailsService } from '../emails/services.js';
import { authRepository } from './repositories.js';
import type { LoginInput, RegisterInput, UpdateProfileInput } from './validators.js';

interface AuthResult {
  user: Omit<User, 'passwordHash'>;
}

interface TokenPayload {
  id: string;
  tenantId: string;
  organizationId: string | null;
  email: string;
  role: UserRole;
}

export const authService = {
  async login(
    tenantId: string,
    input: LoginInput
  ): Promise<AuthResult & { tokenPayload: TokenPayload }> {
    const user = await authRepository.findByEmail(tenantId, input.email);

    if (!user) {
      throw new UnauthorizedError('E-mail ou senha inválidos');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Usuário inativo ou bloqueado');
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedError('E-mail ou senha inválidos');
    }

    await authRepository.updateLastLogin(user.id);

    const transformed = await transformUserUrls(user);
    const { passwordHash, ...userWithoutPassword } = transformed;

    return {
      user: userWithoutPassword,
      tokenPayload: {
        id: user.id,
        tenantId: user.tenantId,
        organizationId: user.organizationId,
        email: user.email,
        role: user.role,
      },
    };
  },

  async register(input: RegisterInput): Promise<AuthResult> {
    const existingUser = await authRepository.findByEmail(input.tenantId, input.email);

    if (existingUser) {
      throw new ConflictError('E-mail já cadastrado');
    }

    const passwordHash = await bcrypt.hash(input.password, 12);

    const user = await authRepository.create({
      tenant: { connect: { id: input.tenantId } },
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: 'CLIENT',
      status: 'ACTIVE',
    });

    const transformed = await transformUserUrls(user);
    const { passwordHash: _, ...userWithoutPassword } = transformed;

    return { user: userWithoutPassword };
  },

  async forgotPassword(tenantId: string, email: string): Promise<void> {
    const user = await authRepository.findByEmail(tenantId, email);

    if (!user) {
      return;
    }

    const resetToken = generateResetToken();
    const expires = new Date(Date.now() + 1000 * 60 * 60);

    await authRepository.setResetToken(user.id, resetToken, expires);
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await authRepository.findByResetToken(token);

    if (!user) {
      throw new UnauthorizedError('Token inválido ou expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const isPending = user.status === 'PENDING';

    await authRepository.updatePassword(user.id, passwordHash);

    if (isPending) {
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
      });

      // Envia e-mail de boas-vindas após ativação
      try {
        await emailsService.sendAccountActivated({
          recipientName: `${user.firstName} ${user.lastName}`,
          recipientEmail: user.email,
          loginUrl: `${env.FRONTEND_URL}/login`,
        });
      } catch (error) {
        console.error('Erro ao enviar e-mail de conta ativada:', error);
      }
    }
  },

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('Usuário');
    }

    const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedError('Senha atual incorreta');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await authRepository.updatePassword(user.id, passwordHash);
  },

  async getProfile(userId: string): Promise<AuthResult> {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('Usuário');
    }

    const transformed = await transformUserUrls(user);
    const { passwordHash, ...userWithoutPassword } = transformed;

    return { user: userWithoutPassword };
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<AuthResult> {
    const user = await authRepository.updateProfile(userId, {
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone ?? undefined,
    });

    const transformed = await transformUserUrls(user);
    const { passwordHash, ...userWithoutPassword } = transformed;

    return { user: userWithoutPassword };
  },
};
