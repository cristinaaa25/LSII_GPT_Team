import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from '../LoginPage';
import { AuthProvider } from '../../context/AuthProvider';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockedPost = axios.post as jest.Mock;

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedPost.mockReset();
  });

  const renderLoginPage = (initialRoute = '/login') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>Home Page Content</div>} />
            <Route path="/register" element={<div>Register Page Content</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('renders login form elements and links', () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { name: /Log In to ProTube/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email or Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Log In$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Register/i })).toHaveAttribute('href', '/register');
  });

  it('validates required fields on client side before submission', async () => {
    renderLoginPage();

    fireEvent.click(screen.getByRole('button', { name: /^Log In$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or username is required');
    expect(mockedPost).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Email or Username/i), { target: { value: 'alice@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^Log In$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Password is required');
    expect(mockedPost).not.toHaveBeenCalled();
  });

  it('submits valid credentials, sets token, and redirects to home', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        token: 'token-abc-123',
        user: { id: 1, username: 'alice', email: 'alice@example.com', avatarUrl: null, description: null },
      },
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/Email or Username/i), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });

    fireEvent.click(screen.getByRole('button', { name: /^Log In$/i }));

    await waitFor(() => {
      expect(screen.getByText('Home Page Content')).toBeInTheDocument();
    });

    expect(localStorage.getItem('protube_token')).toBe('token-abc-123');
    expect(mockedPost).toHaveBeenCalledWith('other/auth/login', {
      email: 'alice@example.com',
      password: 'password123',
    });
  });

  it('displays server error message when credentials are wrong', async () => {
    mockedPost.mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          detail: 'Invalid credentials',
        },
      },
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/Email or Username/i), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpass' } });

    fireEvent.click(screen.getByRole('button', { name: /^Log In$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.queryByText('Home Page Content')).not.toBeInTheDocument();
  });
});
