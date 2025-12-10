import type { Prisma, User } from '@prisma/client';
import { prisma } from '../../config/database.js';

export const authRepository = {
  async findByEmail(tenantId: string, email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: {
        tenantId_email: { tenantId, email },
      },
    });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  async findByResetToken(token: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });
  },

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  },

  async updateProfile(
    id: string,
    data: Pick<Prisma.UserUpdateInput, 'firstName' | 'lastName' | 'phone'>
  ): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  },

  async updatePassword(id: string, passwordHash: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
  },

  async setResetToken(id: string, token: string, expires: Date): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expires,
      },
    });
  },

  async updateLastLogin(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  },

  async createSession(
    userId: string,
    token: string,
    expiresAt: Date,
    metadata: { userAgent?: string; ipAddress?: string }
  ): Promise<void> {
    await prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
      },
    });
  },

  async deleteSession(token: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { token },
    });
  },

  async deleteAllUserSessions(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  },
};
