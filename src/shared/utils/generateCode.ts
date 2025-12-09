import { randomBytes } from 'crypto';

export function generateProjectCode(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(3).toString('hex').toUpperCase();
  return `PRJ-${timestamp}-${random}`;
}

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}
