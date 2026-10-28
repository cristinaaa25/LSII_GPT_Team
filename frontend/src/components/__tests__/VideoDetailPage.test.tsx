import { act, fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VideoDetailPage from '../VideoDetailPage';
import { AuthContext, AuthContextType } from '../../context/AuthContext';
import type { VideoDetail } from '../../types/video';

jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      isAxiosError:
        actualAxios.isAxiosError || ((err: unknown) => Boolean((err as { isAxiosError?: boolean })?.isAxiosError)),
    },
    isAxiosError:
      actualAxios.isAxiosError || ((err: unknown) => Boolean((err as { isAxiosError?: boolean })?.isAxiosError)),
  };
});

const mockedGet = axios.get as jest.Mock;
const mockedPost = axios.post as jest.Mock;
const mockedPut = axios.put as jest.Mock;

const sampleVideo: VideoDetail = {
  id: 42,
  title: 'Amazing Nature',
  description: 'A beautiful documentary about wildlife.\nEnjoy the views.',
  tags: ['nature', 'wildlife'],
  categories: ['Documentary'],
  author: 'David Attenborough',
  uploadDate: '2024-05-15T12:00:00Z',
  views: 1200,
  likes: 350,
  commentCount: 8,
  videoUrl: '42.mp4',
  thumbnailUrl: '42.webp',
};

const renderWithRoute = (initialPath = '/videos/42') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/videos/:id" element={<VideoDetailPage />} />
        <Route path="/" element={<div>Catalog Home</div>} />
      </Routes>
    </MemoryRouter>
  );
};

const mockVideoResponse = (video: VideoDetail = sampleVideo) => {
  mockedGet.mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/comments')) {
      return Promise.resolve({
        data: {
          content: [],
          page: 0,
          size: 10,
          totalElements: video.commentCount || 0,
          totalPages: 1,
          last: true,
        },
      });
    }
    return Promise.resolve({ data: video });
  });
};

