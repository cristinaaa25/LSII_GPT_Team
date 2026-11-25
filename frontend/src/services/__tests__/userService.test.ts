import axios from 'axios';
import { userService } from '../userService';
import { authService } from '../authService';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedAxios = axios as unknown as { get: jest.Mock; put: jest.Mock; post: jest.Mock; delete: jest.Mock };

describe('userService', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedAxios.get.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.post.mockReset();
    mockedAxios.delete.mockReset();
  });

  it('fetches public profile by username', async () => {
    const profile = {
      id: 1,
      username: 'alice',
      displayName: 'Alice W',
      avatarUrl: '/media/avatars/a.png',
      description: 'bio',
      videos: [],
      subscriberCount: 3,
      subscribedByMe: false,
    };
    mockedAxios.get.mockResolvedValueOnce({ data: profile });

    const result = await userService.getPublicProfile('alice');

    expect(result).toEqual(profile);
    // Logged out: no Authorization header
    expect(mockedAxios.get).toHaveBeenCalledWith('other/users/alice', { headers: {} });
  });

  it('sends the token with the public profile so subscribedByMe can be filled', async () => {
    authService.setToken('bob-token');
    mockedAxios.get.mockResolvedValueOnce({ data: {} });

    await userService.getPublicProfile('alice');

    expect(mockedAxios.get).toHaveBeenCalledWith('other/users/alice', {
      headers: { Authorization: 'Bearer bob-token' },
    });
  });

  it('subscribes and unsubscribes with the token', async () => {
    authService.setToken('bob-token');
    const subscribed = { username: 'al.ice', subscriberCount: 1, subscribedByMe: true };
    const unsubscribed = { username: 'al.ice', subscriberCount: 0, subscribedByMe: false };
    mockedAxios.put.mockResolvedValueOnce({ data: subscribed });
    mockedAxios.delete.mockResolvedValueOnce({ data: unsubscribed });

    await expect(userService.subscribe('al.ice')).resolves.toEqual(subscribed);
    await expect(userService.unsubscribe('al.ice')).resolves.toEqual(unsubscribed);

    expect(mockedAxios.put).toHaveBeenCalledWith('other/users/al.ice/subscription', null, {
      headers: { Authorization: 'Bearer bob-token' },
    });
    expect(mockedAxios.delete).toHaveBeenCalledWith('other/users/al.ice/subscription', {
      headers: { Authorization: 'Bearer bob-token' },
    });
  });

  it('fetches my subscriptions and a page of my feed', async () => {
    authService.setToken('bob-token');
    const channels = [{ id: 1, username: 'alice', subscriberCount: 2, subscribedAt: '2026-11-20T10:00:00Z' }];
    const page = { content: [], page: 2, size: 12, totalElements: 30, totalPages: 3, last: true };
    mockedAxios.get.mockResolvedValueOnce({ data: channels }).mockResolvedValueOnce({ data: page });

    await expect(userService.getMySubscriptions()).resolves.toEqual(channels);
    await expect(userService.getMyFeed(2, 12)).resolves.toEqual(page);

    expect(mockedAxios.get).toHaveBeenNthCalledWith(1, 'other/users/me/subscriptions', {
      headers: { Authorization: 'Bearer bob-token' },
    });
    expect(mockedAxios.get).toHaveBeenNthCalledWith(2, 'other/users/me/feed', {
      params: { page: 2, size: 12 },
      headers: { Authorization: 'Bearer bob-token' },
    });
  });

  it('fetches and clears watch history with the token', async () => {
    authService.setToken('bob-token');
    const page = {
      content: [
        {
          id: 9,
          title: 'Watched',
          author: 'alice',
          duration: 30,
          views: 4,
          thumbnail: '9.webp',
          lastViewedAt: '2026-11-24T10:00:00Z',
        },
      ],
      page: 0,
      size: 12,
      totalElements: 1,
      totalPages: 1,
      last: true,
    };
    mockedAxios.get.mockResolvedValueOnce({ data: page });
    mockedAxios.delete.mockResolvedValueOnce({});

    await expect(userService.getMyHistory(0, 12)).resolves.toEqual(page);
    await expect(userService.clearMyHistory()).resolves.toBeUndefined();

    expect(mockedAxios.get).toHaveBeenCalledWith('other/users/me/history', {
      params: { page: 0, size: 12 },
      headers: { Authorization: 'Bearer bob-token' },
    });
    expect(mockedAxios.delete).toHaveBeenCalledWith('other/users/me/history', {
      headers: { Authorization: 'Bearer bob-token' },
    });
  });

  it('fetches one page of a user public videos', async () => {
    const page = { content: [], page: 1, size: 12, totalElements: 13, totalPages: 2, last: true };
    mockedAxios.get.mockResolvedValueOnce({ data: page });

    const result = await userService.getPublicVideos('al ice', 1, 12);

    expect(result).toEqual(page);
    expect(mockedAxios.get).toHaveBeenCalledWith('other/users/al%20ice/videos', { params: { page: 1, size: 12 } });
  });

  it('fetches own profile with token', async () => {
    authService.setToken('alice-token');
    const user = { id: 1, username: 'alice', email: 'alice@example.com' };
    mockedAxios.get.mockResolvedValueOnce({ data: user });

    const result = await userService.getMyProfile();

    expect(result).toEqual(user);
    expect(mockedAxios.get).toHaveBeenCalledWith('other/users/me', {
      headers: { Authorization: 'Bearer alice-token' },
    });
  });

  it('updates own profile with display name and description', async () => {
    authService.setToken('alice-token');
    const updated = {
      id: 1,
      username: 'alice',
      email: 'alice@example.com',
      displayName: 'New Name',
      description: 'New Bio',
    };
    mockedAxios.put.mockResolvedValueOnce({ data: updated });

    const payload = { displayName: 'New Name', description: 'New Bio' };
    const result = await userService.updateMyProfile(payload);

    expect(result).toEqual(updated);
    expect(mockedAxios.put).toHaveBeenCalledWith('other/users/me', payload, {
      headers: { Authorization: 'Bearer alice-token' },
    });
  });

  it('uploads avatar image as multipart form-data', async () => {
    authService.setToken('alice-token');
    const updated = { id: 1, username: 'alice', email: 'alice@example.com', avatarUrl: '/media/avatars/new.png' };
    mockedAxios.post.mockResolvedValueOnce({ data: updated });

    const file = new File(['dummy-bytes'], 'avatar.png', { type: 'image/png' });
    const result = await userService.uploadAvatar(file);

    expect(result).toEqual(updated);
    expect(mockedAxios.post).toHaveBeenCalledWith('other/users/me/avatar', expect.any(FormData), {
      headers: {
        Authorization: 'Bearer alice-token',
        'Content-Type': 'multipart/form-data',
      },
    });
  });
});
