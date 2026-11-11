import axios from 'axios';
import { userService } from '../userService';
import { authService } from '../authService';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedAxios = axios as unknown as { get: jest.Mock; put: jest.Mock; post: jest.Mock };

describe('userService', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedAxios.get.mockReset();
    mockedAxios.put.mockReset();
    mockedAxios.post.mockReset();
  });

  it('fetches public profile by username', async () => {
    const profile = {
      id: 1,
      username: 'alice',
      displayName: 'Alice W',
      avatarUrl: '/media/avatars/a.png',
      description: 'bio',
      videos: [],
    };
    mockedAxios.get.mockResolvedValueOnce({ data: profile });

    const result = await userService.getPublicProfile('alice');

    expect(result).toEqual(profile);
    expect(mockedAxios.get).toHaveBeenCalledWith('other/users/alice');
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