describe('VideoDetailPage', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedPut.mockReset();
    mockVideoResponse();
  });

  it('shows a loading spinner while fetching video details', () => {
    mockedGet.mockReturnValue(new Promise(() => {}));

    renderWithRoute();

    expect(screen.getByRole('status', { name: 'Loading video' })).toBeInTheDocument();
  });

  it('renders video player and information panel on success', async () => {
    mockedGet.mockResolvedValueOnce({ data: sampleVideo });

    renderWithRoute();

    expect(await screen.findByRole('heading', { level: 1, name: 'Amazing Nature' })).toBeInTheDocument();

    const videoEl = screen.getByLabelText('Amazing Nature') as HTMLVideoElement;
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute('controls');
    expect(videoEl).toHaveAttribute('src', 'development/42.mp4');
    expect(videoEl).toHaveAttribute('poster', 'development/42.webp');

    expect(screen.getByText('David Attenborough')).toBeInTheDocument();
    expect(screen.getByText('1.2K views')).toBeInTheDocument();
    expect(screen.getByText(/Uploaded on/)).toBeInTheDocument();
    expect(screen.getByText('350 likes')).toBeInTheDocument();

    expect(screen.getByText('Documentary')).toBeInTheDocument();
    expect(screen.getByText('#nature')).toBeInTheDocument();
    expect(screen.getByText('#wildlife')).toBeInTheDocument();

    expect(screen.getByRole('region', { name: 'Description' })).toHaveTextContent(
      'A beautiful documentary about wildlife.'
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Comments (8)' })).toBeInTheDocument();
    expect(screen.getByText(/log in to comment/i)).toBeInTheDocument();
  });

  it('registers a view and updates the view count when video is played', async () => {
    mockedGet.mockResolvedValueOnce({ data: sampleVideo });
    mockedPost.mockResolvedValueOnce({});

    renderWithRoute();

    const videoEl = await screen.findByLabelText('Amazing Nature');
    expect(screen.getByText('1.2K views')).toBeInTheDocument();

    await act(async () => {
      fireEvent.play(videoEl);
    });

    expect(mockedPost).toHaveBeenCalledWith('other/videos/42/views');
    expect(screen.getByText('1.2K views')).toBeInTheDocument();
  });

  it('registers only one view per page load when playback is paused and resumed', async () => {
    mockedGet.mockResolvedValueOnce({ data: sampleVideo });
    mockedPost.mockResolvedValue({});

    renderWithRoute();

    const videoEl = await screen.findByLabelText('Amazing Nature');
    await act(async () => {
      fireEvent.play(videoEl);
      fireEvent.pause(videoEl);
      fireEvent.play(videoEl);
    });

    expect(mockedPost).toHaveBeenCalledTimes(1);
  });

  it('keeps absolute media URLs as-is and does not double-prefix them', async () => {
    mockVideoResponse({
      ...sampleVideo,
      videoUrl: 'https://cdn.example.com/media/42.mp4',
      thumbnailUrl: 'https://cdn.example.com/media/42.webp',
    });

    renderWithRoute();

    const videoEl = await screen.findByLabelText('Amazing Nature');
    expect(videoEl).toHaveAttribute('src', 'https://cdn.example.com/media/42.mp4');
    expect(videoEl).toHaveAttribute('poster', 'https://cdn.example.com/media/42.webp');
  });

  it('shows not-found state when API returns 404', async () => {
    mockedGet.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 404, data: { detail: 'Video not found' } },
    });

    renderWithRoute('/videos/999');

    expect(await screen.findByRole('heading', { name: 'Video Not Found' })).toBeInTheDocument();
    expect(
      screen.getByText('The video you are looking for does not exist or may have been removed.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to catalog' })).toHaveAttribute('href', '/');
    expect(screen.queryByLabelText('Amazing Nature')).not.toBeInTheDocument();
  });

  it('shows a generic error state on non-404 API errors', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Network Error'));

    renderWithRoute('/videos/error-id');

    expect(await screen.findByRole('heading', { name: 'Could not load video' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Video Not Found' })).not.toBeInTheDocument();
  });

  describe('metadata editing', () => {
    const renderAs = (username: string | null) => {
      const auth: AuthContextType = {
        user: username ? { id: 1, username, email: `${username}@example.com` } : null,
        token: username ? 'jwt' : null,
        isAuthenticated: username !== null,
        isLoading: false,
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
      };
      return render(
        <AuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={['/videos/42']}>
            <Routes>
              <Route path="/videos/:id" element={<VideoDetailPage />} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      );
    };

    it('shows the Edit button only to the owner', async () => {
      renderAs('David Attenborough');

      expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    });

    it('hides the Edit button from other users', async () => {
      renderAs('mallory');

      await screen.findByRole('heading', { level: 1, name: 'Amazing Nature' });
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    });

    it('hides the Edit button from anonymous users', async () => {
      renderAs(null);

      await screen.findByRole('heading', { level: 1, name: 'Amazing Nature' });
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    });

    it('shows the saved changes immediately without reloading', async () => {
      mockedPut.mockResolvedValueOnce({
        data: { ...sampleVideo, title: 'Edited Nature', description: 'New text', tags: ['birds'], categories: [] },
      });
      renderAs('David Attenborough');

      fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
      expect(screen.getByRole('form', { name: 'Edit video' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Edited Nature' } });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
      });

      expect(mockedPut).toHaveBeenCalledWith(
        'other/videos/42',
        expect.objectContaining({ title: 'Edited Nature' }),
        expect.anything()
      );
      expect(screen.queryByRole('form', { name: 'Edit video' })).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Edited Nature' })).toBeInTheDocument();
      expect(screen.getByText('#birds')).toBeInTheDocument();
      expect(screen.queryByText('#nature')).not.toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Description' })).toHaveTextContent('New text');
      expect(screen.getByText('Changes saved.')).toBeInTheDocument();
      expect(mockedGet.mock.calls.filter(([url]) => !String(url).includes('/comments'))).toHaveLength(1);

      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(screen.queryByText('Changes saved.')).not.toBeInTheDocument();
    });

    it('closes the form without saving on Cancel', async () => {
      renderAs('David Attenborough');

      fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('form', { name: 'Edit video' })).not.toBeInTheDocument();
      expect(mockedPut).not.toHaveBeenCalled();
    });
  });
});
