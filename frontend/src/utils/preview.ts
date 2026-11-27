/**
 * @file preview.ts
 * @description Provides core utility functions and singleton coordinator management
 * for handling video preview playback states, hover support detection, and dynamic
 * video media source URL resolution across application components.
 */

import type { VideoSummary } from '../types/video';
import { getEnv } from './Env';

/**
 * Standard hover delay threshold in milliseconds before initiating a video preview.
 * Prevents accidental trigger events during rapid cursor movement across the UI.
 */
export const PREVIEW_HOVER_DELAY_MS = 400;

/**
 * Callback function type definition representing a listener subscribed
 * to preview coordination events. Receives the active video ID or null when stopped.
 */
export type PreviewListener = (activeVideoId: number | null) => void;

/**
 * Class PreviewCoordinator
 *
 * Manages active video preview states across multiple cards in a singleton pattern,
 * ensuring that only a single video preview plays at any given time and notifying
 * registered component listeners of state transitions.
 */
class PreviewCoordinator {
  /** Internal tracking field storing the currently active playing video identifier or null. */
  private activeVideoId: number | null = null;

  /** Set collection containing all registered event listener callbacks. */
  private listeners: Set<PreviewListener> = new Set();

  /**
   * Triggers playback state for a specified video identifier, updating the active ID
   * and notifying all subscribed listeners of the state change.
   *
   * @param {number} videoId - The unique numeric identifier of the video starting playback.
   */
  play(videoId: number): void {
    this.activeVideoId = videoId;

    // Iterate and notify all active subscribers
    this.listeners.forEach((listenerCallbackFunction) => {
      try {
        listenerCallbackFunction(videoId);
      } catch {
        // Safely suppress errors originating from individual listeners
      }
    });
  }

  /**
   * Stops preview playback either globally or specifically for a targeted video identifier.
   *
   * @param {number} [videoId] - Optional unique identifier of the video to stop. If omitted, stops all active previews.
   */
  stop(videoId?: number): void {
    if (videoId === undefined || this.activeVideoId === videoId) {
      this.activeVideoId = null;

      // Notify all subscribers that playback has stopped (null active ID)
      this.listeners.forEach((listenerCallbackFunction) => {
        try {
          listenerCallbackFunction(null);
        } catch {
          // Safely suppress listener callback errors
        }
      });
    }
  }

  /**
   * Subscribes a new event listener callback to preview coordinator state changes.
   *
   * @param {PreviewListener} listener - The callback function to execute on state changes.
   * @returns {() => void} An unsubscribe function that removes the listener when invoked.
   */
  subscribe(listener: PreviewListener): () => void {
    this.listeners.add(listener);

    // Return cleanup unsubscribe function closure
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Retrieves the unique identifier of the currently active playing video preview.
   *
   * @returns {number | null} The active video ID, or null if no preview is currently active.
   */
  getActiveId(): number | null {
    return this.activeVideoId;
  }

  /**
   * Completely resets the coordinator singleton state, clearing active video IDs
   * and purging all registered listeners.
   */
  reset(): void {
    this.activeVideoId = null;
    this.listeners.clear();
  }
}

/**
 * Singleton instance of the PreviewCoordinator managing global video preview states.
 */
export const previewCoordinator = new PreviewCoordinator();

/**
 * Evaluates whether the current environment and device configuration support
 * interactive hover previews without violating user accessibility preferences.
 *
 * @returns {boolean} Returns true only on devices supporting hover pointer interactions
 *                    where the user has not enabled reduced motion settings.
 */
export function canHoverPreview(): boolean {
  // Validate window and matchMedia API availability for SSR safety
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  const hasPrimaryHoverCapabilitySupport = window.matchMedia('(hover: hover)').matches;
  const userPrefersReducedMotionEnabled = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return hasPrimaryHoverCapabilitySupport && !userPrefersReducedMotionEnabled;
}

/**
 * Resolves the appropriate preview video stream URL for a given VideoSummary object.
 * Priority order:
 * 1. Uses explicit videoUrl if present (normalizing relative vs absolute paths).
 * 2. Otherwise substitutes thumbnail file extension with .mp4.
 * 3. Falls back to `${id}.mp4` appended to the media base URL.
 *
 * @param {VideoSummary} video - The summary object containing video metadata.
 * @returns {string} The fully resolved preview video stream source URL.
 */
export function resolvePreviewSrc(video: VideoSummary): string {
  const applicationEnvironmentSettings = getEnv();
  const configuredMediaBaseUrl = applicationEnvironmentSettings.MEDIA_BASE_URL;

  // Case 1: Explicit videoUrl property exists
  if (video.videoUrl) {
    const trimmedVideoUrlString = video.videoUrl.trim();

    if (/^https?:\/\//i.test(trimmedVideoUrlString)) {
      return trimmedVideoUrlString;
    }

    const cleanedRelativePathString = trimmedVideoUrlString.replace(/^\/?media\//, '').replace(/^\//, '');

    return `${configuredMediaBaseUrl}/${cleanedRelativePathString}`;
  }

  // Case 2: Fallback to substituting thumbnail extension with .mp4
  if (video.thumbnail) {
    const trimmedThumbnailString = video.thumbnail.trim();
    const mediaSourcePathWithMp4Extension = trimmedThumbnailString.replace(/\.[^.]+$/, '.mp4');

    if (/^https?:\/\//i.test(mediaSourcePathWithMp4Extension)) {
      return mediaSourcePathWithMp4Extension;
    }

    const normalizedThumbnailPathString = mediaSourcePathWithMp4Extension.replace(/^\/?media\//, '').replace(/^\//, '');

    return `${configuredMediaBaseUrl}/${normalizedThumbnailPathString}`;
  }

  // Case 3: Absolute fallback using video ID
  return `${configuredMediaBaseUrl}/${video.id}.mp4`;
}
