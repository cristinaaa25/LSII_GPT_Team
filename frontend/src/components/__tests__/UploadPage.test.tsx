import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import UploadPage from '../UploadPage';
import { videoService } from '../../services/videoService';

jest.mock('../../services/videoService', () => ({
  videoService: {
    uploadVideo: jest.fn(),
  },
}));

const mockedVideoService = videoService as jest.Mocked<typeof videoService>;

describe('UploadPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderUploadPage = () => {
    return render(
      <MemoryRouter initialEntries={['/upload']}>
        <Routes>
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/videos/:id" element={<div data-testid="video-detail">Video Detail Page</div>} />
          <Route path="/" element={<div data-testid="home">Home Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders all form fields, labels and buttons', () => {
    renderUploadPage();

    expect(screen.getByRole('heading', { name: 'Upload Video' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Video File/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tags/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Thumbnail/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Upload Video' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/');
  });

  it('displays validation errors when submitting an empty form', async () => {
    renderUploadPage();

    fireEvent.click(screen.getByRole('button', { name: 'Upload Video' }));

    expect(await screen.findByText('Video file is required')).toBeInTheDocument();
    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Description is required')).toBeInTheDocument();
    expect(mockedVideoService.uploadVideo).not.toHaveBeenCalled();
  });

  it('rejects unsupported video file types', async () => {
    renderUploadPage();

    const textFile = new File(['hello'], 'document.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText(/Video File/i), { target: { files: [textFile] } });

    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Valid Title' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Valid Description' } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload Video' }));

    expect(await screen.findByText('Only MP4 videos are supported')).toBeInTheDocument();
    expect(mockedVideoService.uploadVideo).not.toHaveBeenCalled();
  });

  it('rejects files exceeding the 100MB limit', async () => {
    renderUploadPage();

    const largeFile = new File(['dummy'], 'huge.mp4', { type: 'video/mp4' });
    Object.defineProperty(largeFile, 'size', { value: 100 * 1024 * 1024 + 1 });

    fireEvent.change(screen.getByLabelText(/Video File/i), { target: { files: [largeFile] } });
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Valid Title' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Valid Description' } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload Video' }));

    expect(await screen.findByText('File size exceeds the 100MB limit')).toBeInTheDocument();
    expect(mockedVideoService.uploadVideo).not.toHaveBeenCalled();
  });

  it('rejects title longer than 255 characters', async () => {
    renderUploadPage();

    const validFile = new File(['dummy'], 'video.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText(/Video File/i), { target: { files: [validFile] } });
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'A'.repeat(256) } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Valid Description' } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload Video' }));

    expect(await screen.findByText('Title must not exceed 255 characters')).toBeInTheDocument();
    expect(mockedVideoService.uploadVideo).not.toHaveBeenCalled();
  });

  it('rejects non-image thumbnail files', async () => {
    renderUploadPage();

    const validFile = new File(['dummy'], 'video.mp4', { type: 'video/mp4' });
    const textThumb = new File(['thumb'], 'thumb.txt', { type: 'text/plain' });

    fireEvent.change(screen.getByLabelText(/Video File/i), { target: { files: [validFile] } });
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Valid Title' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Valid Description' } });
    fireEvent.change(screen.getByLabelText(/Thumbnail/i), { target: { files: [textThumb] } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload Video' }));

    expect(await screen.findByText('Thumbnail must be an image file')).toBeInTheDocument();
    expect(mockedVideoService.uploadVideo).not.toHaveBeenCalled();
  });

  it('uploads video successfully, shows progress bar, and redirects to new video', async () => {
    let progressCallback: ((event: { loaded: number; total: number }) => void) | undefined;
    mockedVideoService.uploadVideo.mockImplementation((payload, onProgress) => {
      progressCallback = onProgress as ((event: { loaded: number; total: number }) => void) | undefined;
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            id: 42,
            title: payload.title,
            description: payload.description,
            tags: ['tag1'],
            categories: ['Gaming'],
            author: 'alice',
            uploadDate: '2026-10-25T10:00:00Z',
            views: 0,
            likes: 0,
            commentCount: 0,
            videoUrl: '42.mp4',
            thumbnailUrl: '42.webp',
          });
        }, 50);
      });
    });

    renderUploadPage();

    const validFile = new File(['dummy'], 'gameplay.mp4', { type: 'video/mp4' });
    const validThumb = new File(['image'], 'cover.jpg', { type: 'image/jpeg' });

    fireEvent.change(screen.getByLabelText(/Video File/i), { target: { files: [validFile] } });
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Epic Gameplay' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Best moments of the match' } });
    fireEvent.change(screen.getByLabelText(/Tags/i), { target: { value: 'gaming, gameplay' } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: 'Gaming' } });
    fireEvent.change(screen.getByLabelText(/Thumbnail/i), { target: { files: [validThumb] } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload Video' }));

    expect(screen.getByRole('button', { name: /Uploading/i })).toBeDisabled();

    // Trigger upload progress
    if (progressCallback) {
      act(() => {
        progressCallback!({ loaded: 50, total: 100 });
      });
    }

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();

    // Wait for redirect
    expect(await screen.findByTestId('video-detail')).toBeInTheDocument();
  });

  it('displays server error when upload fails', async () => {
    mockedVideoService.uploadVideo.mockRejectedValueOnce({
      response: {
        data: {
          detail: 'File size exceeds the 100MB limit',
        },
      },
    });

    renderUploadPage();

    const validFile = new File(['dummy'], 'video.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByLabelText(/Video File/i), { target: { files: [validFile] } });
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: 'Title' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Desc' } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload Video' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('File size exceeds the 100MB limit');
    expect(screen.getByRole('button', { name: 'Upload Video' })).not.toBeDisabled();
  });
});
