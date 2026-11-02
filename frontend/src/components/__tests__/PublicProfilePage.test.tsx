import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicProfilePage from '../PublicProfilePage';
import { usePublicProfile } from '../../hooks/usePublicProfile';

jest.mock('../../hooks/usePublicProfile');

const mockedUsePublicProfile = usePublicProfile as jest.MockedFunction<typeof usePublicProfile>;

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
    mockedUsePublicProfile.mockReturnValue({
      profile: null,
      loading: true,
      error: null,
      notFound: false,
      refresh: jest.fn(),
    });

    renderPublicProfile();

    expect(screen.getByRole('status', { name: 'Loading profile' })).toBeInTheDocument();
  });

  it('renders Not Found alert when user does not exist', () => {
    mockedUsePublicProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: null,
      notFound: true,
      refresh: jest.fn(),
    });

    renderPublicProfile('nonexistent');

    expect(screen.getByRole('heading', { level: 2, name: 'User Not Found' })).toBeInTheDocument();
    expect(screen.getByText(/The user @nonexistent does not exist/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });

  it('renders error alert when loading fails', () => {
    mockedUsePublicProfile.mockReturnValue({
      profile: null,
      loading: false,
      error: 'Network connection lost',
      notFound: false,
      refresh: jest.fn(),
    });

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

    mockedUsePublicProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
      notFound: false,
      refresh: jest.fn(),
    });

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

    mockedUsePublicProfile.mockReturnValue({
      profile: mockProfile,
      loading: false,
      error: null,
      notFound: false,
      refresh: jest.fn(),
    });

    renderPublicProfile('bob');

    expect(screen.getByRole('heading', { level: 1, name: 'bob' })).toBeInTheDocument();
    expect(screen.getByText('@bob')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('No description provided.')).toBeInTheDocument();
    expect(screen.getByText('No videos uploaded yet.')).toBeInTheDocument();
  });
});
