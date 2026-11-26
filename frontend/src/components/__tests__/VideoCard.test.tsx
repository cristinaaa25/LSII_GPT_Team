import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VideoCard from '../VideoCard';

describe('VideoCard', () => {
  it('shows thumbnail, title, author, duration and views and links to video detail and author profile', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 3725, views: 1, thumbnail: '42.webp' }}
        />
      </MemoryRouter>
    );

    // Only the title link is exposed; the thumbnail link duplicates it and is hidden from assistive tech
    const videoLinks = screen.getAllByRole('link', { name: /cats/i });
    expect(videoLinks).toHaveLength(1);
    expect(videoLinks[0]).toHaveAttribute('href', '/videos/1');

    const authorLink = screen.getByRole('link', { name: /author cat channel/i });
    expect(authorLink).toHaveAttribute('href', '/users/Cat%20Channel');

    const thumbnail = screen.getByRole('article', { name: 'Cats' }).querySelector('img');
    expect(thumbnail).toHaveAttribute('src', 'development/42.webp');
    expect(thumbnail).toHaveAttribute('alt', '');
    expect(thumbnail?.closest('a')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('heading', { name: 'Cats' })).toBeInTheDocument();
    expect(screen.getByText('Cat Channel')).toBeInTheDocument();
    expect(screen.getByLabelText('Duration')).toHaveTextContent('1:02:05');
    expect(screen.getByText('1 view')).toBeInTheDocument();
  });

  it('shows a placeholder instead of the thumbnail and omits duration when they are missing', () => {
    render(
      <MemoryRouter>
        <VideoCard video={{ id: 2, title: 'Bare', author: 'x', duration: null, views: 0, thumbnail: null }} />
      </MemoryRouter>
    );

    const videoLink = screen.getByRole('link', { name: 'Bare' });
    expect(videoLink).toHaveAttribute('href', '/videos/2');
    expect(screen.getByRole('link', { name: /author x/i })).toHaveAttribute('href', '/users/x');
    const card = screen.getByRole('article', { name: 'Bare' });
    expect(card.querySelector('img')).toBeNull();
    expect(card.querySelector('.pt-thumb-placeholder svg')).toBeInTheDocument();
    expect(screen.queryByLabelText('Duration')).not.toBeInTheDocument();
    expect(screen.getByText('0 views')).toBeInTheDocument();
  });
});
