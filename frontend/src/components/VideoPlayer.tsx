import React, { useCallback, useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import { formatPlayerTime, PLAYBACK_RATES } from '../utils/player';

interface Props {
  src: string;
  poster?: string;
  /** Accessible name of the <video> element (the video title). */
  title: string;
  autoPlay?: boolean;
  /** Called on every "play" event of the video element (VideoDetailPage registers the view). */
  onPlay?: () => void;
}

const HIDE_AFTER_MS = 2500;
const SEEK_STEP = 5;
const VOLUME_STEP = 0.1;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Keys typed into text fields must never control the player. */
const isTextField = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA') return true;
  return target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'range';
};

/**
 * Themed video player: the real <video> element plus custom controls drawn with the theme tokens.
 * The native controls stay on until React has mounted the custom ones, so the video still plays without JS.
 */
const VideoPlayer: React.FC<Props> = ({ src, poster, title, autoPlay = false, onPlay }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [enhanced, setEnhanced] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [active, setActive] = useState(true);
  const [focusInControls, setFocusInControls] = useState(false);

  useEffect(() => {
    setEnhanced(true);
  }, []);

  // A new video starts from scratch
  useEffect(() => {
    setStarted(false);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
  }, [src]);

  // Show the controls on activity, hide them again while playing after a short idle time
  const wakeControls = useCallback(() => {
    setActive(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setActive(false), HIDE_AFTER_MS);
  }, []);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!speedOpen) return;
    const onDocClick = (event: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) setSpeedOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [speedOpen]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      const result = video.play();
      // Browsers reject play() when autoplay is blocked; the user can simply press Play again
      if (result && typeof result.catch === 'function') result.catch(() => undefined);
    } else {
      video.pause();
    }
    wakeControls();
  }, [wakeControls]);

  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      const end = Number.isFinite(video.duration) ? video.duration : duration;
      video.currentTime = clamp(time, 0, end || 0);
      setCurrentTime(video.currentTime);
      wakeControls();
    },
    [duration, wakeControls]
  );

  const changeVolume = useCallback(
    (value: number) => {
      const video = videoRef.current;
      if (!video) return;
      const next = clamp(Math.round(value * 100) / 100, 0, 1);
      video.volume = next;
      video.muted = next === 0;
      setVolume(next);
      setMuted(next === 0);
      wakeControls();
    },
    [wakeControls]
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    // Unmuting at volume 0 would stay silent: bring it back to a sensible level
    if (!nextMuted && video.volume === 0) {
      video.volume = 0.5;
      setVolume(0.5);
    }
    setMuted(nextMuted);
    wakeControls();
  }, [wakeControls]);

  const changeRate = (value: number) => {
    const video = videoRef.current;
    if (video) video.playbackRate = value;
    setRate(value);
    setSpeedOpen(false);
  };

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
    } else if (container.requestFullscreen) {
      void container.requestFullscreen().catch(() => undefined);
    }
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isTextField(event.target)) return;
    const target = event.target as HTMLElement;
    const onButton = target.tagName === 'BUTTON';
    const onRange = target.tagName === 'INPUT';
    const video = videoRef.current;
    if (!video) return;

    switch (event.key) {
      case ' ':
      case 'k':
      case 'K':
        // Space on a focused button already "clicks" it
        if (event.key === ' ' && onButton) return;
        event.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        if (onRange) return; // the slider handles its own arrows
        event.preventDefault();
        seekTo(video.currentTime + (event.key === 'ArrowRight' ? SEEK_STEP : -SEEK_STEP));
        break;
      case 'ArrowUp':
      case 'ArrowDown':
        if (onRange) return;
        event.preventDefault();
        changeVolume((video.muted ? 0 : video.volume) + (event.key === 'ArrowUp' ? VOLUME_STEP : -VOLUME_STEP));
        break;
      case 'm':
      case 'M':
        event.preventDefault();
        toggleMute();
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        toggleFullscreen();
        break;
      case 'Escape':
        if (speedOpen) {
          event.preventDefault();
          setSpeedOpen(false);
        }
        break;
      default:
    }
  };

  const updateBuffered = () => {
    const video = videoRef.current;
    if (video && video.buffered && video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1));
    }
  };

  const showControls = !playing || active || focusInControls || speedOpen;
  const playedPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;
  const volumePct = (muted ? 0 : volume) * 100;
  const timeText = `${formatPlayerTime(currentTime)} / ${formatPlayerTime(duration)}`;

  return (
    <div
      ref={containerRef}
      className={`pt-player shadow-sm mb-3${showControls ? '' : ' pt-player-idle'}`}
      role="region"
      aria-label="Video player"
      // Focusable so the keyboard shortcuts work after clicking the video
      tabIndex={enhanced ? 0 : -1}
      onKeyDown={enhanced ? handleKeyDown : undefined}
      onMouseMove={enhanced ? wakeControls : undefined}
      onTouchStart={enhanced ? wakeControls : undefined}
      onMouseLeave={enhanced && playing ? () => setActive(false) : undefined}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        aria-label={title}
        autoPlay={autoPlay}
        controls={!enhanced}
        // No picture-in-picture: not offered by our controls nor by the browser's own menu
        disablePictureInPicture
        playsInline
        onClick={enhanced ? togglePlay : undefined}
        onPlay={() => {
          setPlaying(true);
          setStarted(true);
          wakeControls();
          onPlay?.();
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0);
          updateBuffered();
        }}
        onDurationChange={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
        onProgress={updateBuffered}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
        }}
        onRateChange={(e) => setRate(e.currentTarget.playbackRate)}
      >
        Your browser does not support HTML5 video playback.
      </video>

      {enhanced && !started && !playing && (
        // Big centred play button before the first play; the bar's Play button is the accessible one
        <button type="button" className="pt-player-bigplay" onClick={togglePlay} tabIndex={-1} aria-hidden="true">
          <Icon name="play" filled />
        </button>
      )}

      {enhanced && (
        <div
          ref={controlsRef}
          className={`pt-player-controls${showControls ? '' : ' is-hidden'}`}
          onFocus={() => setFocusInControls(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusInControls(false);
          }}
        >
          <input
            type="range"
            className="pt-range pt-range-seek"
            aria-label="Seek"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            aria-valuetext={`${formatPlayerTime(currentTime)} of ${formatPlayerTime(duration)}`}
            onChange={(e) => seekTo(Number(e.target.value))}
            style={{ '--played': `${playedPct}%`, '--buffered': `${bufferedPct}%` } as React.CSSProperties}
          />

          <div className="pt-player-row">
            <button
              type="button"
              className="pt-player-btn"
              aria-label={playing ? 'Pause' : 'Play'}
              title={playing ? 'Pause (k)' : 'Play (k)'}
              onClick={togglePlay}
            >
              <Icon name={playing ? 'pause' : 'play'} filled />
            </button>

            <div className="pt-player-volume">
              <button
                type="button"
                className="pt-player-btn"
                aria-label={muted ? 'Unmute' : 'Mute'}
                title={muted ? 'Unmute (m)' : 'Mute (m)'}
                onClick={toggleMute}
              >
                <Icon name={muted || volume === 0 ? 'volume-off' : 'volume'} />
              </button>
              <input
                type="range"
                className="pt-range pt-range-volume"
                aria-label="Volume"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                aria-valuetext={`${Math.round(volumePct)}%`}
                onChange={(e) => changeVolume(Number(e.target.value))}
                style={{ '--played': `${volumePct}%`, '--buffered': '0%' } as React.CSSProperties}
              />
            </div>

            <span className="pt-player-time" aria-live="off">
              {timeText}
            </span>

            <span className="flex-grow-1" />

            <div className="position-relative">
              <button
                type="button"
                className="pt-player-btn pt-player-speed"
                aria-label="Playback speed"
                aria-haspopup="menu"
                aria-expanded={speedOpen}
                title="Playback speed"
                onClick={() => setSpeedOpen((open) => !open)}
              >
                {rate}x
              </button>
              {speedOpen && (
                <div className="pt-player-menu" role="menu" aria-label="Playback speed">
                  {PLAYBACK_RATES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={rate === value}
                      className={`pt-player-menu-item${rate === value ? ' is-active' : ''}`}
                      onClick={() => changeRate(value)}
                    >
                      {value === 1 ? 'Normal' : `${value}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="pt-player-btn"
              aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
              title={fullscreen ? 'Exit full screen (f)' : 'Full screen (f)'}
              onClick={toggleFullscreen}
            >
              <Icon name={fullscreen ? 'minimize' : 'maximize'} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
