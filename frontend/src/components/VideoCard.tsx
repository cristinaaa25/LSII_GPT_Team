import React from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import type { VideoSummary } from '../types/video';
import { getEnv } from '../utils/Env';
import { formatDuration, formatViews } from '../utils/format';

interface Props {
  video: VideoSummary;
}

const VideoCard: React.FC<Props> = ({ video }) => {
  const inRouter = useInRouterContext();
  const duration = formatDuration(video.duration);

  const cardContent = (
    <article className="card h-100 shadow-sm" aria-label={video.title}>
      <div className="position-relative">
        <div className="ratio ratio-16x9 bg-dark rounded-top overflow-hidden">
          {video.thumbnail && (
            <img
              src={`${getEnv().MEDIA_BASE_URL}/${video.thumbnail}`}
              alt={video.title}
              className="object-fit-cover"
              loading="lazy"
            />
          )}
        </div>
        {duration && (
          <span className="badge bg-dark bg-opacity-75 position-absolute bottom-0 end-0 m-2" aria-label="Duration">
            {duration}
          </span>
        )}
      </div>
      <div className="card-body">
        <h2 className="card-title h6 text-truncate" title={video.title}>
          {video.title}
        </h2>
        <p className="card-text text-body-secondary small mb-0">{video.author}</p>
        <p className="card-text text-body-secondary small">{formatViews(video.views)}</p>
      </div>
    </article>
  );

  if (inRouter) {
    return (
      <Link to={`/videos/${video.id}`} className="text-decoration-none text-reset d-block h-100">
        {cardContent}
      </Link>
    );
  }

  return (
    <a href={`/videos/${video.id}`} className="text-decoration-none text-reset d-block h-100">
      {cardContent}
    </a>
  );
};

export default VideoCard;
