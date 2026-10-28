import axios, { AxiosProgressEvent } from 'axios';
import { getEnv } from '../utils/Env';
import { authService } from './authService';
import type { VideoDetail } from '../types/video';

export interface UploadVideoPayload {
  file: File;
  title: string;
  description: string;
  tags?: string;
  category?: string;
  thumbnail?: File | null;
}

export const videoService = {
  uploadVideo: async (
    payload: UploadVideoPayload,
    onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
  ): Promise<VideoDetail> => {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('title', payload.title.trim());
    formData.append('description', payload.description.trim());
    if (payload.tags && payload.tags.trim()) {
      formData.append('tags', payload.tags.trim());
    }
    if (payload.category && payload.category.trim()) {
      formData.append('category', payload.category.trim());
    }
    if (payload.thumbnail) {
      formData.append('thumbnail', payload.thumbnail);
    }

    const token = authService.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await axios.post<VideoDetail>(`${getEnv().API_BASE_URL}/videos`, formData, {
      headers,
      onUploadProgress,
    });

    return res.data;
  },
};
