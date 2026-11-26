import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PlaylistsPage from '../PlaylistsPage';
import { usePlaylists } from '../../hooks/usePlaylists';

jest.mock('../../hooks/usePlaylists');

const mockedUsePlaylists = usePlaylists as jest.MockedFunction<typeof usePlaylists>;

describe('PlaylistsPage', () => {
  const basePlaylists = [
    {
      id: 1,
      name: 'Watch later',
      watchLater: true,
      videoCount: 2,
      containsVideo: false,
      createdAt: '2026-11-24T10:00:00Z',
    },
    {
      id: 2,
      name: 'Music',
      watchLater: false,
      videoCount: 1,
      containsVideo: false,
      createdAt: '2026-11-24T10:05:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading and error states', () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockedUsePlaylists.mockReturnValue({
      playlists: [],
      loading: true,
      error: null,
      createPlaylist: jest.fn(),
      renamePlaylist: jest.fn(),
      deletePlaylist: jest.fn(),
      refresh,
    });

    const { rerender } = render(
      <MemoryRouter>
        <PlaylistsPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('status', { name: 'Loading playlists' })).toBeInTheDocument();

    mockedUsePlaylists.mockReturnValue({
      playlists: [],
      loading: false,
      error: 'Server unavailable',
      createPlaylist: jest.fn(),
      renamePlaylist: jest.fn(),
      deletePlaylist: jest.fn(),
      refresh,
    });
    rerender(
      <MemoryRouter>
        <PlaylistsPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Server unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows an illustrated empty state and a joined create form when there are no playlists', () => {
    mockedUsePlaylists.mockReturnValue({
      playlists: [],
      loading: false,
      error: null,
      createPlaylist: jest.fn(),
      renamePlaylist: jest.fn(),
      deletePlaylist: jest.fn(),
      refresh: jest.fn(),
    });

    render(
      <MemoryRouter>
        <PlaylistsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('You have no playlists yet.')).toBeInTheDocument();
    const form = screen.getByRole('form', { name: 'Create playlist' });
    expect(form).toHaveClass('pt-input-pill');
    expect(screen.getByRole('button', { name: 'New list' }).querySelector('svg[data-icon="plus"]')).toBeInTheDocument();
  });

  it('renders Watch later without rename/delete, and supports creating, renaming, and deleting custom lists', async () => {
    const createPlaylist = jest.fn().mockResolvedValue(basePlaylists[1]);
    const renamePlaylist = jest.fn().mockResolvedValue({ ...basePlaylists[1], name: 'Jazz' });
    const deletePlaylist = jest.fn().mockResolvedValue(undefined);

    mockedUsePlaylists.mockReturnValue({
      playlists: basePlaylists,
      loading: false,
      error: null,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      refresh: jest.fn(),
    });

    render(
      <MemoryRouter>
        <PlaylistsPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Watch later' })).toHaveAttribute('href', '/playlists/1');
    expect(screen.getByRole('link', { name: 'Music' })).toHaveAttribute('href', '/playlists/2');
    // Only the custom list has Rename / Delete buttons (1 each)
    expect(screen.getAllByRole('button', { name: 'Rename' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);

    // Empty name validation
    fireEvent.click(screen.getByRole('button', { name: 'New list' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Playlist name is required');
    expect(createPlaylist).not.toHaveBeenCalled();

    // Create playlist
    fireEvent.change(screen.getByLabelText('New playlist name'), { target: { value: 'Study' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'New list' }));
    });
    expect(createPlaylist).toHaveBeenCalledWith('Study');

    // Rename custom playlist
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    fireEvent.change(screen.getByLabelText('Rename playlist'), { target: { value: 'Jazz' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(renamePlaylist).toHaveBeenCalledWith(2, 'Jazz');

    // Delete custom playlist with modal confirmation
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    });
    await waitFor(() => expect(deletePlaylist).toHaveBeenCalledWith(2));
  });
});
