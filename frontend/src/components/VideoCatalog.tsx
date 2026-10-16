import { useEffect, useRef } from 'react';
import { useVideos } from '../hooks/useVideos';
import VideoCard from './VideoCard';

interface Props {
  pageSize?: number;
}

const VideoCatalog = ({ pageSize }: Props) => {
  const { videos, loading, error, hasMore, loadMore } = useVideos(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll: load the next page when the sentinel below the grid becomes visible
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || error || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, error, loadMore]);

  if (loading && videos.length === 0) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading videos...</span>
        </div>
      </div>
    );
  }

  if (!loading && !error && videos.length === 0) {
    return <p className="text-center text-body-secondary py-5">No videos available yet.</p>;
  }

  return (
    <section aria-label="Video catalog">
      <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-xl-4 g-4">
        {videos.map((video) => (
          <div className="col" key={video.id}>
            <VideoCard video={video} />
          </div>
        ))}
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between mt-4" role="alert">
          <span>Error loading videos: {error}</span>
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => void loadMore()}>
            Retry
          </button>
        </div>
      )}

      {hasMore && !error && (
        <div ref={sentinelRef} className="d-flex justify-content-center my-4">
          <button type="button" className="btn btn-outline-primary" onClick={() => void loadMore()} disabled={loading}>
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </section>
  );
};

export default VideoCatalog;
