import type { Prisma, User, UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../../config/database.js';

interface ListUsersFilters {
  organizationId?: string;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export const usersRepository = {
  async findAllByTenant(tenantId: string, filters?: ListUsersFilters): Promise<User[]> {
    const where: Prisma.UserWhereInput = {
      tenantId,
    };

    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  },
};
