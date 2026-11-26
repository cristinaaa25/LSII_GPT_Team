import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVideos } from '../hooks/useVideos';
import { useCategories } from '../hooks/useCategories';
import VideoCard from './VideoCard';
import Skeleton from './Skeleton';
import EmptyState, { EmptyIllustration } from './EmptyState';

interface Props {
  pageSize?: number;
  /** When set, shows search results for this query instead of the whole catalog. */
  query?: string;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIllustration?: EmptyIllustration;
  showFilters?: boolean;
}

const VideoCatalog = ({
  pageSize,
  query,
  emptyMessage = 'No videos available yet.',
  emptyDescription,
  emptyIllustration = query ? 'search' : 'videos',
  showFilters = query === undefined,
}: Props) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') ?? '';
  const selectedSort = searchParams.get('sort') ?? 'newest';

  const { categories } = useCategories(showFilters);
  const { videos, loading, error, hasMore, loadMore } = useVideos(
    pageSize,
    query,
    showFilters ? selectedCategory : undefined,
    showFilters ? (searchParams.has('sort') ? selectedSort : undefined) : undefined
  );

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

  const handleCategoryChange = (catName: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (catName && catName.trim()) {
      nextParams.set('category', catName.trim());
    } else {
      nextParams.delete('category');
    }
    setSearchParams(nextParams);
  };

  const handleSortChange = (newSort: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (newSort && newSort.trim()) {
      nextParams.set('sort', newSort.trim());
    } else {
      nextParams.delete('sort');
    }
    setSearchParams(nextParams);
  };

  return (
    <section aria-label="Video catalog">
      {showFilters && (
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
          <div className="d-flex flex-wrap align-items-center gap-2" role="group" aria-label="Category filter">
            <button
              type="button"
              className={`btn btn-sm ${!selectedCategory ? 'btn-primary' : 'btn-soft'}`}
              onClick={() => handleCategoryChange('')}
            >
              All
            </button>
            {Array.isArray(categories) &&
              categories.map((cat) => {
                const isActive = selectedCategory.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.name}
                    type="button"
                    className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-soft'}`}
                    onClick={() => handleCategoryChange(cat.name)}
                  >
                    {cat.name} <span className="pt-chip-count">{cat.count}</span>
                  </button>
                );
              })}
          </div>

          <div className="d-flex align-items-center gap-2">
            <label htmlFor="sort-select" className="text-body-secondary small text-nowrap">
              Sort by:
            </label>
            <select
              id="sort-select"
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={selectedSort}
              onChange={(e) => handleSortChange(e.target.value)}
              aria-label="Sort videos"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="views">Most views</option>
              <option value="likes">Most likes</option>
            </select>
          </div>
        </div>
      )}

      {loading && videos.length === 0 ? (
        <Skeleton label="Loading videos..." variant="cards" count={8} />
      ) : !loading && !error && videos.length === 0 ? (
        <EmptyState message={emptyMessage} description={emptyDescription} illustration={emptyIllustration} />
      ) : (
        <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-xl-4 g-4">
          {videos.map((video) => (
            <div className="col" key={video.id}>
              <VideoCard video={video} />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between mt-4" role="alert">
          <span>Error loading videos: {error}</span>
          <button type="button" className="btn btn-soft-danger btn-sm" onClick={() => void loadMore()}>
            Retry
          </button>
        </div>
      )}

      {hasMore && !error && videos.length > 0 && (
        <div ref={sentinelRef} className="d-flex justify-content-center my-4">
          <button type="button" className="btn btn-soft" onClick={() => void loadMore()} disabled={loading}>
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </section>
  );
};

export default VideoCatalog;
