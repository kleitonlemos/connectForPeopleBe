import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2),
  tradeName: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  size: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  mission: z.string().optional().nullable(),
  vision: z.string().optional().nullable(),
  values: z.string().optional().nullable(),
});

export const updateOrganizationSchema = createOrganizationSchema.partial();

export const importTeamMembersSchema = z.array(
  z.object({
    name: z.string().min(2),
    email: z.string().email(),
    position: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    hireDate: z.string().optional().nullable(),
    contractType: z.string().optional().nullable(),
  })
);

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type ImportTeamMembersInput = z.infer<typeof importTeamMembersSchema>;
