import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VideoCard from '../VideoCard';

describe('VideoCard', () => {
  it('shows thumbnail, title, author, duration and views and links to video detail', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 3725, views: 1, thumbnail: '42.webp' }}
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/videos/1');
    expect(screen.getByRole('img', { name: 'Cats' })).toHaveAttribute('src', 'development/42.webp');
    expect(screen.getByRole('heading', { name: 'Cats' })).toBeInTheDocument();
    expect(screen.getByText('Cat Channel')).toBeInTheDocument();
    expect(screen.getByLabelText('Duration')).toHaveTextContent('1:02:05');
    expect(screen.getByText('1 view')).toBeInTheDocument();
  });

  it('omits thumbnail and duration when they are missing', () => {
    render(
      <MemoryRouter>
        <VideoCard video={{ id: 2, title: 'Bare', author: 'x', duration: null, views: 0, thumbnail: null }} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/videos/2');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Duration')).not.toBeInTheDocument();
    expect(screen.getByText('0 views')).toBeInTheDocument();
  });
});
