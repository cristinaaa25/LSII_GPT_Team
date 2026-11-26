import { act, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import ScrollToTop from '../ScrollToTop';

describe('ScrollToTop', () => {
  let scrollSpy: jest.SpyInstance;

  beforeEach(() => {
    scrollSpy = jest.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  afterEach(() => {
    scrollSpy.mockRestore();
  });

  const setup = (initial = '/') => {
    const page = <ScrollToTop />;
    const router = createMemoryRouter(
      [
        { path: '/', element: page },
        { path: '/videos/:id', element: page },
        { path: '/search', element: page },
      ],
      { initialEntries: [initial] }
    );
    render(<RouterProvider router={router} />);
    scrollSpy.mockClear(); // the first render is not a navigation
    return router;
  };

  it('scrolls to the top, instantly, when pushing a new page', async () => {
    const router = setup();
    await act(() => router.navigate('/videos/42'));
    expect(scrollSpy).toHaveBeenCalledTimes(1);
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  it('also scrolls to the top on a replace navigation', async () => {
    const router = setup();
    await act(() => router.navigate('/videos/7', { replace: true }));
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  it('leaves back / forward (POP) to the browser scroll restoration', async () => {
    const router = setup();
    await act(() => router.navigate('/videos/42'));
    scrollSpy.mockClear();
    await act(() => router.navigate(-1));
    expect(router.state.location.pathname).toBe('/');
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('keeps the position when only the query string changes on the same page', async () => {
    const router = setup('/?sort=newest');
    await act(() => router.navigate('/?sort=views&category=Music'));
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('scrolls to the top for a new search, but not for other query changes on /search', async () => {
    const router = setup('/search?q=cats');
    await act(() => router.navigate('/search?q=dogs'));
    expect(scrollSpy).toHaveBeenCalledTimes(1);

    scrollSpy.mockClear();
    await act(() => router.navigate('/search?q=dogs&page=2'));
    expect(scrollSpy).not.toHaveBeenCalled();
  });
});
