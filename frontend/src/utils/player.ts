/** Speeds offered in the player menu. */
export const PLAYBACK_RATES = [0.5, 1, 1.25, 1.5, 2];

/** "m:ss" or "h:mm:ss", rounding down like every player does (0:59.9 is still 0:59). */
export function formatPlayerTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
