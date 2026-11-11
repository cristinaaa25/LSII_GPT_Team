import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfilePage from '../ProfilePage';
import { AuthContext, AuthContextType } from '../../context/AuthContext';
import { userService } from '../../services/userService';

jest.mock('../../services/userService', () => ({
  userService: {
    updateMyProfile: jest.fn(),
    uploadAvatar: jest.fn(),
  },
}));

const mockedUserService = userService as jest.Mocked<typeof userService>;

if (!global.URL.createObjectURL) {
  global.URL.createObjectURL = jest.fn(() => 'blob:mock-avatar-preview');
}

describe('ProfilePage', () => {
  const mockUpdateUser = jest.fn();

  const createAuthContext = (overrides = {}): AuthContextType => ({
    user: {
      id: 1,
      username: 'alice',
      email: 'alice@example.com',
      displayName: 'Alice Wonder',
      avatarUrl: '/media/avatars/alice.png',
      description: 'Hello, this is my bio.',
    },
    token: 'jwt-123',
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    register: jest.fn(),
    loginWithToken: jest.fn(),
    logout: jest.fn(),
    updateUser: mockUpdateUser,
    ...overrides,
  });

  const renderProfilePage = (authContext = createAuthContext()) => {
    return render(
      <AuthContext.Provider value={authContext}>
        <MemoryRouter>
          <ProfilePage />
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user account details and profile fields', () => {
    renderProfilePage();

    expect(screen.getByRole('heading', { level: 1, name: 'Your Profile' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Public Profile' })).toHaveAttribute('href', '/users/alice');

    // Read-only account details
    const usernameInput = screen.getByDisplayValue('alice');
    expect(usernameInput).toBeDisabled();
    const emailInput = screen.getByDisplayValue('alice@example.com');
    expect(emailInput).toBeDisabled();

    // Editable profile details
    expect(screen.getByDisplayValue('Alice Wonder')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hello, this is my bio.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'alice' })).toHaveAttribute('src', 'development/avatars/alice.png');
  });

  it('renders initial placeholder when user has no avatar', () => {
    const contextWithoutAvatar = createAuthContext({
      user: {
        id: 1,
        username: 'bob',
        email: 'bob@example.com',
        displayName: null,
        avatarUrl: null,
        description: null,
      },
    });

    renderProfilePage(contextWithoutAvatar);

    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('successfully updates display name and description', async () => {
    renderProfilePage();

    const updatedUser = {
      id: 1,
      username: 'alice',
      email: 'alice@example.com',
      displayName: 'Alice In Wonderland',
      avatarUrl: '/media/avatars/alice.png',
      description: 'Updated bio here.',
    };
    mockedUserService.updateMyProfile.mockResolvedValueOnce(updatedUser);

    const nameInput = screen.getByLabelText('Display Name');
    fireEvent.change(nameInput, { target: { value: 'Alice In Wonderland' } });

    const descInput = screen.getByLabelText('Description');
    fireEvent.change(descInput, { target: { value: 'Updated bio here.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Profile updated successfully')).toBeInTheDocument();
    expect(mockedUserService.updateMyProfile).toHaveBeenCalledWith({
      displayName: 'Alice In Wonderland',
      description: 'Updated bio here.',
    });
    expect(mockUpdateUser).toHaveBeenCalledWith(updatedUser);
  });

  it('shows error if display name exceeds 100 characters', async () => {
    renderProfilePage();

    const longName = 'A'.repeat(101);
    const nameInput = screen.getByLabelText('Display Name');
    fireEvent.change(nameInput, { target: { value: longName } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Display name cannot exceed 100 characters')).toBeInTheDocument();
    expect(mockedUserService.updateMyProfile).not.toHaveBeenCalled();
  });

  it('shows error if description exceeds 2000 characters', async () => {
    renderProfilePage();

    const longDesc = 'B'.repeat(2001);
    const descInput = screen.getByLabelText('Description');
    fireEvent.change(descInput, { target: { value: longDesc } });

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Description cannot exceed 2000 characters')).toBeInTheDocument();
    expect(mockedUserService.updateMyProfile).not.toHaveBeenCalled();
  });

  it('handles profile update API failure', async () => {
    renderProfilePage();

    mockedUserService.updateMyProfile.mockRejectedValueOnce(new Error('Server error updating'));

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(await screen.findByText('Server error updating')).toBeInTheDocument();
  });

  it('validates avatar file format and size', () => {
    renderProfilePage();

    const fileInput = screen.getByLabelText('Choose avatar image') as HTMLInputElement;

    // Reject non-image file (.txt)
    const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [textFile] } });

    expect(screen.getByText('Invalid image format. Allowed formats: PNG, JPG, WEBP')).toBeInTheDocument();

    // Reject file > 2MB
    const bigFile = new File([new ArrayBuffer(2 * 1024 * 1024 + 10)], 'huge.png', {
      type: 'image/png',
    });
    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    expect(screen.getByText('Avatar size must not exceed 2MB')).toBeInTheDocument();
  });

  it('successfully uploads a valid avatar image', async () => {
    renderProfilePage();

    const updatedUser = {
      id: 1,
      username: 'alice',
      email: 'alice@example.com',
      avatarUrl: '/media/avatars/new-avatar.png',
    };
    mockedUserService.uploadAvatar.mockResolvedValueOnce(updatedUser);

    const validFile = new File(['valid-image-bytes'], 'new-avatar.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText('Choose avatar image');
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const uploadButton = screen.getByRole('button', { name: 'Upload Avatar' });
    expect(uploadButton).not.toBeDisabled();

    fireEvent.click(uploadButton);

    expect(await screen.findByText('Avatar updated successfully')).toBeInTheDocument();
    expect(mockedUserService.uploadAvatar).toHaveBeenCalledWith(validFile);
    expect(mockUpdateUser).toHaveBeenCalledWith(updatedUser);
  });

  it('handles avatar upload API failure', async () => {
    renderProfilePage();

    mockedUserService.uploadAvatar.mockRejectedValueOnce(new Error('Failed to upload'));

    const validFile = new File(['img'], 'pic.webp', { type: 'image/webp' });
    fireEvent.change(screen.getByLabelText('Choose avatar image'), { target: { files: [validFile] } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload Avatar' }));

    expect(await screen.findByText('Failed to upload')).toBeInTheDocument();
  });

  it('returns null when user is not present in context', () => {
    const contextWithoutUser = createAuthContext({ user: null });
    const { container } = renderProfilePage(contextWithoutUser);
    expect(container.firstChild).toBeNull();
  });

  it('resets selected file when file selection is cleared', () => {
    renderProfilePage();

    const fileInput = screen.getByLabelText('Choose avatar image') as HTMLInputElement;
    const validFile = new File(['img'], 'pic.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Clearing file
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(screen.getByRole('button', { name: 'Upload Avatar' })).toBeDisabled();
  });

  it('shows error if avatar upload is submitted without selecting a file', () => {
    renderProfilePage();

    const form = screen.getByRole('button', { name: 'Upload Avatar' }).closest('form')!;
    fireEvent.submit(form);

    expect(screen.getByText('Please select an image file first')).toBeInTheDocument();
  });

  it('handles non-Error rejection in profile update and avatar upload', async () => {
    renderProfilePage();

    mockedUserService.updateMyProfile.mockRejectedValueOnce('string error');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByText('Failed to update profile')).toBeInTheDocument();

    mockedUserService.uploadAvatar.mockRejectedValueOnce('string error');
    const validFile = new File(['img'], 'pic.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Choose avatar image'), { target: { files: [validFile] } });
    fireEvent.click(screen.getByRole('button', { name: 'Upload Avatar' }));
    expect(await screen.findByText('Failed to upload avatar')).toBeInTheDocument();
  });
});
