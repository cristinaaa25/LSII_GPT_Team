import { act, fireEvent, render, screen } from '@testing-library/react';
import VideoPlayer from '../VideoPlayer';
import { formatPlayerTime, PLAYBACK_RATES } from '../../utils/player';

// jsdom does not implement media playback: fake play/pause and the paused flag
let pausedState = true;
const playMock = jest.fn(function (this: HTMLMediaElement) {
  pausedState = false;
  this.dispatchEvent(new Event('play'));
  return Promise.resolve();
});
const pauseMock = jest.fn(function (this: HTMLMediaElement) {
  pausedState = true;
  this.dispatchEvent(new Event('pause'));
});

beforeAll(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: playMock });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: pauseMock });
  Object.defineProperty(HTMLMediaElement.prototype, 'paused', { configurable: true, get: () => pausedState });
});

const setDuration = (video: HTMLVideoElement, seconds: number) => {
  Object.defineProperty(video, 'duration', { configurable: true, value: seconds });
  fireEvent.loadedMetadata(video);
};

const renderPlayer = (onPlay = jest.fn()) => {
  render(<VideoPlayer src="/media/1.mp4" poster="/media/1.webp" title="Cats" onPlay={onPlay} />);
  const video = screen.getByLabelText('Cats') as HTMLVideoElement;
  setDuration(video, 190);
  return { video, onPlay };
};

describe('formatPlayerTime', () => {
  it.each([
    [0, '0:00'],
    [5.9, '0:05'],
    [65, '1:05'],
    [190, '3:10'],
    [3725, '1:02:05'],
    [Number.NaN, '0:00'],
    [-3, '0:00'],
  ])('formats %p as %p', (seconds, text) => {
    expect(formatPlayerTime(seconds)).toBe(text);
  });
});

