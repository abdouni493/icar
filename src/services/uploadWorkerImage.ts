import { supabase } from '../supabase';
import { compressImage } from '../utils/imageCompression';

export const uploadWorkerProfilePhoto = async (file: File, workerId?: string): Promise<{ success: boolean; url?: string; error?: string }> => {
  try {
    const upload = await compressImage(file, { maxDimension: 1200 });
    const fileExt = upload.name.split('.').pop() || 'jpg';
    const fileName = workerId
      ? `worker_${workerId}_profile_${Date.now()}.${fileExt}`
      : `worker_temp_profile_${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('worker')
      .upload(fileName, upload, {
        cacheControl: '31536000',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('worker')
      .getPublicUrl(data.path);

    return { success: true, url: publicUrl };
  } catch (err) {
    console.error('Upload failed:', err);
    return { success: false, error: 'Upload failed' };
  }
};