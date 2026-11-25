import { fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../App';
import { videoService } from '../../services/videoService';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));
const mockedGet = axios.get as jest.Mock;

jest.mock('../../services/videoService', () => ({
  videoService: {
    getCategories: jest.fn(),
  },
}));
const mockedGetCategories = videoService.getCategories as jest.Mock;

describe('App routing', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedGetCategories.mockReset();
    mockedGet.mockResolvedValue({
      data: {
        content: [],
        page: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    });
    mockedGetCategories.mockResolvedValue([]);
  });

  it('renders NotFoundPage with header and search when navigating to an unknown route', () => {
    render(
      <MemoryRouter initialEntries={['/this-route-does-not-exist']}>
        <App router="none" />
      </MemoryRouter>
    );

    // Header with search remains visible
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search videos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();

    // 404 message is displayed
    expect(screen.getByRole('heading', { level: 2, name: 'Page Not Found' })).toBeInTheDocument();
    expect(screen.getByText('The page you are looking for does not exist or may have been moved.')).toBeInTheDocument();

    // Link back to home
    const homeLink = screen.getByRole('link', { name: 'Back to home' });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('navigates back to home when clicking the Back to home link on NotFoundPage', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-page']}>
        <App router="none" />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Page Not Found' })).toBeInTheDocument();

    const homeLink = screen.getByRole('link', { name: 'Back to home' });
    fireEvent.click(homeLink);

    // After clicking the link, it navigates to catalog (home)
    expect(screen.queryByRole('heading', { level: 2, name: 'Page Not Found' })).not.toBeInTheDocument();
  });

  it('renders default browser router when router prop is browser or omitted', () => {
    const { container } = render(<App />);
    expect(container.querySelector('.App')).toBeInTheDocument();
  });
});
