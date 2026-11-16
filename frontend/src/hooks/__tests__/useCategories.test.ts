import { act, renderHook, waitFor } from '@testing-library/react';
import { useCategories } from '../useCategories';
import { videoService } from '../../services/videoService';

jest.mock('../../services/videoService', () => ({
  videoService: {
    getCategories: jest.fn(),
  },
}));

const mockedVideoService = videoService as jest.Mocked<typeof videoService>;

describe('useCategories', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads categories on mount', async () => {
    const mockCategories = [
      { name: 'Gaming', count: 10 },
      { name: 'Music', count: 5 },
    ];
    mockedVideoService.getCategories.mockResolvedValueOnce(mockCategories);

    const { result } = renderHook(() => useCategories());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.error).toBeNull();
    expect(mockedVideoService.getCategories).toHaveBeenCalledTimes(1);
  });

  it('handles errors when loading categories', async () => {
    mockedVideoService.getCategories.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCategories());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories).toEqual([]);
    expect(result.current.error).toBe('Network error');
  });

  it('allows refreshing categories', async () => {
    mockedVideoService.getCategories.mockResolvedValueOnce([{ name: 'Gaming', count: 10 }]).mockResolvedValueOnce([
      { name: 'Gaming', count: 10 },
      { name: 'Music', count: 6 },
    ]);

    const { result } = renderHook(() => useCategories());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.categories).toHaveLength(1);

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.categories).toHaveLength(2);
    expect(mockedVideoService.getCategories).toHaveBeenCalledTimes(2);
  });
});
