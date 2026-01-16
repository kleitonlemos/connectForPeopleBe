import { env } from '../../config/env.js';
import { storageService } from '../services/storageService.js';

export async function transformStorageUrl(
  path: string | null,
  bucketName: string = env.GCS_BUCKET_DOCUMENTS
): Promise<string> {
  if (!path) return '';

  // Se o ambiente for desenvolvimento e usarmos algo local ou se quisermos URLs assinadas sempre
  // Por padrão, como os buckets GCS não são públicos por padrão (conforme erro 412 anterior),
  // usaremos URLs assinadas com cache de 1 hora.
  try {
    return await storageService.getSignedUrl(bucketName, path, 3600);
  } catch (error) {
    console.error(`Error generating signed URL for ${path}:`, error);
    return '';
  }
}

export async function transformDocumentUrls<
  T extends { storagePath?: string | null; fileUrl?: string }
>(doc: T): Promise<T> {
  if (doc.storagePath) {
    doc.fileUrl = await transformStorageUrl(doc.storagePath, env.GCS_BUCKET_DOCUMENTS);
  }
  return doc;
}

export async function transformDocumentsUrls<
  T extends { storagePath?: string | null; fileUrl?: string }
>(docs: T[]): Promise<T[]> {
  return Promise.all(docs.map(doc => transformDocumentUrls(doc)));
}

export async function transformInterviewUrls<
  T extends { transcriptionPath?: string | null; transcriptionUrl?: string | null }
>(interview: T): Promise<T> {
  const path = interview.transcriptionPath || interview.transcriptionUrl;
  if (path && !path.startsWith('http')) {
    interview.transcriptionUrl = await transformStorageUrl(path, env.GCS_BUCKET_TRANSCRIPTIONS);
  }
  return interview;
}

export async function transformInterviewsUrls<
  T extends { transcriptionPath?: string | null; transcriptionUrl?: string | null }
>(interviews: T[]): Promise<T[]> {
  return Promise.all(interviews.map(interview => transformInterviewUrls(interview)));
}

export async function transformOrganizationUrls<
  T extends { logoPath?: string | null; logoUrl?: string | null }
>(org: T): Promise<T> {
  const path = org.logoPath || org.logoUrl;
  if (path && !path.startsWith('http')) {
    org.logoUrl = await transformStorageUrl(path, env.GCS_BUCKET_DOCUMENTS);
  }
  return org;
}

export async function transformOrganizationsUrls<
  T extends { logoPath?: string | null; logoUrl?: string | null }
>(orgs: T[]): Promise<T[]> {
  return Promise.all(orgs.map(org => transformOrganizationUrls(org)));
}

export async function transformUserUrls<
  T extends { avatarPath?: string | null; avatarUrl?: string | null }
>(user: T): Promise<T> {
  const path = user.avatarPath || user.avatarUrl;
  if (path && !path.startsWith('http')) {
    user.avatarUrl = await transformStorageUrl(path, env.GCS_BUCKET_DOCUMENTS);
  }
  return user;
}

export async function transformUsersUrls<
  T extends { avatarPath?: string | null; avatarUrl?: string | null }
>(users: T[]): Promise<T[]> {
  return Promise.all(users.map(user => transformUserUrls(user)));
}

export async function transformTenantUrls<
  T extends {
    logoPath?: string | null;
    logoUrl?: string | null;
    faviconPath?: string | null;
    faviconUrl?: string | null;
  }
>(tenant: T): Promise<T> {
  const logoPath = tenant.logoPath || tenant.logoUrl;
  if (logoPath && !logoPath.startsWith('http')) {
    tenant.logoUrl = await transformStorageUrl(logoPath, env.GCS_BUCKET_DOCUMENTS);
  }

  const faviconPath = tenant.faviconPath || tenant.faviconUrl;
  if (faviconPath && !faviconPath.startsWith('http')) {
    tenant.faviconUrl = await transformStorageUrl(faviconPath, env.GCS_BUCKET_DOCUMENTS);
  }
  return tenant;
}

export async function transformReportUrls<
  T extends { pdfPath?: string | null; pdfUrl?: string | null }
>(report: T): Promise<T> {
  const path = report.pdfPath || report.pdfUrl;
  if (path && !path.startsWith('http')) {
    report.pdfUrl = await transformStorageUrl(path, env.GCS_BUCKET_DOCUMENTS);
  }
  return report;
}

export async function transformReportsUrls<
  T extends { pdfPath?: string | null; pdfUrl?: string | null }
>(reports: T[]): Promise<T[]> {
  return Promise.all(reports.map(report => transformReportUrls(report)));
}

export async function transformSurveyAnswerUrls<
  T extends { storagePath?: string | null; value?: any }
>(answer: T): Promise<T> {
  if (answer.storagePath) {
    // Para respostas de pesquisas, a "URL" é injetada no próprio valor ou retornada separadamente
    // Vamos injetar uma propriedade 'fileUrl' no objeto se ele tiver storagePath
    (answer as any).fileUrl = await transformStorageUrl(
      answer.storagePath,
      env.GCS_BUCKET_DOCUMENTS
    );
  }
  return answer;
}

export async function transformSurveyAnswersUrls<
  T extends { storagePath?: string | null; value?: any }
>(answers: T[]): Promise<T[]> {
  return Promise.all(answers.map(answer => transformSurveyAnswerUrls(answer)));
}
