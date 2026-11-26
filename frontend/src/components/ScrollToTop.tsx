import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Starts each new page at the top. Single-page apps keep the scroll offset between routes,
 * so opening a video from a scrolled catalog used to land on its description or comments.
 * - PUSH / REPLACE to another path: scroll to the top (instant).
 * - POP (back / forward): leave it to the browser, so going back keeps the catalog position.
 * - Only the query string changed on the same page (catalog filters, sorting): keep the position,
 *   except a new search on /search, which is a new list of results.
 */
const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();
  const previous = useRef({ pathname, search });

  // Layout effect: runs before the browser paints the new page, so there is no visible jump
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { pathname, search };
    if (navigationType === 'POP') return;

    const pathChanged = before.pathname !== pathname;
    const newSearch =
      pathname === '/search' && new URLSearchParams(before.search).get('q') !== new URLSearchParams(search).get('q');

    if (pathChanged || newSearch) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, search, navigationType]);

  return null;
};

export default ScrollToTop;
