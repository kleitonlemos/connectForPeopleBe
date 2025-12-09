import type { Tenant } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../shared/errors/appError.js';
import { tenantsRepository } from './repositories.js';
import type { CreateTenantInput, UpdateTenantInput } from './validators.js';

export const tenantsService = {
  async list(): Promise<Tenant[]> {
    return tenantsRepository.findAll();
  },

  async getById(id: string): Promise<Tenant> {
    const tenant = await tenantsRepository.findById(id);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }
    return tenant;
  },

  async getBySlug(slug: string): Promise<Tenant> {
    const tenant = await tenantsRepository.findBySlug(slug);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }
    return tenant;
  },

  async create(input: CreateTenantInput): Promise<Tenant> {
    const existing = await tenantsRepository.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError('Slug já está em uso');
    }

    return tenantsRepository.create(input);
  },

  async update(id: string, input: UpdateTenantInput): Promise<Tenant> {
    const tenant = await tenantsRepository.findById(id);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    if (input.slug && input.slug !== tenant.slug) {
      const existing = await tenantsRepository.findBySlug(input.slug);
      if (existing) {
        throw new ConflictError('Slug já está em uso');
      }
    }

    return tenantsRepository.update(id, input);
  },

  async delete(id: string): Promise<void> {
    const tenant = await tenantsRepository.findById(id);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    await tenantsRepository.delete(id);
  },
};
