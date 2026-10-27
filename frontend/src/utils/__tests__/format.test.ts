import { formatDate, formatDuration, formatViews } from '../format';

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
