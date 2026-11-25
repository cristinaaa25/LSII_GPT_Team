import type { VideoSummary } from './video';

export interface PlaylistSummary {
  id: number;
  name: string;
  watchLater: boolean;
  videoCount: number;
  containsVideo: boolean;
  createdAt: string;
}

export interface PlaylistVideo extends VideoSummary {
  addedAt: string;
}

export interface PlaylistDetail {
  id: number;
  name: string;
  watchLater: boolean;
  createdAt: string;
  videos: PlaylistVideo[];
}
