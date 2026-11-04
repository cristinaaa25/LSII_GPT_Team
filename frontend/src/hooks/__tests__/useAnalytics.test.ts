import { act, renderHook, waitFor } from '@testing-library/react';
import { useAnalytics } from '../useAnalytics';
import { analyticsService } from '../../services/analyticsService';
import { useAuth } from '../useAuth';

jest.mock('../../services/analyticsService');
jest.mock('../useAuth');

const mockedAnalyticsService = analyticsService as jest.Mocked<typeof analyticsService>;
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('useAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads analytics successfully when authenticated', async () => {
    mockedUseAuth.mockReturnValue({
      token: 'valid-token',
      isAuthenticated: true,
      user: { id: 1, username: 'alice', email: 'alice@example.com' },
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
      loading: false,
    });

    const mockData = {
      totals: { videos: 2, views: 200, likes: 20, comments: 5 },
      videos: [
        {
          id: 1,
          title: 'Vid 1',
          thumbnailUrl: 't1.webp',
          uploadDate: '2026-11-01T00:00:00Z',
          duration: 40,
          views: 120,
          likes: 15,
          comments: 3,
        },
      ],
      viewsPerDay: [{ date: '2026-11-04', views: 10, authenticatedViews: 6, anonymousViews: 4 }],
    };
    mockedAnalyticsService.getMyAnalytics.mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.analytics).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(mockedAnalyticsService.getMyAnalytics).toHaveBeenCalledWith('valid-token');
  });

  it('does not fetch when not authenticated', async () => {
    mockedUseAuth.mockReturnValue({
      token: null,
      isAuthenticated: false,
      user: null,
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
      loading: false,
    });

    const { result } = renderHook(() => useAnalytics());

    expect(result.current.loading).toBe(false);
    expect(result.current.analytics).toBeNull();
    expect(mockedAnalyticsService.getMyAnalytics).not.toHaveBeenCalled();
  });

  it('sets error when service throws', async () => {
    mockedUseAuth.mockReturnValue({
      token: 'valid-token',
      isAuthenticated: true,
      user: { id: 1, username: 'alice', email: 'alice@example.com' },
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
      loading: false,
    });

    mockedAnalyticsService.getMyAnalytics.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network failure');
    expect(result.current.analytics).toBeNull();
  });

  it('allows manual refresh', async () => {
    mockedUseAuth.mockReturnValue({
      token: 'valid-token',
      isAuthenticated: true,
      user: { id: 1, username: 'alice', email: 'alice@example.com' },
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
      loading: false,
    });

    const data1 = {
      totals: { videos: 0, views: 0, likes: 0, comments: 0 },
      videos: [],
      viewsPerDay: [],
    };
    const data2 = {
      totals: { videos: 1, views: 10, likes: 1, comments: 0 },
      videos: [],
      viewsPerDay: [],
    };

    mockedAnalyticsService.getMyAnalytics.mockResolvedValueOnce(data1).mockResolvedValueOnce(data2);

    const { result } = renderHook(() => useAnalytics());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.analytics).toEqual(data1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.analytics).toEqual(data2);
    expect(mockedAnalyticsService.getMyAnalytics).toHaveBeenCalledTimes(2);
  });
});
