import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PlaylistDetailPage from '../PlaylistDetailPage';
import { usePlaylistDetail } from '../../hooks/usePlaylistDetail';

jest.mock('../../hooks/usePlaylistDetail');

const mockedUsePlaylistDetail = usePlaylistDetail as jest.MockedFunction<typeof usePlaylistDetail>;

describe('PlaylistDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/playlists/5']}>
        <Routes>
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
          <Route path="/playlists" element={<div>All Playlists</div>} />
        </Routes>
      </MemoryRouter>
    );

  it('renders loading, forbidden, and not-found states', () => {
    mockedUsePlaylistDetail.mockReturnValue({
      playlist: null,
      loading: true,
      error: null,
      notFound: false,
      forbidden: false,
      removeVideo: jest.fn(),
      renamePlaylist: jest.fn(),
      refresh: jest.fn(),
    });
    const { rerender } = renderPage();
    expect(screen.getByRole('status', { name: 'Loading playlist' })).toBeInTheDocument();

    mockedUsePlaylistDetail.mockReturnValue({
      playlist: null,
      loading: false,
      error: null,
      notFound: false,
      forbidden: true,
      removeVideo: jest.fn(),
      renamePlaylist: jest.fn(),
      refresh: jest.fn(),
    });
    rerender(
      <MemoryRouter initialEntries={['/playlists/5']}>
        <Routes>
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Access Denied');

    mockedUsePlaylistDetail.mockReturnValue({
      playlist: null,
      loading: false,
      error: null,
      notFound: true,
      forbidden: false,
      removeVideo: jest.fn(),
      renamePlaylist: jest.fn(),
      refresh: jest.fn(),
    });
    rerender(
      <MemoryRouter initialEntries={['/playlists/5']}>
        <Routes>
          <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Playlist Not Found');
  });

  it('renders videos, empty state, and allows removing a video and renaming custom playlists', async () => {
    const removeVideo = jest.fn().mockResolvedValue(undefined);
    const renamePlaylist = jest.fn().mockResolvedValue(undefined);

    mockedUsePlaylistDetail.mockReturnValue({
      playlist: {
        id: 5,
        name: 'Study',
        watchLater: false,
        createdAt: '2026-11-24T10:00:00Z',
        videos: [
          {
            id: 10,
            title: 'Lecture 1',
            author: 'prof',
            duration: 120,
            views: 40,
            thumbnail: '10.webp',
            addedAt: '2026-11-25T09:00:00Z',
          },
        ],
      },
      loading: false,
      error: null,
      notFound: false,
      forbidden: false,
      removeVideo,
      renamePlaylist,
      refresh: jest.fn(),
    });

    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Study' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Lecture 1' })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove Lecture 1 from playlist' }));
    });
    expect(removeVideo).toHaveBeenCalledWith(10);

    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    fireEvent.change(screen.getByLabelText('Playlist name'), { target: { value: 'Algorithms' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    await waitFor(() => expect(renamePlaylist).toHaveBeenCalledWith('Algorithms'));
  });
});
