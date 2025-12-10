import type { Organization, TeamMember } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../shared/errors/appError.js';
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
    return organizationsRepository.findAll(tenantId);
  },

  async getById(id: string): Promise<Organization> {
    const org = await organizationsRepository.findById(id);
    if (!org) {
      throw new NotFoundError('Organização');
    }
    return org;
  },

  async create(tenantId: string, input: CreateOrganizationInput): Promise<Organization> {
    const normalized = normalizeInput(input);

    if (normalized.cnpj) {
      const existing = await organizationsRepository.findByCnpj(tenantId, normalized.cnpj);
      if (existing) {
        throw new ConflictError('Já existe uma organização cadastrada com este CNPJ');
      }
    }

    return organizationsRepository.create({
      tenant: { connect: { id: tenantId } },
      ...normalized,
    });
  },

  async update(id: string, input: UpdateOrganizationInput): Promise<Organization> {
    const org = await organizationsRepository.findById(id);
    if (!org) {
      throw new NotFoundError('Organização');
    }
    const normalized = normalizeInput(input);
    return organizationsRepository.update(id, normalized);
  },

  async delete(id: string): Promise<void> {
    const org = await organizationsRepository.findById(id);
    if (!org) {
      throw new NotFoundError('Organização');
    }
    await organizationsRepository.delete(id);
  },

  async listTeamMembers(organizationId: string): Promise<TeamMember[]> {
    return organizationsRepository.findTeamMembers(organizationId);
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
