import {
  formatChartDate,
  formatDate,
  formatDuration,
  formatSubscribers,
  formatTimeAgo,
  formatViews,
  resolveAvatarUrl,
} from '../format';

describe('formatSubscribers', () => {
  it('uses the singular only for one', () => {
    expect(formatSubscribers(0)).toBe('0 subscribers');
    expect(formatSubscribers(1)).toBe('1 subscriber');
    expect(formatSubscribers(12)).toBe('12 subscribers');
  });
});

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65.4)).toBe('1:05');
  });

  it('formats hours', () => {
    expect(formatDuration(3600)).toBe('1:00:00');
  });

  it('returns an empty string for missing or invalid values', () => {
    expect(formatDuration(null)).toBe('');
    expect(formatDuration(undefined)).toBe('');
    expect(formatDuration(-1)).toBe('');
    expect(formatDuration(Number.NaN)).toBe('');
  });
});

describe('formatViews', () => {
  it('uses compact notation', () => {
    expect(formatViews(1)).toBe('1 view');
    expect(formatViews(999)).toBe('999 views');
    expect(formatViews(1234)).toBe('1.2K views');
    expect(formatViews(2_500_000)).toBe('2.5M views');
  });
});

describe('formatDate', () => {
  it('formats valid ISO date strings', () => {
    const formatted = formatDate('2024-05-15T10:00:00Z');
    expect(formatted).toMatch(/May 15, 2024/);
  });

  it('returns empty string for null, undefined or invalid dates', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('invalid-date')).toBe('');
  });
});

describe('resolveAvatarUrl', () => {
  it('returns undefined for empty, null or undefined input', () => {
    expect(resolveAvatarUrl(null)).toBeUndefined();
    expect(resolveAvatarUrl(undefined)).toBeUndefined();
    expect(resolveAvatarUrl('')).toBeUndefined();
    expect(resolveAvatarUrl('   ')).toBeUndefined();
  });

  it('returns absolute http(s) URLs as is', () => {
    expect(resolveAvatarUrl('http://example.com/avatar.png')).toBe('http://example.com/avatar.png');
    expect(resolveAvatarUrl('https://example.com/pic.jpg')).toBe('https://example.com/pic.jpg');
  });

  it('resolves relative media path against MEDIA_BASE_URL', () => {
    expect(resolveAvatarUrl('/media/avatars/user.png')).toBe('development/avatars/user.png');
    expect(resolveAvatarUrl('avatars/user.png')).toBe('development/avatars/user.png');
  });
});

describe('formatChartDate', () => {
  it('slices MM-DD from ISO date string', () => {
    expect(formatChartDate('2026-11-04')).toBe('11-04');
  });

  it('returns short or non-date strings unchanged', () => {
    expect(formatChartDate('Nov')).toBe('Nov');
    expect(formatChartDate(null)).toBe('');
    expect(formatChartDate(undefined)).toBe('');
  });
});

describe('formatTimeAgo', () => {
  const now = Date.parse('2026-11-25T12:00:00Z');

  it('formats relative durations from seconds up to years', () => {
    expect(formatTimeAgo('2026-11-25T11:59:30Z', now)).toBe('just now');
    expect(formatTimeAgo('2026-11-25T11:59:00Z', now)).toBe('1 minute ago');
    expect(formatTimeAgo('2026-11-25T11:55:00Z', now)).toBe('5 minutes ago');
    expect(formatTimeAgo('2026-11-25T11:00:00Z', now)).toBe('1 hour ago');
    expect(formatTimeAgo('2026-11-25T09:00:00Z', now)).toBe('3 hours ago');
    expect(formatTimeAgo('2026-11-24T12:00:00Z', now)).toBe('1 day ago');
    expect(formatTimeAgo('2026-11-21T12:00:00Z', now)).toBe('4 days ago');
    expect(formatTimeAgo('2026-10-20T12:00:00Z', now)).toBe('1 month ago');
    expect(formatTimeAgo('2025-11-20T12:00:00Z', now)).toBe('1 year ago');
  });

  it('returns empty string for missing or invalid dates', () => {
    expect(formatTimeAgo(null, now)).toBe('');
    expect(formatTimeAgo(undefined, now)).toBe('');
    expect(formatTimeAgo('not-a-date', now)).toBe('');
  });
});
