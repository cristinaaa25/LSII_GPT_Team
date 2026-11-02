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
    <article className="card h-100 shadow-sm" aria-label={video.title}>
      <Link to={`/videos/${video.id}`} className="text-decoration-none text-reset d-block">
        <div className="position-relative">
          <div className="ratio ratio-16x9 bg-dark rounded-top overflow-hidden">
            {video.thumbnail ? (
              <img
                src={`${getEnv().MEDIA_BASE_URL}/${video.thumbnail}`}
                alt={video.title}
                className="object-fit-cover"
                loading="lazy"
              />
            ) : (
              <div
                className="d-flex align-items-center justify-content-center text-white-50 fs-1"
                role="img"
                aria-label="No thumbnail"
              >
                ▶
              </div>
            )}
          </div>
          {duration && (
            <span className="badge bg-dark bg-opacity-75 position-absolute bottom-0 end-0 m-2" aria-label="Duration">
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
