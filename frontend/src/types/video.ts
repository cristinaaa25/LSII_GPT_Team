/** Card data returned by GET /api/videos. `thumbnail` is relative to MEDIA_BASE_URL. */
export interface VideoSummary {
  id: number;
  title: string;
  author: string;
  duration: number | null;
  views: number;
  thumbnail: string | null;
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
