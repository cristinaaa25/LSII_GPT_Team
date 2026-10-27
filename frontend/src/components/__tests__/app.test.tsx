import { fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import App from '../../App';

jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));

describe('App', () => {
  it('renders the logo and the video catalog on the home page', async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: { content: [], page: 0, size: 12, totalElements: 0, totalPages: 0, last: true },
    });

    render(<App />);

    expect(screen.getByRole('img', { name: 'ProTube logo' })).toBeInTheDocument();
    expect(await screen.findByText('No videos available yet.')).toBeInTheDocument();
  });

  it('searches from the header and shows the results page', async () => {
    const emptyPage = { content: [], page: 0, size: 12, totalElements: 0, totalPages: 0, last: true };
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: emptyPage }).mockResolvedValueOnce({
      data: {
        ...emptyPage,
        content: [{ id: 3, title: 'Cat videos', author: 'channel', duration: 30, views: 10, thumbnail: null }],
        totalElements: 1,
        totalPages: 1,
      },
    });

    render(<App />);
    await screen.findByText('No videos available yet.');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search videos' }), { target: { value: 'cat' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('heading', { name: 'Results for "cat"' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Cat videos' })).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe('/search?q=cat');
    expect(axios.get).toHaveBeenLastCalledWith('other/videos/search', { params: { q: 'cat', page: 0, size: 12 } });
  });
});
