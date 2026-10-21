import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RegisterPage from '../RegisterPage';
import { AuthProvider } from '../../context/AuthProvider';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedPost = axios.post as jest.Mock;

describe('RegisterPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedPost.mockReset();
  });

  const renderRegisterPage = () => {
    return render(
      <MemoryRouter initialEntries={['/register']}>
        <AuthProvider>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<div>Home Page Content</div>} />
            <Route path="/login" element={<div>Login Page Content</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders all registration form inputs and submit button', () => {
    renderRegisterPage();

    expect(screen.getByRole('heading', { name: /Create Your ProTube Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Avatar URL/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Bio \/ Description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Register$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Log In/i })).toHaveAttribute('href', '/login');
  });

  it('validates username, email, and password policy on client side', async () => {
    renderRegisterPage();

    // 1. Empty username
    fireEvent.click(screen.getByRole('button', { name: /^Register$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Username must be at least 3 characters');
    expect(mockedPost).not.toHaveBeenCalled();

    // 2. Short username
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'al' } });
    fireEvent.click(screen.getByRole('button', { name: /^Register$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Username must be at least 3 characters');

    // 3. Invalid email
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /^Register$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Please provide a valid email address');

    // 4. Password < 8 characters
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /^Register$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Password must be at least 8 characters');
  });

  it('submits valid registration, sets user session, and redirects to home', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        token: 'new-user-token-789',
        user: { id: 2, username: 'bob', email: 'bob@example.com', avatarUrl: 'http://img', description: 'Bio' },
      },
    });

    renderRegisterPage();

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'bob' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'bob@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText(/Avatar URL/i), { target: { value: 'http://img' } });
    fireEvent.change(screen.getByLabelText(/Bio \/ Description/i), { target: { value: 'Bio' } });

    fireEvent.click(screen.getByRole('button', { name: /^Register$/i }));

    await waitFor(() => {
      expect(screen.getByText('Home Page Content')).toBeInTheDocument();
    });

    expect(localStorage.getItem('protube_token')).toBe('new-user-token-789');
    expect(mockedPost).toHaveBeenCalledWith('other/auth/register', {
      username: 'bob',
      email: 'bob@example.com',
      password: 'secret123',
      avatarUrl: 'http://img',
      description: 'Bio',
    });
  });

  it('displays conflict error message when email is already registered', async () => {
    mockedPost.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          detail: 'Email already in use',
        },
      },
    });

    renderRegisterPage();

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'bob' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'bob@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'secret123' } });

    fireEvent.click(screen.getByRole('button', { name: /^Register$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email already in use');
    expect(screen.queryByText('Home Page Content')).not.toBeInTheDocument();
  });
});
