import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { VideoAnalytics } from '../types/analytics';
import { formatDate, formatDuration } from '../utils/format';
import { getEnv } from '../utils/Env';

interface Props {
  videos: VideoAnalytics[];
}

type SortField = 'title' | 'uploadDate' | 'duration' | 'views' | 'likes' | 'comments';
type SortOrder = 'asc' | 'desc';

const resolveThumbnail = (url: string | null | undefined): string | undefined => {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const path = trimmed.replace(/^\/?media\//, '').replace(/^\//, '');
  return `${getEnv().MEDIA_BASE_URL}/${path}`;
};

export const SortableVideoTable: React.FC<Props> = ({ videos }) => {
  const [sortField, setSortField] = useState<SortField>('views');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'title' ? 'asc' : 'desc');
    }
  };

  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'uploadDate':
          comparison = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
          break;
        case 'duration':
          comparison = (a.duration ?? 0) - (b.duration ?? 0);
          break;
        case 'views':
          comparison = a.views - b.views;
          break;
        case 'likes':
          comparison = a.likes - b.likes;
          break;
        case 'comments':
          comparison = a.comments - b.comments;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [videos, sortField, sortOrder]);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <span className="text-muted ms-1 small">↕</span>;
    }
    return <span className="ms-1 small">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" aria-label="Per-video analytics">
            <thead className="table-light">
              <tr>
                <th
                  scope="col"
                  role="button"
                  onClick={() => handleSort('title')}
                  style={{ cursor: 'pointer', minWidth: '240px' }}
                  aria-sort={sortField === 'title' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Video {renderSortIndicator('title')}
                </th>
                <th
                  scope="col"
                  role="button"
                  onClick={() => handleSort('uploadDate')}
                  style={{ cursor: 'pointer', minWidth: '130px' }}
                  aria-sort={sortField === 'uploadDate' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Date {renderSortIndicator('uploadDate')}
                </th>
                <th
                  scope="col"
                  role="button"
                  onClick={() => handleSort('duration')}
                  style={{ cursor: 'pointer', minWidth: '100px' }}
                  aria-sort={sortField === 'duration' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Duration {renderSortIndicator('duration')}
                </th>
                <th
                  scope="col"
                  role="button"
                  className="text-end"
                  onClick={() => handleSort('views')}
                  style={{ cursor: 'pointer', minWidth: '100px' }}
                  aria-sort={sortField === 'views' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Views {renderSortIndicator('views')}
                </th>
                <th
                  scope="col"
                  role="button"
                  className="text-end"
                  onClick={() => handleSort('likes')}
                  style={{ cursor: 'pointer', minWidth: '100px' }}
                  aria-sort={sortField === 'likes' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Likes {renderSortIndicator('likes')}
                </th>
                <th
                  scope="col"
                  role="button"
                  className="text-end"
                  onClick={() => handleSort('comments')}
                  style={{ cursor: 'pointer', minWidth: '110px' }}
                  aria-sort={sortField === 'comments' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  Comments {renderSortIndicator('comments')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedVideos.map((video) => {
                const thumb = resolveThumbnail(video.thumbnailUrl);
                return (
                  <tr key={video.id}>
                    <td>
                      <div className="d-flex align-items-center gap-3">
                        <div
                          style={{
                            width: '80px',
                            height: '45px',
                            backgroundColor: '#212529',
                            overflow: 'hidden',
                            borderRadius: '4px',
                            flexShrink: 0,
                          }}
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={video.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="d-flex w-100 h-100 justify-content-center align-items-center text-white-50">
                              ▶
                            </div>
                          )}
                        </div>
                        <Link
                          to={`/videos/${video.id}`}
                          className="text-decoration-none text-dark fw-semibold text-truncate d-inline-block"
                          style={{ maxWidth: '320px' }}
                          title={video.title}
                        >
                          {video.title}
                        </Link>
                      </div>
                    </td>
                    <td className="text-muted small">{formatDate(video.uploadDate)}</td>
                    <td className="text-muted small">{formatDuration(video.duration)}</td>
                    <td className="text-end fw-semibold">{video.views.toLocaleString()}</td>
                    <td className="text-end">{video.likes.toLocaleString()}</td>
                    <td className="text-end">{video.comments.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SortableVideoTable;
