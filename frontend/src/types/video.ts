/** Card data returned by GET /api/videos. `thumbnail` is relative to MEDIA_BASE_URL. */
export interface VideoSummary {
  id: number;
  title: string;
  author: string;
  duration: number | null;
  views: number;
  thumbnail: string | null;
}

/** Distinct video from the user's watch history (GET /api/users/me/history). */
export interface HistoryVideo extends VideoSummary {
  /** ISO-8601 timestamp of the user's most recent view of this video. */
  lastViewedAt: string;
}

/** Detailed video information returned by GET /api/videos/:id. */
export interface VideoDetail {
  id?: number;
  title: string;
  description: string | null;
  tags: string[];
  categories: string[];
  author: string;
  uploadDate: string;
  views: number;
  likes: number;
  commentCount: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  likedByMe?: boolean;
  /** Subscribers of the author's channel. */
  authorSubscriberCount?: number;
  /** Whether the current user is subscribed to the author (false when logged out or on your own video). */
  subscribedByMe?: boolean;
}

export interface VideoLikeResponse {
  videoId: number;
  likeCount: number;
  likedByMe: boolean;
}

/** Distinct category with video count returned by GET /api/videos/categories. */
export interface CategoryCount {
  name: string;
  count: number;
  category?: string;
}

/** Body of PUT /api/videos/:id (backend VideoUpdateRequestDto). */
export interface VideoUpdatePayload {
  title: string;
  description: string;
  tags: string[];
  categories: string[];
}

/** Paginated response shape (backend PageDto). */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}
