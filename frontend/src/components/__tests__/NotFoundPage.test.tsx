import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from '../NotFoundPage';

describe('NotFoundPage', () => {
  it('renders default title, message and link back to home', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Page Not Found' })).toBeInTheDocument();
    expect(screen.getByText('The page you are looking for does not exist or may have been moved.')).toBeInTheDocument();
    const homeLink = screen.getByRole('link', { name: 'Back to home' });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders custom title, message and link text when props are provided', () => {
    render(
      <MemoryRouter>
        <NotFoundPage
          title="Custom Not Found"
          message="Custom message explaining that the item was not found."
          linkText="Go back"
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Custom Not Found' })).toBeInTheDocument();
    expect(screen.getByText('Custom message explaining that the item was not found.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Go back' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });
});
