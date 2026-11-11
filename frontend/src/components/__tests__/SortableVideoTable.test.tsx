import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SortableVideoTable from '../SortableVideoTable';
import { VideoAnalytics } from '../../types/analytics';

const sampleVideos: VideoAnalytics[] = [
  {
    id: 1,
    title: 'Alpha Video',
    thumbnailUrl: 'alpha.webp',
    uploadDate: '2026-10-01T10:00:00Z',
    duration: 120,
    views: 100,
    likes: 10,
    comments: 5,
  },
  {
    id: 2,
    title: 'Beta Video',
    thumbnailUrl: null,
    uploadDate: '2026-10-15T12:00:00Z',
    duration: 60,
    views: 300,
    likes: 2,
    comments: 20,
  },
  {
    id: 3,
    title: 'Gamma Video',
    thumbnailUrl: 'https://example.com/gamma.jpg',
    uploadDate: '2026-11-01T08:00:00Z',
    duration: 300,
    views: 50,
    likes: 40,
    comments: 1,
  },
];

describe('SortableVideoTable', () => {
  it('renders all video titles and metadata', () => {
    render(
      <MemoryRouter>
        <SortableVideoTable videos={sampleVideos} />
      </MemoryRouter>
    );

    expect(screen.getByText('Alpha Video')).toBeInTheDocument();
    expect(screen.getByText('Beta Video')).toBeInTheDocument();
    expect(screen.getByText('Gamma Video')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: /per-video analytics/i })).toBeInTheDocument();
  });

  it('renders links to video detail pages', () => {
    render(
      <MemoryRouter>
        <SortableVideoTable videos={sampleVideos} />
      </MemoryRouter>
    );

    const alphaLink = screen.getByRole('link', { name: 'Alpha Video' });
    expect(alphaLink).toHaveAttribute('href', '/videos/1');
  });

  it('sorts by views descending by default', () => {
    render(
      <MemoryRouter>
        <SortableVideoTable videos={sampleVideos} />
      </MemoryRouter>
    );

    const rows = screen.getAllByRole('row');
    // First data row (index 1) should be Beta Video (300 views)
    expect(rows[1]).toHaveTextContent('Beta Video');
    // Second should be Alpha Video (100 views)
    expect(rows[2]).toHaveTextContent('Alpha Video');
    // Third should be Gamma Video (50 views)
    expect(rows[3]).toHaveTextContent('Gamma Video');
  });

  it('toggles views sort to ascending when clicked', () => {
    render(
      <MemoryRouter>
        <SortableVideoTable videos={sampleVideos} />
      </MemoryRouter>
    );

    const viewsHeader = screen.getByRole('button', { name: /views/i });
    fireEvent.click(viewsHeader);

    const rows = screen.getAllByRole('row');
    // Ascending: Gamma (50) -> Alpha (100) -> Beta (300)
    expect(rows[1]).toHaveTextContent('Gamma Video');
    expect(rows[2]).toHaveTextContent('Alpha Video');
    expect(rows[3]).toHaveTextContent('Beta Video');
  });

  it('sorts by title alphabetically when title header clicked', () => {
    render(
      <MemoryRouter>
        <SortableVideoTable videos={sampleVideos} />
      </MemoryRouter>
    );

    const titleHeader = screen.getByRole('button', { name: /video/i });
    fireEvent.click(titleHeader);

    let rows = screen.getAllByRole('row');
    // Ascending: Alpha -> Beta -> Gamma
    expect(rows[1]).toHaveTextContent('Alpha Video');
    expect(rows[2]).toHaveTextContent('Beta Video');
    expect(rows[3]).toHaveTextContent('Gamma Video');

    // Click again for descending
    fireEvent.click(titleHeader);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Gamma Video');
    expect(rows[2]).toHaveTextContent('Beta Video');
    expect(rows[3]).toHaveTextContent('Alpha Video');
  });

  it('sorts by likes, comments, duration and upload date', () => {
    render(
      <MemoryRouter>
        <SortableVideoTable videos={sampleVideos} />
      </MemoryRouter>
    );

    // Sort by likes
    const likesHeader = screen.getByRole('button', { name: /likes/i });
    fireEvent.click(likesHeader);
    let rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Gamma Video'); // 40 likes

    // Sort by comments
    const commentsHeader = screen.getByRole('button', { name: /comments/i });
    fireEvent.click(commentsHeader);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Beta Video'); // 20 comments

    // Sort by duration
    const durationHeader = screen.getByRole('button', { name: /duration/i });
    fireEvent.click(durationHeader);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Gamma Video'); // 300s

    // Sort by date
    const dateHeader = screen.getByRole('button', { name: /date/i });
    fireEvent.click(dateHeader);
    rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Gamma Video'); // Nov 1
  });
});
