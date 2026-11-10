import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicProfilePage from '../PublicProfilePage';
import { usePublicProfile } from '../../hooks/usePublicProfile';

jest.mock('../../hooks/usePublicProfile');

const mockedUsePublicProfile = usePublicProfile as jest.MockedFunction<typeof usePublicProfile>;

type HookResult = ReturnType<typeof usePublicProfile>;

const hookResult = (overrides: Partial<HookResult>): HookResult => ({
  profile: null,
  loading: false,
  error: null,
  notFound: false,
  refresh: jest.fn(),
  videos: [],
  totalVideos: 0,
  hasMore: false,
  loadingMore: false,
  loadMoreError: null,
  loadMore: jest.fn(),
  ...overrides,
});

describe('PublicProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPublicProfile = (username = 'alice') => {
    return render(
      <MemoryRouter initialEntries={[`/users/${username}`]}>
        <Routes>
          <Route path="/users/:username" element={<PublicProfilePage />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading spinner while profile is being loaded', () => {
    mockedUsePublicProfile.mockReturnValue(
      hookResult({
        profile: null,
        loading: true,
        error: null,
        notFound: false,
        refresh: jest.fn(),
      })
    );

    renderPublicProfile();

    expect(screen.getByRole('status', { name: 'Loading profile' })).toBeInTheDocument();
  });

  it('renders Not Found alert when user does not exist', () => {
    mockedUsePublicProfile.mockReturnValue(
      hookResult({
        profile: null,
        loading: false,
        error: null,
        notFound: true,
        refresh: jest.fn(),
      })
    );

    renderPublicProfile('nonexistent');

    expect(screen.getByRole('heading', { level: 2, name: 'User Not Found' })).toBeInTheDocument();
    expect(screen.getByText(/The user @nonexistent does not exist/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });

  it('renders error alert when loading fails', () => {
    mockedUsePublicProfile.mockReturnValue(
      hookResult({
        profile: null,
        loading: false,
        error: 'Network connection lost',
        notFound: false,
        refresh: jest.fn(),
      })
    );

    renderPublicProfile();

    expect(screen.getByRole('heading', { level: 2, name: 'Error Loading Profile' })).toBeInTheDocument();
    expect(screen.getByText('Network connection lost')).toBeInTheDocument();
  });

  it('renders public profile details and videos with NO edit controls', () => {
    const mockProfile = {
      id: 10,
      username: 'alice',
      displayName: 'Alice In Chains',
      avatarUrl: '/media/avatars/alice.png',
      description: 'Filmmaker and creator.\nWelcome to my channel!',
      videos: [
        {
          id: 101,
          title: 'Nature Documentary',
          author: 'alice',
          duration: 300,
          views: 1250,
          thumbnail: 'thumb1.webp',
        },
        {
          id: 102,
          title: 'City Timelapse',
          author: 'alice',
          duration: 120,
          views: 450,
          thumbnail: 'thumb2.webp',
        },
      ],
    };

    mockedUsePublicProfile.mockReturnValue(
      hookResult({
        profile: mockProfile,
        loading: false,
        error: null,
        notFound: false,
        refresh: jest.fn(),
        videos: mockProfile.videos,
        totalVideos: 2,
      })
    );

    renderPublicProfile();

    // Verify profile info
    expect(screen.getByRole('heading', { level: 1, name: 'Alice In Chains' })).toBeInTheDocument();
    expect(screen.getByText('@alice')).toBeInTheDocument();
    expect(screen.getByText(/Filmmaker and creator/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'alice' })).toHaveAttribute('src', 'development/avatars/alice.png');

    // Verify videos
    expect(screen.getByRole('heading', { level: 2, name: 'Videos (2)' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nature Documentary' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'City Timelapse' })).toBeInTheDocument();

    // Verify strictly READ-ONLY (no edit controls)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /upload/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/choose avatar/i)).not.toBeInTheDocument();
  });

  it('renders initial letter when user has no avatar and empty state when no videos', () => {
    const mockProfile = {
      id: 11,
      username: 'bob',
      displayName: null,
      avatarUrl: null,
      description: null,
      videos: [],
    };

    mockedUsePublicProfile.mockReturnValue(
      hookResult({
        profile: mockProfile,
        loading: false,
        error: null,
        notFound: false,
        refresh: jest.fn(),
      })
    );

    renderPublicProfile('bob');

    expect(screen.getByRole('heading', { level: 1, name: 'bob' })).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('No description provided.')).toBeInTheDocument();
    expect(screen.getByText('No videos uploaded yet.')).toBeInTheDocument();
  });

  const video = (id: number, title: string) => ({
    id,
    title,
    author: 'alice',
    duration: 60,
    views: 1,
    thumbnail: `t${id}.webp`,
  });

  const aliceProfile = { id: 10, username: 'alice', displayName: null, avatarUrl: null, description: null, videos: [] };

  it('shows the total number of videos and a Load more button that loads the next page', () => {
    const loadMore = jest.fn();
    mockedUsePublicProfile.mockReturnValue(
      hookResult({
        profile: aliceProfile,
        videos: [video(1, 'First'), video(2, 'Second')],
        totalVideos: 30,
        hasMore: true,
        loadMore,
      })
    );

    renderPublicProfile();

    expect(screen.getByRole('heading', { level: 2, name: 'Videos (30)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it('disables the button while the next page is loading', () => {
    mockedUsePublicProfile.mockReturnValue(
      hookResult({
        profile: aliceProfile,
        videos: [video(1, 'First')],
        totalVideos: 13,
        hasMore: true,
        loadingMore: true,
      })
    );

    renderPublicProfile();

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
  });

  it('hides Load more on the last page and shows load errors', () => {
    mockedUsePublicProfile.mockReturnValue(
      hookResult({
        profile: aliceProfile,
        videos: [video(1, 'First')],
        totalVideos: 1,
        hasMore: false,
        loadMoreError: 'Network error',
      })
    );

    renderPublicProfile();

    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load more videos: Network error');
  });
});
