/** Card data returned by GET /api/videos. `thumbnail` is relative to MEDIA_BASE_URL. */
export interface VideoSummary {
  id: number;
  title: string;
  author: string;
  duration: number | null;
  views: number;
  thumbnail: string | null;
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
