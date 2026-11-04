import axios from 'axios';
import { analyticsService } from '../analyticsService';
import { authService } from '../authService';
import { UserAnalytics } from '../../types/analytics';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockedAxios = axios as unknown as { get: jest.Mock };

describe('analyticsService', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedAxios.get.mockReset();
  });

  it('fetches my analytics with stored token', async () => {
    authService.setToken('alice-token');
    const mockAnalytics: UserAnalytics = {
      totals: { videos: 1, views: 10, likes: 2, comments: 1 },
      videos: [
        {
          id: 1,
          title: 'V1',
          thumbnailUrl: 'thumb.webp',
          uploadDate: '2026-11-01T00:00:00Z',
          duration: 30,
          views: 10,
          likes: 2,
          comments: 1,
        },
      ],
      viewsPerDay: [{ date: '2026-11-04', views: 5, authenticatedViews: 3, anonymousViews: 2 }],
    };
    mockedAxios.get.mockResolvedValueOnce({ data: mockAnalytics });

    const result = await analyticsService.getMyAnalytics();

    expect(result).toEqual(mockAnalytics);
    expect(mockedAxios.get).toHaveBeenCalledWith('other/users/me/analytics', {
      headers: { Authorization: 'Bearer alice-token' },
    });
  });

  it('fetches my analytics with explicitly passed token', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { totals: { videos: 0, views: 0, likes: 0, comments: 0 }, videos: [], viewsPerDay: [] },
    });

    await analyticsService.getMyAnalytics('custom-token');

    expect(mockedAxios.get).toHaveBeenCalledWith('other/users/me/analytics', {
      headers: { Authorization: 'Bearer custom-token' },
    });
  });

  it('fetches without auth header when token is null', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: { totals: { videos: 0, views: 0, likes: 0, comments: 0 }, videos: [], viewsPerDay: [] },
    });

    await analyticsService.getMyAnalytics(null);

    expect(mockedAxios.get).toHaveBeenCalledWith('other/users/me/analytics', {
      headers: {},
    });
  });
});
