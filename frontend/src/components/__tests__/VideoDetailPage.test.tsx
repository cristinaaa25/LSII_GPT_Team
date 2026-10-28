import { act, fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VideoDetailPage from '../VideoDetailPage';
import type { VideoDetail } from '../../types/video';

jest.mock('axios', () => {
  const actualAxios = jest.requireActual('axios');
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      isAxiosError:
        actualAxios.isAxiosError || ((err: unknown) => Boolean((err as { isAxiosError?: boolean })?.isAxiosError)),
    },
    isAxiosError:
      actualAxios.isAxiosError || ((err: unknown) => Boolean((err as { isAxiosError?: boolean })?.isAxiosError)),
  };
});

const mockedGet = axios.get as jest.Mock;
const mockedPost = axios.post as jest.Mock;

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
});
