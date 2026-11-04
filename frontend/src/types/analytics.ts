export interface AnalyticsTotals {
  videos: number;
  views: number;
  likes: number;
  comments: number;
}

export interface VideoAnalytics {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  uploadDate: string;
  duration?: number | null;
  views: number;
  likes: number;
  comments: number;
}

export interface DailyViews {
  date: string;
  views: number;
  authenticatedViews: number;
  anonymousViews: number;
}

export interface UserAnalytics {
  totals: AnalyticsTotals;
  videos: VideoAnalytics[];
  viewsPerDay: DailyViews[];
}