describe('VideoPlayer', () => {
  beforeEach(() => {
    pausedState = true;
    jest.clearAllMocks();
  });

  it('keeps the real video element and swaps the native controls for the custom ones', () => {
    const { video } = renderPlayer();
    expect(video).toHaveAttribute('src', '/media/1.mp4');
    expect(video).toHaveAttribute('poster', '/media/1.webp');
    expect(video.controls).toBe(false);
    expect(screen.getByRole('region', { name: 'Video player' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.getByText('0:00 / 3:10')).toBeInTheDocument();
  });

  it('toggles play and pause from the button and calls onPlay', () => {
    const { video, onPlay } = renderPlayer();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(playMock).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(pauseMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();

    // Clicking the picture also toggles
    fireEvent.click(video);
    expect(playMock).toHaveBeenCalledTimes(2);
  });

  it('shows the big play button only before the first play', () => {
    const { container } = render(<VideoPlayer src="/a.mp4" title="A" />);
    const big = container.querySelector('.pt-player-bigplay') as HTMLButtonElement;
    expect(big).toBeInTheDocument();
    fireEvent.click(big);
    expect(playMock).toHaveBeenCalled();
    expect(container.querySelector('.pt-player-bigplay')).toBeNull();
  });

  it('seeks with the slider and announces the position', () => {
    const { video } = renderPlayer();
    const seek = screen.getByRole('slider', { name: 'Seek' });
    expect(seek).toHaveAttribute('max', '190');

    fireEvent.change(seek, { target: { value: '65' } });
    expect(video.currentTime).toBe(65);
    expect(seek).toHaveAttribute('aria-valuetext', '1:05 of 3:10');
    expect(screen.getByText('1:05 / 3:10')).toBeInTheDocument();
  });

  it('mutes, unmutes and changes the volume', () => {
    const { video } = renderPlayer();
    const volume = screen.getByRole('slider', { name: 'Volume' });

    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(video.muted).toBe(true);
    expect(screen.getByRole('button', { name: 'Unmute' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Unmute' }));
    expect(video.muted).toBe(false);

    fireEvent.change(volume, { target: { value: '0.3' } });
    expect(video.volume).toBeCloseTo(0.3);
    expect(volume).toHaveAttribute('aria-valuetext', '30%');

    // Volume 0 counts as muted, and unmuting brings the sound back
    fireEvent.change(volume, { target: { value: '0' } });
    expect(video.muted).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Unmute' }));
    expect(video.volume).toBe(0.5);
  });

  it('changes the playback speed from the menu', () => {
    const { video } = renderPlayer();
    const speed = screen.getByRole('button', { name: 'Playback speed' });
    expect(speed).toHaveTextContent('1x');

    fireEvent.click(speed);
    const items = screen.getAllByRole('menuitemradio');
    expect(items).toHaveLength(PLAYBACK_RATES.length);
    expect(screen.getByRole('menuitemradio', { name: 'Normal' })).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(screen.getByRole('menuitemradio', { name: '1.5x' }));
    expect(video.playbackRate).toBe(1.5);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(speed).toHaveTextContent('1.5x');

    // Escape and a click outside close the menu
    fireEvent.click(speed);
    fireEvent.keyDown(speed, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(speed);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('supports keyboard shortcuts when the player has focus', () => {
    const { video } = renderPlayer();
    const player = screen.getByRole('region', { name: 'Video player' });
    video.currentTime = 20;

    fireEvent.keyDown(player, { key: 'k' });
    expect(playMock).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(player, { key: ' ' });
    expect(pauseMock).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(player, { key: 'ArrowRight' });
    expect(video.currentTime).toBe(25);
    fireEvent.keyDown(player, { key: 'ArrowLeft' });
    fireEvent.keyDown(player, { key: 'ArrowLeft' });
    expect(video.currentTime).toBe(15);

    video.volume = 0.5;
    fireEvent.keyDown(player, { key: 'ArrowUp' });
    expect(video.volume).toBeCloseTo(0.6);
    fireEvent.keyDown(player, { key: 'ArrowDown' });
    fireEvent.keyDown(player, { key: 'ArrowDown' });
    expect(video.volume).toBeCloseTo(0.4);

    fireEvent.keyDown(player, { key: 'm' });
    expect(video.muted).toBe(true);
  });

  it('does not steal keys from the sliders or from a focused button', () => {
    const { video } = renderPlayer();
    video.currentTime = 20;
    fireEvent.keyDown(screen.getByRole('slider', { name: 'Seek' }), { key: 'ArrowRight' });
    expect(video.currentTime).toBe(20);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Play' }), { key: ' ' });
    expect(playMock).not.toHaveBeenCalled();
  });

  it('asks the browser for full screen on the player and follows fullscreenchange', () => {
    renderPlayer();
    const player = screen.getByRole('region', { name: 'Video player' });
    const request = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(player, 'requestFullscreen', { configurable: true, value: request });

    fireEvent.click(screen.getByRole('button', { name: 'Full screen' }));
    expect(request).toHaveBeenCalled();

    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => player });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    const exit = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'exitFullscreen', { configurable: true, value: exit });
    fireEvent.keyDown(player, { key: 'f' });
    expect(exit).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Exit full screen' })).toBeInTheDocument();

    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => null });
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(screen.getByRole('button', { name: 'Full screen' })).toBeInTheDocument();
  });

  it('hides the controls after a while when playing and shows them again on mouse move', () => {
    jest.useFakeTimers();
    try {
      const { container } = render(<VideoPlayer src="/a.mp4" title="A" />);
      const video = screen.getByLabelText('A');
      fireEvent.click(screen.getByRole('button', { name: 'Play' }));
      // Focus stays on the Play button: controls never hide while a control has keyboard focus
      (document.activeElement as HTMLElement).blur();
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(container.querySelector('.pt-player-controls')).toHaveClass('is-hidden');

      fireEvent.mouseMove(video);
      expect(container.querySelector('.pt-player-controls')).not.toHaveClass('is-hidden');
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not offer picture in picture, neither in its controls nor in the browser menu', () => {
    const { video } = renderPlayer();
    expect(screen.queryByRole('button', { name: /picture in picture/i })).not.toBeInTheDocument();
    expect(video).toHaveAttribute('disablepictureinpicture');
  });
});
