import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { VideoSummary } from '../types/video';
import { getEnv } from '../utils/Env';
import { formatDuration, formatViews } from '../utils/format';
import { canHoverPreview, PREVIEW_HOVER_DELAY_MS, previewCoordinator, resolvePreviewSrc } from '../utils/preview';

/**
 * Interface representing the property definitions accepted by the VideoCard component.
 * This ensures strict type safety across the application when rendering video previews.
 */
interface VideoCardProps {
  /** The core summary data object containing video metadata, IDs, titles, and media URLs. */
  video: VideoSummary;
}

/**
 * VideoCard Component
 *
 * Renders an individual video item card including its thumbnail, preview video element,
 * author information, duration, views count, and associated navigation routes.
 * Handles mouse hover interactions to trigger delayed video previews with full coordinator management.
 */
const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  // ==========================================
  // CONSTANTS AND COMPUTED VALUES
  // ==========================================

  /** Formatted duration string derived from raw video duration seconds. */
  const formattedDurationValue = formatDuration(video.duration);

  /** Resolved media preview source URL based on current environment settings. */
  const resolvedVideoSourceUrl = resolvePreviewSrc(video);

  /** Computed media base URL for fetching static thumbnail assets. */
  const applicationEnvironment = getEnv();
  const mediaBaseUrl = applicationEnvironment.MEDIA_BASE_URL;
  const computedThumbnailUrl = video.thumbnail ? `${mediaBaseUrl}/${video.thumbnail}` : null;

  // ==========================================
  // REFERENCES
  // ==========================================

  /** Reference hook pointing directly to the underlying HTML5 video element. */
  const videoElementReference = useRef<HTMLVideoElement>(null);

  /** Reference hook tracking the active hover timeout identifier for cleanup purposes. */
  const hoverTimeoutIdentifierReference = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Reference hook tracking the synchronization state of preview playback. */
  const isPlaybackActiveReference = useRef<boolean>(false);

  // ==========================================
  // COMPONENT STATE HOOKS
  // ==========================================

  /** State hook managing whether the video preview is currently playing. */
  const [isComponentPlayingState, setIsComponentPlayingState] = useState<boolean>(false);

  /** State hook tracking whether an error occurred while loading media elements. */
  const [hasMediaLoadingErrorState, setHasMediaLoadingErrorState] = useState<boolean>(false);

  // ==========================================
  // EFFECT HOOKS
  // ==========================================

  /**
   * Effect hook responsible for resetting internal playback and error states
   * whenever underlying video property identifiers change.
   */
  useEffect(() => {
    // Execute state reset operations
    setHasMediaLoadingErrorState(false);
    isPlaybackActiveReference.current = false;
    setIsComponentPlayingState(false);
  }, [video.id, video.thumbnail, video.videoUrl]);

  /**
   * Effect hook managing global preview coordination subscriptions,
   * cleanup timers, and element pause triggers when other cards take focus.
   */
  useEffect(() => {
    const currentVideoDomElement = videoElementReference.current;
    const currentVideoUniqueId = video.id;

    const previewSubscriptionUnsubscribeFunction = previewCoordinator.subscribe((activePlayingVideoId) => {
      const isDifferentVideoActive = activePlayingVideoId !== currentVideoUniqueId;
      const wasPreviouslyPlayingLocally = isPlaybackActiveReference.current;

      if (isDifferentVideoActive && wasPreviouslyPlayingLocally) {
        isPlaybackActiveReference.current = false;
        setIsComponentPlayingState(false);

        if (videoElementReference.current) {
          videoElementReference.current.pause();
          try {
            videoElementReference.current.currentTime = 0;
          } catch {
            // Safely suppress minor DOM exceptions during forced reset
          }
        }
      }
    });

    return () => {
      previewSubscriptionUnsubscribeFunction();

      if (hoverTimeoutIdentifierReference.current !== null) {
        clearTimeout(hoverTimeoutIdentifierReference.current);
        hoverTimeoutIdentifierReference.current = null;
      }

      if (isPlaybackActiveReference.current) {
        isPlaybackActiveReference.current = false;
        if (currentVideoDomElement) {
          currentVideoDomElement.pause();
        }
      }

      if (previewCoordinator.getActiveId() === currentVideoUniqueId) {
        previewCoordinator.stop(currentVideoUniqueId);
      }
    };
  }, [video.id]);

  // ==========================================
  // EVENT HANDLER FUNCTIONS
  // ==========================================

  /**
   * Handles mouse enter events over the card container to initiate
   * delayed video preview playback following defined threshold timeouts.
   */
  const handleMouseEnterEventAction = useCallback(() => {
    if (hasMediaLoadingErrorState) {
      return;
    }

    const isPreviewPermittedByEnvironment = canHoverPreview();
    if (!isPreviewPermittedByEnvironment) {
      return;
    }

    if (hoverTimeoutIdentifierReference.current !== null) {
      clearTimeout(hoverTimeoutIdentifierReference.current);
    }

    hoverTimeoutIdentifierReference.current = setTimeout(() => {
      previewCoordinator.play(video.id);
      isPlaybackActiveReference.current = true;
      setIsComponentPlayingState(true);

      const targetVideoNode = videoElementReference.current;
      if (targetVideoNode) {
        targetVideoNode.muted = true;
        try {
          targetVideoNode.currentTime = 0;
        } catch {
          // Suppress time reset exceptions safely
        }

        const playbackPromiseResult = targetVideoNode.play();
        if (playbackPromiseResult && typeof playbackPromiseResult.catch === 'function') {
          playbackPromiseResult.catch(() => {
            // Safely ignore browser autoplay restrictions and rejections
          });
        }
      }
    }, PREVIEW_HOVER_DELAY_MS);
  }, [hasMediaLoadingErrorState, video.id]);

  /**
   * Handles mouse leave events to instantly halt video playback,
   * clear pending timers, and restore thumbnail visibility.
   */
  const handleMouseLeaveEventAction = useCallback(() => {
    if (hoverTimeoutIdentifierReference.current !== null) {
      clearTimeout(hoverTimeoutIdentifierReference.current);
      hoverTimeoutIdentifierReference.current = null;
    }

    if (isPlaybackActiveReference.current) {
      isPlaybackActiveReference.current = false;
      setIsComponentPlayingState(false);

      const targetVideoNode = videoElementReference.current;
      if (targetVideoNode) {
        targetVideoNode.pause();
        try {
          targetVideoNode.currentTime = 0;
        } catch {
          // Suppress pause reset exceptions
        }
      }

      previewCoordinator.stop(video.id);
    }
  }, [video.id]);

  /**
   * Handles video element loading errors, marking the component as failed
   * and stopping active preview states.
   */
  const handleVideoElementErrorEvent = useCallback(() => {
    setHasMediaLoadingErrorState(true);

    if (isPlaybackActiveReference.current) {
      isPlaybackActiveReference.current = false;
      setIsComponentPlayingState(false);

      const targetVideoNode = videoElementReference.current;
      if (targetVideoNode) {
        targetVideoNode.pause();
      }

      previewCoordinator.stop(video.id);
    }
  }, [video.id]);

  // ==========================================
  // RENDER COMPUTATIONS
  // ==========================================

  const shouldDisplayVideoElement = isComponentPlayingState && !hasMediaLoadingErrorState;
  const videoElementClassNameString = `object-fit-cover w-100 h-100 position-absolute top-0 start-0 ${
    shouldDisplayVideoElement ? '' : 'd-none'
  }`;

  const detailRoutePathUrl = `/videos/${video.id}`;
  const authorRoutePathUrl = `/users/${encodeURIComponent(video.author)}`;

  return (
    <article
      className="card h-100 shadow-sm pt-card"
      aria-label={video.title}
      onMouseEnter={handleMouseEnterEventAction}
      onMouseLeave={handleMouseLeaveEventAction}
    >
      {/* The thumbnail repeats the title link: hidden from screen readers and the tab order */}
      <Link
        to={detailRoutePathUrl}
        className="text-decoration-none text-reset d-block"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="position-relative">
          <div className="ratio ratio-16x9 pt-thumb overflow-hidden">
            {computedThumbnailUrl ? (
              <img src={computedThumbnailUrl} alt="" className="object-fit-cover" loading="lazy" />
            ) : (
              <div className="d-flex align-items-center justify-content-center pt-thumb-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z"
                  />
                </svg>
              </div>
            )}
            <video
              ref={videoElementReference}
              src={resolvedVideoSourceUrl}
              preload="none"
              muted
              playsInline
              tabIndex={-1}
              aria-hidden="true"
              className={videoElementClassNameString}
              onError={handleVideoElementErrorEvent}
            />
          </div>
          {formattedDurationValue && (
            <span
              className="badge text-bg-dark bg-opacity-75 position-absolute bottom-0 end-0 m-2"
              aria-label="Duration"
            >
              {formattedDurationValue}
            </span>
          )}
        </div>
      </Link>
      <div className="card-body">
        <h2 className="card-title h6 text-truncate" title={video.title}>
          <Link to={detailRoutePathUrl} className="text-decoration-none text-reset">
            {video.title}
          </Link>
        </h2>
        <p className="card-text text-body-secondary small mb-0">
          <Link
            to={authorRoutePathUrl}
            className="text-decoration-none text-body-secondary"
            aria-label={`Author ${video.author}`}
          >
            {video.author}
          </Link>
        </p>
        <p className="card-text text-body-secondary small">{formatViews(video.views)}</p>
      </div>
    </article>
  );
};

export default VideoCard;
