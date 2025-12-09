import type { Prisma, Tenant } from '@prisma/client';
import { prisma } from '../../config/database.js';

export const tenantsRepository = {
  async findAll(): Promise<Tenant[]> {
    return prisma.tenant.findMany({
      orderBy: { name: 'asc' },
    });
  },

  async findById(id: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({
      where: { id },
    });
  },

  async findBySlug(slug: string): Promise<Tenant | null> {
    return prisma.tenant.findUnique({
      where: { slug },
    });
  },

  async create(data: Prisma.TenantCreateInput): Promise<Tenant> {
    return prisma.tenant.create({ data });
  },

  async update(id: string, data: Prisma.TenantUpdateInput): Promise<Tenant> {
    return prisma.tenant.update({
      where: { id },
      data,
    });
  },

  async delete(id: string): Promise<void> {
    await prisma.tenant.delete({
      where: { id },
    });
  },
};
