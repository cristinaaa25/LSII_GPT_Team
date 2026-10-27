import { render, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SearchPage from '../SearchPage';
import type { Page, VideoSummary } from '../../types/video';

jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
const mockedGet = axios.get as jest.Mock;

const results = (titles: string[]): { data: Page<VideoSummary> } => ({
  data: {
    content: titles.map((title, index) => ({
      id: index + 1,
      title,
      author: 'channel',
      duration: 30,
      views: 10,
      thumbnail: null,
    })),
    page: 0,
    size: 12,
    totalElements: titles.length,
    totalPages: titles.length ? 1 : 0,
    last: true,
  },
});

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('SearchPage', () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it('shows the results for the query in the order returned by the backend', async () => {
    mockedGet.mockResolvedValueOnce(results(['Cat videos', 'Funny pets']));

    renderAt('/search?q=cat');

    expect(screen.getByRole('heading', { name: 'Results for "cat"' })).toBeInTheDocument();
    const cards = await screen.findAllByRole('article');
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual(['Cat videos', 'Funny pets']);
    expect(mockedGet).toHaveBeenCalledWith('other/videos/search', { params: { q: 'cat', page: 0, size: 12 } });
  });

  it('shows an empty-state message when nothing matches', async () => {
    mockedGet.mockResolvedValueOnce(results([]));

    renderAt('/search?q=zzz');

    expect(await screen.findByText('No videos found for "zzz".')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('lists every video when the query is empty', async () => {
    mockedGet.mockResolvedValueOnce(results(['Any video']));

    renderAt('/search?q=');

    expect(screen.getByRole('heading', { name: 'All videos' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Any video' })).toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith('other/videos/search', { params: { q: '', page: 0, size: 12 } });
  });
});
