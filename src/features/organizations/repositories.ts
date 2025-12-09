import type { Organization, Prisma, TeamMember } from '@prisma/client';
import { prisma } from '../../config/database.js';

export const organizationsRepository = {
  async findAll(tenantId: string): Promise<Organization[]> {
    return prisma.organization.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { id },
    });
  },

  async create(data: Prisma.OrganizationCreateInput): Promise<Organization> {
    return prisma.organization.create({ data });
  },

  async update(id: string, data: Prisma.OrganizationUpdateInput): Promise<Organization> {
    return prisma.organization.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.organization.delete({
      where: { id },
    });
  },

  async findTeamMembers(organizationId: string): Promise<TeamMember[]> {
    return prisma.teamMember.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
    });
  },

  async createTeamMember(data: Prisma.TeamMemberCreateInput): Promise<TeamMember> {
    return prisma.teamMember.create({ data });
  },

  async createManyTeamMembers(
    organizationId: string,
    members: Array<{
      name: string;
      email: string;
      position?: string | null;
      department?: string | null;
      hireDate?: Date | null;
      contractType?: string | null;
    }>
  ): Promise<number> {
    const result = await prisma.teamMember.createMany({
      data: members.map(m => ({
        ...m,
        organizationId,
      })),
      skipDuplicates: true,
    });
    return result.count;
  },

  async updateTeamMember(id: string, data: Prisma.TeamMemberUpdateInput): Promise<TeamMember> {
    return prisma.teamMember.update({
      where: { id },
      data,
    });
  },

  async deleteTeamMember(id: string): Promise<void> {
    await prisma.teamMember.update({
      where: { id },
      data: { isActive: false },
    });
  },
};
