import type { User } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/appError.js';
import { usersRepository } from './repositories.js';
import type { ListUsersInput, UpdateUserInput } from './validators.js';

export type AdminUser = Omit<User, 'passwordHash'>;

export const usersService = {
  async list(tenantId: string, filters: ListUsersInput): Promise<AdminUser[]> {
    const users = await usersRepository.findAllByTenant(tenantId, filters);

    return users.map(user => {
      const { passwordHash, ...rest } = user;
      return rest;
    });
  },

  async update(tenantId: string, id: string, input: UpdateUserInput): Promise<AdminUser> {
    const existing = await usersRepository.findById(id);

    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundError('Usuário');
    }

    const updated = await usersRepository.update(id, {
      role: input.role,
      status: input.status,
    });

    const { passwordHash, ...rest } = updated;
    return rest;
  },
};
