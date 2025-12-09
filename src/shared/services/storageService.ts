import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../config/supabase.js';

const BUCKET_DOCUMENTS = 'documents';
const BUCKET_TRANSCRIPTIONS = 'transcriptions';

interface UploadResult {
  path: string;
  publicUrl: string;
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

    const { error } = await supabase.storage.from(BUCKET_DOCUMENTS).upload(uniqueName, file, {
      contentType: mimeType,
      upsert: false,
    });

    if (error) {
      throw new Error(`Erro ao fazer upload: ${error.message}`);
    }

    const { data: urlData } = supabase.storage.from(BUCKET_DOCUMENTS).getPublicUrl(uniqueName);

    return {
      path: uniqueName,
      publicUrl: urlData.publicUrl,
    };
  },

  async uploadTranscription(content: string, projectId: string): Promise<UploadResult> {
    const fileName = `${projectId}/${uuidv4()}.txt`;

    const { error } = await supabase.storage.from(BUCKET_TRANSCRIPTIONS).upload(fileName, content, {
      contentType: 'text/plain',
      upsert: false,
    });

    if (error) {
      throw new Error(`Erro ao fazer upload: ${error.message}`);
    }

    const { data: urlData } = supabase.storage.from(BUCKET_TRANSCRIPTIONS).getPublicUrl(fileName);

    return {
      path: fileName,
      publicUrl: urlData.publicUrl,
    };
  },

  async deleteFile(bucket: string, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      throw new Error(`Erro ao deletar arquivo: ${error.message}`);
    }
  },

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

    if (error) {
      throw new Error(`Erro ao gerar URL: ${error.message}`);
    }

    return data.signedUrl;
  },
};
