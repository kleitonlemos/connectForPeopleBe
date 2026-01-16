import type { Tenant } from '@prisma/client';
import { env } from '../../config/env.js';
import { ConflictError, NotFoundError } from '../../shared/errors/appError.js';
import { storageService } from '../../shared/services/storageService.js';
import { transformTenantUrls } from '../../shared/utils/storage.js';
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
    return transformTenantUrls(tenant);
  },

  async getBySlug(slug: string): Promise<Tenant> {
    const tenant = await tenantsRepository.findBySlug(slug);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }
    return transformTenantUrls(tenant);
  },

  async create(input: CreateTenantInput): Promise<Tenant> {
    const existing = await tenantsRepository.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError('Slug já está em uso');
    }

    const created = await tenantsRepository.create(input);
    return transformTenantUrls(created);
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

    const updated = await tenantsRepository.update(id, input);
    return transformTenantUrls(updated);
  },

  async delete(id: string): Promise<void> {
    const tenant = await tenantsRepository.findById(id);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    if (tenant.logoPath) {
      try {
        await storageService.deleteFile(env.GCS_BUCKET_DOCUMENTS, tenant.logoPath);
      } catch (error) {
        console.error(`Erro ao deletar logo do tenant do storage: ${tenant.logoPath}`, error);
      }
    }

    if (tenant.faviconPath) {
      try {
        await storageService.deleteFile(env.GCS_BUCKET_DOCUMENTS, tenant.faviconPath);
      } catch (error) {
        console.error(`Erro ao deletar favicon do tenant do storage: ${tenant.faviconPath}`, error);
      }
    }

    await tenantsRepository.delete(id);
  },

  async uploadLogo(id: string, file: Buffer, fileName: string, mimeType: string): Promise<Tenant> {
    const tenant = await tenantsRepository.findById(id);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    const { path } = await storageService.uploadFile(file, fileName, mimeType, 'tenants/logos');

    const updated = await tenantsRepository.update(id, {
      logoPath: path,
      logoUrl: '', // Limpamos a URL legada
    });

    return transformTenantUrls(updated);
  },

  async uploadFavicon(
    id: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<Tenant> {
    const tenant = await tenantsRepository.findById(id);
    if (!tenant) {
      throw new NotFoundError('Tenant');
    }

    const { path } = await storageService.uploadFile(file, fileName, mimeType, 'tenants/favicons');

    const updated = await tenantsRepository.update(id, {
      faviconPath: path,
      faviconUrl: '', // Limpamos a URL legada
    });

    return transformTenantUrls(updated);
  },
};
