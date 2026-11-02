import { VideoSummary } from './video';

export interface UserProfile {
  id: number;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  description?: string | null;
  videos: VideoSummary[];
}

export interface UpdateProfilePayload {
  displayName?: string;
  description?: string;
}
