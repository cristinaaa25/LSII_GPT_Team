import { getEnv } from './Env';

/** Formats seconds as m:ss or h:mm:ss. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** Formats a view count compactly, e.g. 1234 -> "1.2K views". */
export function formatViews(views: number): string {
  const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(views);
  return `${compact} ${views === 1 ? 'view' : 'views'}`;
}

/** Formats an ISO date string to a human-readable date. */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Resolves an avatar or media URL against MEDIA_BASE_URL. */
export function resolveAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.replace(/^\/?media\//, '').replace(/^\//, '');
  return `${getEnv().MEDIA_BASE_URL}/${path}`;
}

/** Formats an ISO date string (YYYY-MM-DD) for chart axis ticks (MM-DD). */
export function formatChartDate(val: string | null | undefined): string {
  if (typeof val === 'string' && val.length >= 10) {
    return val.slice(5);
  }
  return val ?? '';
}

/** "1 subscriber", "0 subscribers", "12 subscribers". */
export function formatSubscribers(count: number): string {
  return `${count} ${count === 1 ? 'subscriber' : 'subscribers'}`;
}

/** Formats an ISO timestamp as a relative age like "just now", "5 minutes ago", "2 hours ago". */
export function formatTimeAgo(dateString: string | null | undefined, nowMs = Date.now()): string {
  if (!dateString) return '';
  const timestamp = Date.parse(dateString);
  if (Number.isNaN(timestamp)) return '';
  const diffSeconds = Math.max(0, Math.floor((nowMs - timestamp) / 1000));
  if (diffSeconds < 60) return 'just now';
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} ago`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? 'year' : 'years'} ago`;
}
