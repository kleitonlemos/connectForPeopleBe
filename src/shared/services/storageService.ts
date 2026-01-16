import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env.js';

const storage = new Storage({
  projectId: env.GCP_PROJECT_ID,
});

const BUCKET_DOCUMENTS = env.GCS_BUCKET_DOCUMENTS;
const BUCKET_TRANSCRIPTIONS = env.GCS_BUCKET_TRANSCRIPTIONS;

interface UploadResult {
  path: string;
}

export const storageService = {
  async uploadDocument(
    file: Buffer,
    fileName: string,
    mimeType: string,
    organizationId: string
  ): Promise<UploadResult> {
    const fileExt = fileName.split('.').pop();
    const uniqueName = `${organizationId}/${uuidv4()}.${fileExt}`;

    const bucket = storage.bucket(BUCKET_DOCUMENTS);
    const gcsFile = bucket.file(uniqueName);

    await gcsFile.save(file, {
      contentType: mimeType,
      resumable: false,
    });

    // No GCS, salvamos apenas o caminho. A URL é gerada sob demanda.
    return {
      path: uniqueName,
    };
  },

  async uploadTranscription(content: string, projectId: string): Promise<UploadResult> {
    const fileName = `${projectId}/${uuidv4()}.txt`;
    const bucket = storage.bucket(BUCKET_TRANSCRIPTIONS);
    const gcsFile = bucket.file(fileName);

    await gcsFile.save(content, {
      contentType: 'text/plain',
      resumable: false,
    });

    return {
      path: fileName,
    };
  },

  async uploadFile(
    file: Buffer,
    fileName: string,
    mimeType: string,
    folder: string
  ): Promise<UploadResult> {
    const fileExt = fileName.split('.').pop();
    const uniqueName = `${folder}/${uuidv4()}.${fileExt}`;

    const bucket = storage.bucket(BUCKET_DOCUMENTS);
    const gcsFile = bucket.file(uniqueName);

    await gcsFile.save(file, {
      contentType: mimeType,
      resumable: false,
    });

    return {
      path: uniqueName,
    };
  },

  async deleteFile(bucketName: string, path: string): Promise<void> {
    await storage.bucket(bucketName).file(path).delete();
  },

  async getSignedUrl(bucketName: string, path: string, expiresIn = 3600): Promise<string> {
    const [url] = await storage
      .bucket(bucketName)
      .file(path)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresIn * 1000,
      });

    return url;
  },
};
