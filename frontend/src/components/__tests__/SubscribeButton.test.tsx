import type { ComponentProps } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SubscribeButton from '../SubscribeButton';
import { userService } from '../../services/userService';
import { AuthContext, AuthContextType } from '../../context/AuthContext';
import { SubscriptionStatus } from '../../types/user';

jest.mock('../../services/userService');

const mockedUserService = userService as jest.Mocked<typeof userService>;

const authContext = (username: string): AuthContextType => ({
  user: { id: 7, username, email: `${username}@example.com` },
  token: 'token',
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  register: jest.fn(),
  loginWithToken: jest.fn(),
  logout: jest.fn(),
});

const LoginProbe = () => <div>Login page</div>;

describe('SubscribeButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderButton = (viewer: string | null, props: Partial<ComponentProps<typeof SubscribeButton>> = {}) => {
    const onChange = jest.fn();
    const button = (
      <MemoryRouter initialEntries={['/users/alice']}>
        <Routes>
          <Route
            path="/users/:username"
            element={<SubscribeButton channel="alice" subscribed={false} onChange={onChange} {...props} />}
          />
          <Route path="/login" element={<LoginProbe />} />
        </Routes>
      </MemoryRouter>
    );
    // Without a provider the button must behave as anonymous (VideoDetailPage can render without one)
    render(viewer ? <AuthContext.Provider value={authContext(viewer)}>{button}</AuthContext.Provider> : button);
    return { onChange };
  };

  it('is a link to /login for anonymous visitors', () => {
    renderButton(null);

    const link = screen.getByRole('link', { name: 'Subscribe' });
    expect(link).toHaveAttribute('href', '/login');
    fireEvent.click(link);
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(mockedUserService.subscribe).not.toHaveBeenCalled();
  });

  it('renders nothing on your own channel', () => {
    renderButton('alice');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders the small variant', () => {
    renderButton('bob', { size: 'sm' });
    expect(screen.getByRole('button', { name: 'Subscribe' })).toHaveClass('btn-sm', 'btn-primary');
  });

  it('subscribes and passes the response to onChange', async () => {
    const status: SubscriptionStatus = { username: 'alice', subscriberCount: 3, subscribedByMe: true };
    mockedUserService.subscribe.mockResolvedValueOnce(status);
    const { onChange } = renderButton('bob');

    const button = screen.getByRole('button', { name: 'Subscribe' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockedUserService.subscribe).toHaveBeenCalledWith('alice');
    expect(mockedUserService.unsubscribe).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(status);
  });

  it('unsubscribes when already subscribed', async () => {
    const status: SubscriptionStatus = { username: 'alice', subscriberCount: 2, subscribedByMe: false };
    mockedUserService.unsubscribe.mockResolvedValueOnce(status);
    const { onChange } = renderButton('bob', { subscribed: true });

    const button = screen.getByRole('button', { name: 'Subscribed' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveClass('btn-soft');
    expect(button.querySelector('svg[data-icon="check"]')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockedUserService.unsubscribe).toHaveBeenCalledWith('alice');
    expect(onChange).toHaveBeenCalledWith(status);
  });

  it('is disabled while saving and ignores repeated clicks', async () => {
    let resolve: (value: SubscriptionStatus) => void = () => {};
    mockedUserService.subscribe.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      })
    );
    const { onChange } = renderButton('bob');

    fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    const saving = await screen.findByRole('button', { name: 'Saving...' });
    expect(saving).toBeDisabled();
    fireEvent.click(saving);
    expect(mockedUserService.subscribe).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve({ username: 'alice', subscriberCount: 1, subscribedByMe: true });
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeEnabled();
  });

  it('shows the error and does not call onChange when the request fails', async () => {
    mockedUserService.subscribe.mockRejectedValueOnce(new Error('Network down'));
    const { onChange } = renderButton('bob');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Could not update the subscription: Network down');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeEnabled();
  });

  it('uses a generic message for non-Error failures', async () => {
    mockedUserService.subscribe.mockRejectedValueOnce('boom');
    renderButton('bob');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Subscribe' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to update subscription');
  });
});
