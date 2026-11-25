import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SaveToPlaylistDropdown from '../SaveToPlaylistDropdown';
import { AuthContext, AuthContextType } from '../../context/AuthContext';
import { authService } from '../../services/authService';

jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      isAxiosError: actualAxios.isAxiosError,
    },
    isAxiosError: actualAxios.isAxiosError,
  };
});

const mockedGet = axios.get as jest.Mock;
const mockedPost = axios.post as jest.Mock;
const mockedPut = axios.put as jest.Mock;
const mockedDelete = axios.delete as jest.Mock;

describe('SaveToPlaylistDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authService.removeToken();
  });

  const renderComponent = (authenticated: boolean) => {
    if (authenticated) {
      authService.setToken('jwt');
    }
    const auth: AuthContextType = {
      user: authenticated ? { id: 1, username: 'alice', email: 'alice@example.com' } : null,
      token: authenticated ? 'jwt' : null,
      isAuthenticated: authenticated,
      isLoading: false,
      login: jest.fn(),
      register: jest.fn(),
      loginWithToken: jest.fn(),
      logout: jest.fn(),
    };

    return render(
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={['/videos/42']}>
          <Routes>
            <Route path="/videos/42" element={<SaveToPlaylistDropdown videoId={42} />} />
            <Route path="/login" element={<div>Login Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('links anonymous visitors to /login', () => {
    renderComponent(false);
    const saveLink = screen.getByRole('link', { name: 'Save' });
    expect(saveLink).toHaveAttribute('href', '/login');
  });

  it('opens dropdown with Watch later first, toggles checkboxes, and creates a new list', async () => {
    mockedGet.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          name: 'Watch later',
          watchLater: true,
          videoCount: 0,
          containsVideo: false,
          createdAt: '2026-11-24T10:00:00Z',
        },
        {
          id: 2,
          name: 'Favorites',
          watchLater: false,
          videoCount: 1,
          containsVideo: true,
          createdAt: '2026-11-24T10:01:00Z',
        },
      ],
    });
    mockedPut.mockResolvedValueOnce({
      data: {
        id: 1,
        name: 'Watch later',
        watchLater: true,
        videoCount: 1,
        containsVideo: true,
        createdAt: '2026-11-24T10:00:00Z',
      },
    });
    mockedDelete.mockResolvedValueOnce({
      data: {
        id: 2,
        name: 'Favorites',
        watchLater: false,
        videoCount: 0,
        containsVideo: false,
        createdAt: '2026-11-24T10:01:00Z',
      },
    });
    mockedPost.mockResolvedValueOnce({
      data: {
        id: 3,
        name: 'Weekend',
        watchLater: false,
        videoCount: 0,
        containsVideo: false,
        createdAt: '2026-11-25T10:00:00Z',
      },
    });
    mockedPut.mockResolvedValueOnce({
      data: {
        id: 3,
        name: 'Weekend',
        watchLater: false,
        videoCount: 1,
        containsVideo: true,
        createdAt: '2026-11-25T10:00:00Z',
      },
    });

    renderComponent(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const checkboxes = await screen.findAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    expect(screen.getByLabelText(/Watch later/i)).not.toBeChecked();
    expect(screen.getByLabelText(/Favorites/i)).toBeChecked();

    await act(async () => {
      fireEvent.click(screen.getByLabelText(/Watch later/i));
    });
    expect(mockedPut).toHaveBeenCalledWith('other/playlists/1/videos/42', null, {
      headers: { Authorization: 'Bearer jwt' },
    });
    await waitFor(() => expect(screen.getByLabelText(/Watch later/i)).toBeChecked());

    await act(async () => {
      fireEvent.click(screen.getByLabelText(/Favorites/i));
    });
    expect(mockedDelete).toHaveBeenCalledWith('other/playlists/2/videos/42', {
      headers: { Authorization: 'Bearer jwt' },
    });
    await waitFor(() => expect(screen.getByLabelText(/Favorites/i)).not.toBeChecked());

    // Create a new list from inside the dropdown -> automatically adds the video
    fireEvent.click(screen.getByRole('button', { name: '+ New list' }));
    fireEvent.change(screen.getByLabelText('New playlist name'), { target: { value: 'Weekend' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create' }));
    });

    expect(mockedPost).toHaveBeenCalledWith(
      'other/users/me/playlists',
      { name: 'Weekend' },
      { headers: { Authorization: 'Bearer jwt' } }
    );
    expect(mockedPut).toHaveBeenCalledWith('other/playlists/3/videos/42', null, {
      headers: { Authorization: 'Bearer jwt' },
    });
    expect(await screen.findByLabelText(/Weekend/i)).toBeChecked();
  });

  it('shows error state when loading playlists fails and retries', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Failed to fetch'));
    mockedGet.mockResolvedValueOnce({ data: [] });

    renderComponent(true);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to fetch');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    });
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
