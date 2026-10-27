import { act, fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import VideoCatalog from '../VideoCatalog';
import type { Page, VideoSummary } from '../../types/video';

jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn() } }));
const mockedGet = axios.get as jest.Mock;

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
  });

  it('shows a loading indicator while the first page loads', async () => {
    mockedGet.mockReturnValue(new Promise(() => {}));

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
});
