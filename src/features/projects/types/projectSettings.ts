export const onboardingStepIds = [
  'mission-vision',
  'culture',
  'org-chart',
  'financial',
  'goals',
  'products',
  'team',
] as const;

export type ProjectOnboardingStepId = (typeof onboardingStepIds)[number];

export type ProjectOnboardingValue = 'COMPLETED_VIA_UPLOAD' | 'SKIPPED' | string;

export type ProjectOnboardingSettings = Partial<
  Record<ProjectOnboardingStepId, ProjectOnboardingValue>
>;

export interface ProjectSettings {
  onboarding?: ProjectOnboardingSettings;
}
