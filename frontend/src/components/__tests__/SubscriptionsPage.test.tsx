import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SubscriptionsPage from '../SubscriptionsPage';
import { useSubscriptions } from '../../hooks/useSubscriptions';

jest.mock('../../hooks/useSubscriptions');

const mockedUseSubscriptions = useSubscriptions as jest.MockedFunction<typeof useSubscriptions>;

type HookResult = ReturnType<typeof useSubscriptions>;

const hookResult = (overrides: Partial<HookResult>): HookResult => ({
  channels: [],
  videos: [],
  totalVideos: 0,
  loading: false,
  error: null,
  hasMore: false,
  loadingMore: false,
  loadMoreError: null,
  loadMore: jest.fn(),
  refresh: jest.fn(),
  ...overrides,
});

const channel = (id: number, username: string, subscriberCount: number, extra = {}) => ({
  id,
  username,
  displayName: null,
  avatarUrl: null,
  subscriberCount,
  subscribedAt: '2026-11-20T10:00:00Z',
  ...extra,
});

const video = (id: number, title: string, author = 'alice') => ({
  id,
  title,
  author,
  duration: 60,
  views: 1,
  thumbnail: `t${id}.webp`,
});

describe('SubscriptionsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <SubscriptionsPage />
      </MemoryRouter>
    );

  it('shows a spinner while loading', () => {
    mockedUseSubscriptions.mockReturnValue(hookResult({ loading: true }));
    renderPage();
    expect(screen.getByRole('status', { name: 'Loading subscriptions' })).toBeInTheDocument();
  });

  it('shows the error with a retry button', () => {
    const refresh = jest.fn();
    mockedUseSubscriptions.mockReturnValue(hookResult({ error: 'Server down', refresh }));
    renderPage();

    expect(screen.getByRole('heading', { name: 'Error Loading Subscriptions' })).toBeInTheDocument();
    expect(screen.getByText('Server down')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state without subscriptions', () => {
    mockedUseSubscriptions.mockReturnValue(hookResult({}));
    renderPage();

    expect(screen.getByText('You are not subscribed to any channel yet.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse videos' })).toHaveAttribute('href', '/');
  });

  it('lists the channels with links and counts, and the feed videos', () => {
    mockedUseSubscriptions.mockReturnValue(
      hookResult({
        channels: [
          channel(1, 'alice', 1, { displayName: 'Alice W', avatarUrl: '/media/avatars/a.png' }),
          channel(2, 'b.ob', 3),
        ],
        videos: [video(10, 'Newest', 'b.ob'), video(9, 'Older')],
        totalVideos: 2,
      })
    );
    renderPage();

    expect(screen.getByRole('heading', { level: 2, name: 'Channels (2)' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Alice W/ })).toHaveAttribute('href', '/users/alice');
    expect(screen.getByRole('link', { name: 'b.ob 3 subscribers' })).toHaveAttribute('href', '/users/b.ob');
    expect(screen.getByText('1 subscriber')).toBeInTheDocument();
    expect(screen.getByText('3 subscribers')).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 2, name: 'Latest videos (2)' })).toBeInTheDocument();
    const titles = screen.getAllByRole('article').map((card) => card.getAttribute('aria-label'));
    expect(titles).toEqual(['Newest', 'Older']);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('shows an empty feed message when the channels have no videos', () => {
    mockedUseSubscriptions.mockReturnValue(hookResult({ channels: [channel(1, 'alice', 1)] }));
    renderPage();
    expect(screen.getByText('Your channels have not uploaded any videos yet.')).toBeInTheDocument();
  });

  it('loads more feed videos on click', () => {
    const loadMore = jest.fn();
    mockedUseSubscriptions.mockReturnValue(
      hookResult({
        channels: [channel(1, 'alice', 1)],
        videos: [video(1, 'First')],
        totalVideos: 20,
        hasMore: true,
        loadMore,
      })
    );
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('disables Load more while loading and shows load errors', () => {
    mockedUseSubscriptions.mockReturnValue(
      hookResult({
        channels: [channel(1, 'alice', 1)],
        videos: [video(1, 'First')],
        totalVideos: 20,
        hasMore: true,
        loadingMore: true,
        loadMoreError: 'Timeout',
      })
    );
    renderPage();

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load more videos: Timeout');
  });
});
