import type { Organization, TeamMember } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { ConflictError, NotFoundError } from '../../shared/errors/appError.js';
import { storageService } from '../../shared/services/storageService.js';
import {
  transformOrganizationUrls,
  transformOrganizationsUrls,
} from '../../shared/utils/storage.js';
import { organizationsRepository } from './repositories.js';
import type {
  CreateOrganizationInput,
  ImportTeamMembersInput,
  UpdateOrganizationInput,
} from './validators.js';

const emptyToNull = (value: string | null | undefined): string | null =>
  value === '' || value === undefined ? null : value;

const normalizeInput = <T extends Record<string, unknown>>(input: T): T => {
  const result = { ...input };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === 'string') {
      (result as Record<string, unknown>)[key] = emptyToNull(result[key] as string);
    }
  }
  return result;
};

export const organizationsService = {
  async list(tenantId: string): Promise<Organization[]> {
    const orgs = await organizationsRepository.findAll(tenantId);
    return transformOrganizationsUrls(orgs);
  },

  async getById(
    id: string,
    tenantId?: string,
    userRole?: string,
    userOrganizationId?: string
  ): Promise<Organization> {
    const org = await organizationsRepository.findById(id);
    if (!org) {
      throw new NotFoundError('Organização');
    }

    if (tenantId && org.tenantId !== tenantId) {
      throw new NotFoundError('Organização');
    }

    if (userRole === 'CLIENT' && userOrganizationId && org.id !== userOrganizationId) {
      throw new NotFoundError('Organização');
    }

    return transformOrganizationUrls(org);
  },

  async create(tenantId: string, input: CreateOrganizationInput): Promise<Organization> {
    const normalized = normalizeInput(input);

    if (normalized.cnpj) {
      const existing = await organizationsRepository.findByCnpj(tenantId, normalized.cnpj);
      if (existing) {
        throw new ConflictError('Já existe uma organização cadastrada com este CNPJ');
      }
    }

    const created = await organizationsRepository.create({
      tenant: { connect: { id: tenantId } },
      ...normalized,
    });

    return transformOrganizationUrls(created);
  },

  async update(id: string, input: UpdateOrganizationInput): Promise<Organization> {
    const org = await organizationsRepository.findById(id);
    if (!org) {
      throw new NotFoundError('Organização');
    }
    const normalized = normalizeInput(input);
    const updated = await organizationsRepository.update(id, normalized);

    // Sincronizar checklist dos projetos se missão, visão ou valores foram preenchidos
    if (normalized.mission || normalized.vision || normalized.values) {
      const projects = await prisma.project.findMany({
        where: { organizationId: id },
        select: { id: true, settings: true },
      });

      for (const project of projects) {
        // Usamos update do projeto para disparar a sincronização completa e recálculo de progresso
        // mas como estamos no service de organização, chamamos o prisma diretamente para evitar dependência circular
        // A lógica de sincronização será disparada na próxima leitura do projeto via getProgress/getChecklist
        // ou podemos forçar aqui se necessário.
        await prisma.documentChecklist.updateMany({
          where: {
            projectId: project.id,
            documentType: 'MISSION_VISION_VALUES',
            status: 'PENDING',
          },
          data: { status: 'UPLOADED' },
        });

        // Como o status mudou, o progresso do projeto pode ter mudado.
        // O ideal seria ter uma função utilitária compartilhada para isso.
      }
    }

    return transformOrganizationUrls(updated);
  },

  async delete(id: string): Promise<void> {
    const org = await organizationsRepository.findById(id);
    if (!org) {
      throw new NotFoundError('Organização');
    }

    if (org.logoPath) {
      try {
        await storageService.deleteFile(env.GCS_BUCKET_DOCUMENTS, org.logoPath);
      } catch (error) {
        console.error(`Erro ao deletar logo da organização do storage: ${org.logoPath}`, error);
      }
    }

    await organizationsRepository.delete(id);
  },

  async listTeamMembers(organizationId: string): Promise<TeamMember[]> {
    return organizationsRepository.findTeamMembers(organizationId);
  },

  async uploadLogo(
    id: string,
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<Organization> {
    const org = await organizationsRepository.findById(id);
    if (!org) {
      throw new NotFoundError('Organização');
    }

    const { path } = await storageService.uploadFile(file, fileName, mimeType, 'logos');

    const updated = await organizationsRepository.update(id, {
      logoPath: path,
      logoUrl: '', // Limpamos a URL legada
    });

    return transformOrganizationUrls(updated);
  },

  async importTeamMembers(
    organizationId: string,
    members: ImportTeamMembersInput
  ): Promise<number> {
    const parsedMembers = members.map(m => ({
      name: m.name,
      email: m.email,
      position: m.position,
      department: m.department,
      hireDate: m.hireDate ? new Date(m.hireDate) : null,
      contractType: m.contractType,
    }));

    return organizationsRepository.createManyTeamMembers(organizationId, parsedMembers);
  },
};
