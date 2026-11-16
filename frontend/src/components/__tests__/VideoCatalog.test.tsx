import { act, fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import VideoCatalog from '../VideoCatalog';
import { videoService } from '../../services/videoService';
import type { Page, VideoSummary } from '../../types/video';

jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
const mockedGet = axios.get as jest.Mock;

jest.mock('../../services/videoService', () => ({
  videoService: {
    getCategories: jest.fn(),
  },
}));
const mockedGetCategories = videoService.getCategories as jest.Mock;

const video = (id: number): VideoSummary => ({
  id,
  title: `Video ${id}`,
  author: `Author ${id}`,
  duration: 65,
  views: 1500,
  thumbnail: `${id}.webp`,
});

const page = (ids: number[], pageNumber: number, last: boolean): { data: Page<VideoSummary> } => ({
  data: {
    content: ids.map(video),
    page: pageNumber,
    size: 2,
    totalElements: 4,
    totalPages: 2,
    last,
  },
});

describe('VideoCatalog', () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedGetCategories.mockReset();
    mockedGetCategories.mockResolvedValue([]);
  });

  it('shows a loading indicator while the first page loads', async () => {
    mockedGet.mockReturnValue(new Promise(() => {}));
    mockedGetCategories.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <VideoCatalog />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent('Loading videos...');
  });

  it('renders a card per video with thumbnail, title, author and duration', async () => {
    mockedGet.mockResolvedValueOnce(page([1, 2], 0, true));

    render(
      <MemoryRouter>
        <VideoCatalog pageSize={2} />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Video 1' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Video 2' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Video 1' })).toHaveAttribute('src', 'development/1.webp');
    expect(screen.getByText('Author 1')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Duration')[0]).toHaveTextContent('1:05');
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    expect(mockedGet).toHaveBeenCalledWith('other/videos', { params: { page: 0, size: 2 } });
  });

  it('loads and appends the next page when clicking "Load more"', async () => {
    mockedGet.mockResolvedValueOnce(page([1, 2], 0, false)).mockResolvedValueOnce(page([3, 4], 1, true));

    render(
      <MemoryRouter>
        <VideoCatalog pageSize={2} />
      </MemoryRouter>
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));

    expect(await screen.findByRole('heading', { name: 'Video 4' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(mockedGet).toHaveBeenLastCalledWith('other/videos', { params: { page: 1, size: 2 } });
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('loads the next page when the user scrolls to the end of the list', async () => {
    let trigger: (visible: boolean) => void = () => {};
    const disconnect = jest.fn();
    window.IntersectionObserver = jest.fn((callback: IntersectionObserverCallback) => {
      trigger = (visible) =>
        callback([{ isIntersecting: visible } as IntersectionObserverEntry], {} as IntersectionObserver);
      return { observe: jest.fn(), disconnect } as unknown as IntersectionObserver;
    }) as unknown as typeof IntersectionObserver;
    mockedGet.mockResolvedValueOnce(page([1, 2], 0, false)).mockResolvedValueOnce(page([3, 4], 1, true));

    render(
      <MemoryRouter>
        <VideoCatalog pageSize={2} />
      </MemoryRouter>
    );
    await screen.findByRole('heading', { name: 'Video 1' });

    act(() => trigger(false));
    expect(mockedGet).toHaveBeenCalledTimes(1);

    act(() => trigger(true));
    expect(await screen.findByRole('heading', { name: 'Video 4' })).toBeInTheDocument();
    expect(disconnect).toHaveBeenCalled();

    // @ts-expect-error cleaning up the test double
    delete window.IntersectionObserver;
  });

  it('shows an empty state when there are no videos', async () => {
    mockedGet.mockResolvedValueOnce({
      data: { content: [], page: 0, size: 12, totalElements: 0, totalPages: 0, last: true },
    });

    render(
      <MemoryRouter>
        <VideoCatalog />
      </MemoryRouter>
    );

    expect(await screen.findByText('No videos available yet.')).toBeInTheDocument();
  });

  it('shows an error and retries the same page', async () => {
    mockedGet.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(page([1, 2], 0, true));

    render(
      <MemoryRouter>
        <VideoCatalog pageSize={2} />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Error loading videos: Network Error');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('heading', { name: 'Video 1' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockedGet).toHaveBeenLastCalledWith('other/videos', { params: { page: 0, size: 2 } });
  });

  it('shows a generic message for non-Error failures', async () => {
    mockedGet.mockRejectedValueOnce('boom');

    render(
      <MemoryRouter>
        <VideoCatalog />
      </MemoryRouter>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Unknown error');
  });

  it('renders category chips and sort select above the catalog', async () => {
    mockedGetCategories.mockResolvedValueOnce([
      { name: 'Gaming', count: 12 },
      { name: 'Music', count: 5 },
    ]);
    mockedGet.mockResolvedValueOnce(page([1], 0, true));

    render(
      <MemoryRouter>
        <VideoCatalog />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Gaming\s+12/ })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Music\s+5/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort videos' })).toHaveValue('newest');
  });

  it('updates url and restarts infinite scroll when category chip is clicked', async () => {
    mockedGetCategories.mockResolvedValue([{ name: 'Gaming', count: 12 }]);
    mockedGet.mockResolvedValueOnce(page([1], 0, true)).mockResolvedValueOnce(page([2], 0, true));

    render(
      <MemoryRouter initialEntries={['/']}>
        <VideoCatalog />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Video 1' });
    fireEvent.click(await screen.findByRole('button', { name: /Gaming\s+12/ }));

    expect(await screen.findByRole('heading', { name: 'Video 2' })).toBeInTheDocument();
    expect(mockedGet).toHaveBeenLastCalledWith('other/videos', {
      params: { page: 0, size: 12, category: 'Gaming' },
    });
  });

  it('updates url and restarts infinite scroll when sort is changed', async () => {
    mockedGetCategories.mockResolvedValue([]);
    mockedGet.mockResolvedValueOnce(page([1], 0, true)).mockResolvedValueOnce(page([3], 0, true));

    render(
      <MemoryRouter initialEntries={['/']}>
        <VideoCatalog />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Video 1' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort videos' }), {
      target: { value: 'views' },
    });

    expect(await screen.findByRole('heading', { name: 'Video 3' })).toBeInTheDocument();
    expect(mockedGet).toHaveBeenLastCalledWith('other/videos', {
      params: { page: 0, size: 12, sort: 'views' },
    });
  });

  it('loads initial state from URL query parameters', async () => {
    mockedGetCategories.mockResolvedValue([{ name: 'Music', count: 5 }]);
    mockedGet.mockResolvedValueOnce(page([5], 0, true));

    render(
      <MemoryRouter initialEntries={['/?category=Music&sort=views']}>
        <VideoCatalog />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Video 5' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Sort videos' })).toHaveValue('views');
    expect(mockedGet).toHaveBeenCalledWith('other/videos', {
      params: { page: 0, size: 12, category: 'Music', sort: 'views' },
    });
  });
});
