import type { Organization, TeamMember } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/appError.js';
import { organizationsRepository } from './repositories.js';
import type {
  CreateOrganizationInput,
  ImportTeamMembersInput,
  UpdateOrganizationInput,
} from './validators.js';

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
    return organizationsRepository.create({
      tenant: { connect: { id: tenantId } },
      ...input,
    });
  },

  async update(id: string, input: UpdateOrganizationInput): Promise<Organization> {
    const org = await organizationsRepository.findById(id);
    if (!org) {
      throw new NotFoundError('Organização');
    }
    return organizationsRepository.update(id, input);
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
