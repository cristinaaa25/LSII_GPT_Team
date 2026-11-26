import React from 'react';
import { Link } from 'react-router-dom';
import type { VideoSummary } from '../types/video';
import { getEnv } from '../utils/Env';
import { formatDuration, formatViews } from '../utils/format';

interface Props {
  video: VideoSummary;
}

const VideoCard: React.FC<Props> = ({ video }) => {
  const duration = formatDuration(video.duration);

  return (
    <article className="card h-100 shadow-sm pt-card" aria-label={video.title}>
      {/* The thumbnail repeats the title link: hidden from screen readers and the tab order */}
      <Link
        to={`/videos/${video.id}`}
        className="text-decoration-none text-reset d-block"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="position-relative">
          <div className="ratio ratio-16x9 pt-thumb overflow-hidden">
            {video.thumbnail ? (
              <img
                src={`${getEnv().MEDIA_BASE_URL}/${video.thumbnail}`}
                alt=""
                className="object-fit-cover"
                loading="lazy"
              />
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
          </div>
          {duration && (
            <span
              className="badge text-bg-dark bg-opacity-75 position-absolute bottom-0 end-0 m-2"
              aria-label="Duration"
            >
              {duration}
            </span>
          )}
        </div>
      </Link>
      <div className="card-body">
        <h2 className="card-title h6 text-truncate" title={video.title}>
          <Link to={`/videos/${video.id}`} className="text-decoration-none text-reset">
            {video.title}
          </Link>
        </h2>
        <p className="card-text text-body-secondary small mb-0">
          <Link
            to={`/users/${encodeURIComponent(video.author)}`}
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
