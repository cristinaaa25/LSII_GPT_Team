import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HistoryPage from '../HistoryPage';
import { useHistory } from '../../hooks/useHistory';

jest.mock('../../hooks/useHistory');

const mockedUseHistory = useHistory as jest.MockedFunction<typeof useHistory>;

type HookResult = ReturnType<typeof useHistory>;

const hookResult = (overrides: Partial<HookResult> = {}): HookResult => ({
  videos: [],
  totalVideos: 0,
  loading: false,
  error: null,
  hasMore: false,
  loadingMore: false,
  loadMoreError: null,
  clearing: false,
  clearError: null,
  loadMore: jest.fn().mockResolvedValue(undefined),
  clearHistory: jest.fn().mockResolvedValue(true),
  refresh: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const historyVideo = (id: number, title: string, lastViewedAt: string) => ({
  id,
  title,
  author: 'alice',
  duration: 60,
  views: 10,
  thumbnail: `${id}.webp`,
  lastViewedAt,
});

describe('HistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    );

  it('shows a loading spinner while fetching history', () => {
    mockedUseHistory.mockReturnValue(hookResult({ loading: true }));
    renderPage();
    expect(screen.getByRole('status', { name: 'Loading history' })).toBeInTheDocument();
  });

  it('shows the error state with a retry button', () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockedUseHistory.mockReturnValue(hookResult({ error: 'Network error', refresh }));
    renderPage();

    expect(screen.getByRole('heading', { name: 'Error Loading History' })).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state when no videos have been watched and hides Clear history', () => {
    mockedUseHistory.mockReturnValue(hookResult());
    renderPage();

    expect(screen.getByText('You have not watched any videos yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse videos' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button', { name: 'Clear history' })).not.toBeInTheDocument();
  });

  it('renders watched videos in order with VideoCard and relative watched time', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    mockedUseHistory.mockReturnValue(
      hookResult({
        videos: [historyVideo(10, 'Latest Watch', twoHoursAgo), historyVideo(9, 'Earlier Watch', threeDaysAgo)],
        totalVideos: 2,
      })
    );
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: /Watch History/ })).toHaveTextContent('Watch History (2)');
    const titles = screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'));
    expect(titles).toEqual(['Latest Watch', 'Earlier Watch']);
    expect(screen.getByText('Watched 2 hours ago')).toBeInTheDocument();
    expect(screen.getByText('Watched 3 days ago')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear history' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('loads more history items on click, disables while loading, and shows load errors', () => {
    const loadMore = jest.fn().mockResolvedValue(undefined);
    const nowIso = new Date().toISOString();
    mockedUseHistory.mockReturnValue(
      hookResult({
        videos: [historyVideo(1, 'First', nowIso)],
        totalVideos: 15,
        hasMore: true,
        loadMore,
      })
    );
    const { rerender } = renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(loadMore).toHaveBeenCalledTimes(1);

    mockedUseHistory.mockReturnValue(
      hookResult({
        videos: [historyVideo(1, 'First', nowIso)],
        totalVideos: 15,
        hasMore: true,
        loadingMore: true,
        loadMoreError: 'Timeout',
      })
    );
    rerender(
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load more history: Timeout');
  });

  it('asks for confirmation before clearing history and closes the modal on confirm', async () => {
    const clearHistory = jest.fn().mockResolvedValue(true);
    const nowIso = new Date().toISOString();
    mockedUseHistory.mockReturnValue(
      hookResult({
        videos: [historyVideo(1, 'First', nowIso)],
        totalVideos: 1,
        clearHistory,
      })
    );
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Cancelling keeps the history and closes the modal
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(clearHistory).not.toHaveBeenCalled();

    // Confirming calls clearHistory and closes the modal
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm clear history' }));
    });
    expect(clearHistory).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the confirmation modal open and shows error if clearing fails', async () => {
    const clearHistory = jest.fn().mockResolvedValue(false);
    const nowIso = new Date().toISOString();
    mockedUseHistory.mockReturnValue(
      hookResult({
        videos: [historyVideo(1, 'First', nowIso)],
        totalVideos: 1,
        clearError: 'Failed to clear',
        clearHistory,
      })
    );
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm clear history' }));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Failed to clear');
  });
});
