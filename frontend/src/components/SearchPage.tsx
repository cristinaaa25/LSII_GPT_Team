import React from 'react';
import { useSearchParams } from 'react-router-dom';
import VideoCatalog from './VideoCatalog';

/** Results page for `/search?q=`; an empty query lists every video. */
const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get('q') ?? '').trim();

  return (
    <>
      <h1 className="h4 mb-4">{query ? `Results for "${query}"` : 'All videos'}</h1>
      {/* key: a new query remounts the list so it starts again from page 0 */}
      <VideoCatalog
        key={query}
        query={query}
        emptyMessage={query ? `No videos found for "${query}".` : 'No videos available yet.'}
      />
    </>
  );
};

export default SearchPage;
