import { act, renderHook, waitFor } from '@testing-library/react';
import axios from 'axios';
import { usePublicProfile } from '../usePublicProfile';
import { userService } from '../../services/userService';

jest.mock('../../services/userService');

const mockedUserService = userService as jest.Mocked<typeof userService>;

describe('usePublicProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
