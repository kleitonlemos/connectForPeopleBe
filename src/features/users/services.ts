import type { User } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/appError.js';
import { storageService } from '../../shared/services/storageService.js';
import { transformUserUrls, transformUsersUrls } from '../../shared/utils/storage.js';
import { usersRepository } from './repositories.js';
import type { ListUsersInput, UpdateUserInput } from './validators.js';

export type AdminUser = Omit<User, 'passwordHash'>;

export const usersService = {
  async list(tenantId: string, filters: ListUsersInput): Promise<AdminUser[]> {
    const users = await usersRepository.findAllByTenant(tenantId, filters);
    const transformed = await transformUsersUrls(users);

    return transformed.map(user => {
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

    const transformed = await transformUserUrls(updated);
    const { passwordHash, ...rest } = transformed;
    return rest;
  },

  async uploadAvatar(
    tenantId: string,
    id: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<AdminUser> {
    const user = await usersRepository.findById(id);

    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundError('Usuário');
    }

    const { path } = await storageService.uploadFile(file, fileName, mimeType, 'avatars');

    const updated = await usersRepository.update(id, {
      avatarPath: path,
      avatarUrl: '', // Limpamos a URL legada
    });

    const transformed = await transformUserUrls(updated);
    const { passwordHash, ...rest } = transformed;
    return rest;
  },
};
