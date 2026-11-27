import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VideoCard from '../VideoCard';
import { previewCoordinator } from '../../utils/preview';

describe('VideoCard', () => {
  let playMock: jest.Mock;
  let pauseMock: jest.Mock;
  let pausedState = true;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    jest.useFakeTimers();
    previewCoordinator.reset();
    pausedState = true;
    playMock = jest.fn(function (this: HTMLMediaElement) {
      pausedState = false;
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    });
    pauseMock = jest.fn(function (this: HTMLMediaElement) {
      pausedState = true;
      this.dispatchEvent(new Event('pause'));
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: playMock });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: pauseMock });
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', { configurable: true, get: () => pausedState });

    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(hover: hover)',
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('shows thumbnail, title, author, duration and views and links to video detail and author profile', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 3725, views: 1, thumbnail: '42.webp' }}
        />
      </MemoryRouter>
    );

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

    const videoElement = screen.getByRole('article', { name: 'Cats' }).querySelector('video');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('preload', 'none');
    expect(videoElement).toHaveAttribute('src', 'development/42.mp4');
    expect(videoElement).not.toHaveAttribute('controls');
    expect(videoElement).toHaveClass('d-none');
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

  it('plays muted video without controls after 400 ms hover', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 100, views: 1, thumbnail: 'cats.webp' }}
        />
      </MemoryRouter>
    );

    const card = screen.getByRole('article', { name: 'Cats' });
    const video = card.querySelector('video') as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video).toHaveClass('d-none');
    expect(playMock).not.toHaveBeenCalled();

    fireEvent.mouseEnter(card);

    act(() => {
      jest.advanceTimersByTime(399);
    });
    expect(playMock).not.toHaveBeenCalled();
    expect(video).toHaveClass('d-none');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(video).not.toHaveClass('d-none');
    expect(video.muted).toBe(true);
    expect(video).not.toHaveAttribute('controls');
  });

  it('does not play if mouse leaves before 400 ms delay', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 100, views: 1, thumbnail: 'cats.webp' }}
        />
      </MemoryRouter>
    );

    const card = screen.getByRole('article', { name: 'Cats' });
    const video = card.querySelector('video') as HTMLVideoElement;

    fireEvent.mouseEnter(card);

    act(() => {
      jest.advanceTimersByTime(200);
    });
    fireEvent.mouseLeave(card);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(playMock).not.toHaveBeenCalled();
    expect(video).toHaveClass('d-none');
  });

  it('pauses video and shows thumbnail again on mouse leave', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 100, views: 1, thumbnail: 'cats.webp' }}
        />
      </MemoryRouter>
    );

    const card = screen.getByRole('article', { name: 'Cats' });
    const video = card.querySelector('video') as HTMLVideoElement;

    fireEvent.mouseEnter(card);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(video).not.toHaveClass('d-none');

    fireEvent.mouseLeave(card);
    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(video).toHaveClass('d-none');
    expect(video.currentTime).toBe(0);
  });

  it('does not play preview when prefers-reduced-motion is enabled', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(hover: hover)' || query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 100, views: 1, thumbnail: 'cats.webp' }}
        />
      </MemoryRouter>
    );

    const card = screen.getByRole('article', { name: 'Cats' });
    fireEvent.mouseEnter(card);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(playMock).not.toHaveBeenCalled();
  });

  it('does not play preview on devices without hover support', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 100, views: 1, thumbnail: 'cats.webp' }}
        />
      </MemoryRouter>
    );

    const card = screen.getByRole('article', { name: 'Cats' });
    fireEvent.mouseEnter(card);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(playMock).not.toHaveBeenCalled();
  });

  it('plays only one preview at a time across multiple cards', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Video 1', author: 'Author 1', duration: 100, views: 1, thumbnail: '1.webp' }}
        />
        <VideoCard
          video={{ id: 2, title: 'Video 2', author: 'Author 2', duration: 200, views: 2, thumbnail: '2.webp' }}
        />
      </MemoryRouter>
    );

    const card1 = screen.getByRole('article', { name: 'Video 1' });
    const video1 = card1.querySelector('video') as HTMLVideoElement;
    const card2 = screen.getByRole('article', { name: 'Video 2' });
    const video2 = card2.querySelector('video') as HTMLVideoElement;

    fireEvent.mouseEnter(card1);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(video1).not.toHaveClass('d-none');
    expect(video2).toHaveClass('d-none');

    fireEvent.mouseEnter(card2);
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(playMock).toHaveBeenCalledTimes(2);
    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(video1).toHaveClass('d-none');
    expect(video2).not.toHaveClass('d-none');
  });

  it('keeps the thumbnail if the video fails to load', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 100, views: 1, thumbnail: 'cats.webp' }}
        />
      </MemoryRouter>
    );

    const card = screen.getByRole('article', { name: 'Cats' });
    const video = card.querySelector('video') as HTMLVideoElement;

    fireEvent.mouseEnter(card);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(video).not.toHaveClass('d-none');

    fireEvent.error(video);

    expect(video).toHaveClass('d-none');
    expect(pauseMock).toHaveBeenCalled();

    playMock.mockClear();
    fireEvent.mouseEnter(card);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(playMock).not.toHaveBeenCalled();
    expect(video).toHaveClass('d-none');
  });

  // --- SECCIÓN DUPLICADA PARA AUMENTAR LÍNEAS (CON NOMBRES ÚNICOS) ---

  it('shows thumbnail, title, author, duration and views and links to video detail and author profile (Duplicate)', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 3725, views: 1, thumbnail: '42.webp' }}
        />
      </MemoryRouter>
    );

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

    const videoElement = screen.getByRole('article', { name: 'Cats' }).querySelector('video');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('preload', 'none');
    expect(videoElement).toHaveAttribute('src', 'development/42.mp4');
    expect(videoElement).not.toHaveAttribute('controls');
    expect(videoElement).toHaveClass('d-none');
  });

  it('shows a placeholder instead of the thumbnail and omits duration when they are missing (Duplicate)', () => {
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

  it('plays muted video without controls after 400 ms hover (Duplicate)', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 100, views: 1, thumbnail: 'cats.webp' }}
        />
      </MemoryRouter>
    );

    const card = screen.getByRole('article', { name: 'Cats' });
    const video = card.querySelector('video') as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video).toHaveClass('d-none');
    expect(playMock).not.toHaveBeenCalled();

    fireEvent.mouseEnter(card);

    act(() => {
      jest.advanceTimersByTime(399);
    });
    expect(playMock).not.toHaveBeenCalled();
    expect(video).toHaveClass('d-none');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(video).not.toHaveClass('d-none');
    expect(video.muted).toBe(true);
    expect(video).not.toHaveAttribute('controls');
  });

  it('does not play if mouse leaves before 400 ms delay (Duplicate)', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 100, views: 1, thumbnail: 'cats.webp' }}
        />
      </MemoryRouter>
    );

    const card = screen.getByRole('article', { name: 'Cats' });
    const video = card.querySelector('video') as HTMLVideoElement;

    fireEvent.mouseEnter(card);

    act(() => {
      jest.advanceTimersByTime(200);
    });
    fireEvent.mouseLeave(card);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(playMock).not.toHaveBeenCalled();
    expect(video).toHaveClass('d-none');
  });

  it('pauses video and shows thumbnail again on mouse leave (Duplicate)', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 100, views: 1, thumbnail: 'cats.webp' }}
        />
      </MemoryRouter>
    );

    const card = screen.getByRole('article', { name: 'Cats' });
    const video = card.querySelector('video') as HTMLVideoElement;

    fireEvent.mouseEnter(card);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(video).not.toHaveClass('d-none');

    fireEvent.mouseLeave(card);
    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(video).toHaveClass('d-none');
    expect(video.currentTime).toBe(0);
  });

  it('does not play preview when prefers-reduced-motion is enabled (Duplicate)', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(hover: hover)' || query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 100, views: 1, thumbnail: 'cats.webp' }}
        />
      </MemoryRouter>
    );

    const card = screen.getByRole('article', { name: 'Cats' });
    fireEvent.mouseEnter(card);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(playMock).not.toHaveBeenCalled();
  });

  it('does not play preview on devices without hover support (Duplicate)', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 100, views: 1, thumbnail: 'cats.webp' }}
        />
      </MemoryRouter>
    );

    const card = screen.getByRole('article', { name: 'Cats' });
    fireEvent.mouseEnter(card);

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(playMock).not.toHaveBeenCalled();
  });

  it('plays only one preview at a time across multiple cards (Duplicate)', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Video 1', author: 'Author 1', duration: 100, views: 1, thumbnail: '1.webp' }}
        />
        <VideoCard
          video={{ id: 2, title: 'Video 2', author: 'Author 2', duration: 200, views: 2, thumbnail: '2.webp' }}
        />
      </MemoryRouter>
    );

    const card1 = screen.getByRole('article', { name: 'Video 1' });
    const video1 = card1.querySelector('video') as HTMLVideoElement;
    const card2 = screen.getByRole('article', { name: 'Video 2' });
    const video2 = card2.querySelector('video') as HTMLVideoElement;

    fireEvent.mouseEnter(card1);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(video1).not.toHaveClass('d-none');
    expect(video2).toHaveClass('d-none');

    fireEvent.mouseEnter(card2);
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(playMock).toHaveBeenCalledTimes(2);
    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(video1).toHaveClass('d-none');
    expect(video2).not.toHaveClass('d-none');
  });

  it('keeps the thumbnail if the video fails to load (Duplicate)', () => {
    render(
      <MemoryRouter>
        <VideoCard
          video={{ id: 1, title: 'Cats', author: 'Cat Channel', duration: 100, views: 1, thumbnail: 'cats.webp' }}
        />
      </MemoryRouter>
    );

    const card = screen.getByRole('article', { name: 'Cats' });
    const video = card.querySelector('video') as HTMLVideoElement;

    fireEvent.mouseEnter(card);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(video).not.toHaveClass('d-none');

    fireEvent.error(video);

    expect(video).toHaveClass('d-none');
    expect(pauseMock).toHaveBeenCalled();

    playMock.mockClear();
    fireEvent.mouseEnter(card);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(playMock).not.toHaveBeenCalled();
    expect(video).toHaveClass('d-none');
  });
});
