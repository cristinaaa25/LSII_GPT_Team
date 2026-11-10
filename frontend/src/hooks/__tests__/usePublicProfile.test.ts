import { act, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { PROFILE_VIDEOS_PAGE_SIZE, usePublicProfile } from '../usePublicProfile';
import { userService } from '../../services/userService';

jest.mock('../../services/userService');

const mockedUserService = userService as jest.Mocked<typeof userService>;

const video = (id: number) => ({ id, title: `Video ${id}`, author: 'alice', duration: 60, views: 1, thumbnail: '' });

const page = (ids: number[], pageNumber: number, totalElements: number, last: boolean) => ({
  content: ids.map(video),
  page: pageNumber,
  size: PROFILE_VIDEOS_PAGE_SIZE,
  totalElements,
  totalPages: Math.ceil(totalElements / PROFILE_VIDEOS_PAGE_SIZE),
  last,
});

const profile = { id: 1, username: 'alice', displayName: 'Alice', videos: [] };

describe('usePublicProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUserService.getPublicVideos.mockResolvedValue(page([], 0, 0, true));
  });

  it('loads public profile successfully', async () => {
    const profile = {
      id: 1,
      username: 'alice',
      displayName: 'Alice W',
      avatarUrl: '/media/avatars/a.png',
      description: 'bio',
      videos: [],
    };
    mockedUserService.getPublicProfile.mockResolvedValueOnce(profile);

    const { result } = renderHook(() => usePublicProfile('alice'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.profile).toEqual(profile);
    expect(result.current.notFound).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets notFound to true when username is empty', async () => {
    const { result } = renderHook(() => usePublicProfile(''));

    expect(result.current.loading).toBe(false);
    expect(result.current.notFound).toBe(true);
    expect(result.current.profile).toBeNull();
  });

  it('sets notFound to true when API returns 404', async () => {
    const axiosError = {
      isAxiosError: true,
      response: { status: 404 },
    };
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    mockedUserService.getPublicProfile.mockRejectedValueOnce(axiosError);

    const { result } = renderHook(() => usePublicProfile('unknown'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.notFound).toBe(true);
    expect(result.current.profile).toBeNull();
  });

  it('sets error when API fails with generic error', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);
    mockedUserService.getPublicProfile.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePublicProfile('alice'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
    expect(result.current.notFound).toBe(false);
  });

  it('allows manual refresh', async () => {
    const profile1 = { id: 1, username: 'alice', displayName: 'A1', videos: [] };
    const profile2 = { id: 1, username: 'alice', displayName: 'A2', videos: [] };
    mockedUserService.getPublicProfile.mockResolvedValueOnce(profile1).mockResolvedValueOnce(profile2);

    const { result } = renderHook(() => usePublicProfile('alice'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profile?.displayName).toBe('A1');

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.profile?.displayName).toBe('A2');
  });

  it('loads the first page of videos with the profile', async () => {
    mockedUserService.getPublicProfile.mockResolvedValueOnce(profile);
    mockedUserService.getPublicVideos.mockResolvedValueOnce(page([3, 2], 0, 14, false));

    const { result } = renderHook(() => usePublicProfile(' alice '));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockedUserService.getPublicVideos).toHaveBeenCalledWith('alice', 0, PROFILE_VIDEOS_PAGE_SIZE);
    expect(result.current.videos.map((v) => v.id)).toEqual([3, 2]);
    expect(result.current.totalVideos).toBe(14);
    expect(result.current.hasMore).toBe(true);
  });

  it('appends the next page on loadMore, skipping repeated videos, until the last page', async () => {
    mockedUserService.getPublicProfile.mockResolvedValueOnce(profile);
    mockedUserService.getPublicVideos
      .mockResolvedValueOnce(page([5, 4], 0, 5, false))
      .mockResolvedValueOnce(page([4, 3, 2], 1, 5, false))
      .mockResolvedValueOnce(page([1], 2, 5, true));

    const { result } = renderHook(() => usePublicProfile('alice'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });
    expect(mockedUserService.getPublicVideos).toHaveBeenLastCalledWith('alice', 1, PROFILE_VIDEOS_PAGE_SIZE);
    expect(result.current.videos.map((v) => v.id)).toEqual([5, 4, 3, 2]);
    expect(result.current.hasMore).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });
    expect(mockedUserService.getPublicVideos).toHaveBeenLastCalledWith('alice', 2, PROFILE_VIDEOS_PAGE_SIZE);
    expect(result.current.videos.map((v) => v.id)).toEqual([5, 4, 3, 2, 1]);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loadingMore).toBe(false);
  });

  it('ignores a second loadMore while one is in progress', async () => {
    mockedUserService.getPublicProfile.mockResolvedValueOnce(profile);
    mockedUserService.getPublicVideos.mockResolvedValueOnce(page([3], 0, 3, false));
    let resolveNext: (value: ReturnType<typeof page>) => void = () => undefined;
    mockedUserService.getPublicVideos.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveNext = resolve;
        })
    );

    const { result } = renderHook(() => usePublicProfile('alice'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let first: Promise<void> = Promise.resolve();
    await act(async () => {
      first = result.current.loadMore();
      await result.current.loadMore();
    });
    expect(result.current.loadingMore).toBe(true);
    await act(async () => {
      resolveNext(page([2, 1], 1, 3, true));
      await first;
    });

    expect(mockedUserService.getPublicVideos).toHaveBeenCalledTimes(2);
    expect(result.current.videos.map((v) => v.id)).toEqual([3, 2, 1]);
  });

  it('keeps the loaded videos and reports an error when loadMore fails', async () => {
    mockedUserService.getPublicProfile.mockResolvedValueOnce(profile);
    mockedUserService.getPublicVideos
      .mockResolvedValueOnce(page([2], 0, 2, false))
      .mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePublicProfile('alice'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.loadMoreError).toBe('Network error');
    expect(result.current.videos.map((v) => v.id)).toEqual([2]);
    expect(result.current.hasMore).toBe(true);
  });

  it('does nothing on loadMore without a username', async () => {
    const { result } = renderHook(() => usePublicProfile(undefined));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockedUserService.getPublicVideos).not.toHaveBeenCalled();
  });
});
