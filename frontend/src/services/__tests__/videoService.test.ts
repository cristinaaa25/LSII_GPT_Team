import axios from 'axios';
import { videoService, UploadVideoPayload } from '../videoService';
import { authService } from '../authService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('videoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('uploadVideo', () => {
    it('uploads video with all fields and token', async () => {
      authService.setToken('fake-jwt-token');
      const mockFile = new File(['dummy-video'], 'clip.mp4', { type: 'video/mp4' });
      const mockThumb = new File(['dummy-thumb'], 'thumb.jpg', { type: 'image/jpeg' });
      const payload: UploadVideoPayload = {
        file: mockFile,
        title: 'My Video',
        description: 'My Description',
        tags: 'tag1, tag2',
        category: 'Gaming',
        thumbnail: mockThumb,
      };

      const mockResponse = {
        data: {
          id: 10,
          title: 'My Video',
          description: 'My Description',
          tags: ['tag1', 'tag2'],
          categories: ['Gaming'],
          author: 'alice',
          uploadDate: '2026-10-25T10:00:00Z',
          views: 0,
          likes: 0,
          commentCount: 0,
          videoUrl: '10.mp4',
          thumbnailUrl: '10.jpg',
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const progressCallback = jest.fn();
      const result = await videoService.uploadVideo(payload, progressCallback);

      expect(result).toEqual(mockResponse.data);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const call = mockedAxios.post.mock.calls[0];
      expect(call[0]).toBe('other/videos');
      expect(call[1]).toBeInstanceOf(FormData);
      expect(call[2]?.headers).toEqual({ Authorization: 'Bearer fake-jwt-token' });
      expect(call[2]?.onUploadProgress).toBe(progressCallback);
    });

    it('uploads video without optional fields or token', async () => {
      const mockFile = new File(['dummy-video'], 'clip.mp4', { type: 'video/mp4' });
      const payload: UploadVideoPayload = {
        file: mockFile,
        title: 'Minimal Video',
        description: 'Minimal Desc',
      };

      const mockResponse = { data: { id: 11, title: 'Minimal Video' } };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await videoService.uploadVideo(payload);

      expect(result).toEqual(mockResponse.data);
      const call = mockedAxios.post.mock.calls[0];
      expect(call[2]?.headers).toEqual({});
    });
  });

  describe('updateVideo', () => {
    const payload = { title: 'New', description: 'Desc', tags: ['a'], categories: ['Music'] };

    it('sends a PUT with the JSON payload and the bearer token', async () => {
      authService.setToken('fake-jwt-token');
      mockedAxios.put.mockResolvedValueOnce({ data: { id: 5, ...payload } });

      const result = await videoService.updateVideo(5, payload);

      expect(result).toEqual({ id: 5, ...payload });
      expect(mockedAxios.put).toHaveBeenCalledWith('other/videos/5', payload, {
        headers: { Authorization: 'Bearer fake-jwt-token' },
      });
    });

    it('sends no Authorization header without a token and propagates errors', async () => {
      mockedAxios.put.mockRejectedValueOnce({ response: { status: 401 } });

      await expect(videoService.updateVideo(5, payload)).rejects.toEqual({ response: { status: 401 } });
      expect(mockedAxios.put.mock.calls[0][2]).toEqual({ headers: {} });
    });
  });
});
