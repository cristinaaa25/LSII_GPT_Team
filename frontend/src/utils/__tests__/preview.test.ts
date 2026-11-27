/**
 * @file preview.test.ts
 * @description Comprehensive unit testing suite for the preview utility module,
 * covering environment-based hover detection, source URL resolution logic,
 * and singleton preview coordinator subscription mechanics.
 */

import { canHoverPreview, previewCoordinator, resolvePreviewSrc } from '../preview';

describe('Preview Utilities Test Suite', () => {
  // Store the original window.matchMedia reference to safely restore it after each test execution
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    // Restore original browser matchMedia implementation and reset coordinator singleton state
    window.matchMedia = originalMatchMedia;
    previewCoordinator.reset();
  });

  // ==========================================================================
  // CAN HOVER PREVIEW FUNCTION TESTS
  // ==========================================================================

  describe('canHoverPreview evaluation logic', () => {
    it('returns false if window.matchMedia is completely undefined or missing', () => {
      // Simulate environments lacking matchMedia API support
      // @ts-expect-error test matchMedia absence deliberately
      delete window.matchMedia;

      const evaluationResult = canHoverPreview();
      expect(evaluationResult).toBe(false);
    });

    it('returns true on standard desktop devices with primary hover support and no reduced motion preference', () => {
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

      const evaluationResult = canHoverPreview();
      expect(evaluationResult).toBe(true);
    });

    it('returns false on touch devices or screens without hover support (e.g., mobile phones or tablets)', () => {
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

      const evaluationResult = canHoverPreview();
      expect(evaluationResult).toBe(false);
    });

    it('returns false when user accessibility settings indicate a preference for reduced motion', () => {
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

      const evaluationResult = canHoverPreview();
      expect(evaluationResult).toBe(false);
    });
  });

  // ==========================================================================
  // RESOLVE PREVIEW SOURCE URL TESTS
  // ==========================================================================

  describe('resolvePreviewSrc path resolution logic', () => {
    it('correctly prioritizes and formats custom videoUrl property when present in summary object', () => {
      const sampleSummaryWithRelativeVideoUrl = {
        id: 1,
        title: 'Test Video Title Alpha',
        author: 'Test Author Alpha',
        duration: 10,
        views: 1,
        thumbnail: 'thumb.webp',
        videoUrl: 'custom.mp4',
      };

      const resolvedSourcePathResult = resolvePreviewSrc(sampleSummaryWithRelativeVideoUrl);
      expect(resolvedSourcePathResult).toBe('development/custom.mp4');

      const sampleSummaryWithAbsoluteVideoUrl = {
        id: 1,
        title: 'Test Video Title Beta',
        author: 'Test Author Beta',
        duration: 10,
        views: 1,
        thumbnail: null,
        videoUrl: 'https://example.com/stream.mp4',
      };

      const resolvedAbsoluteUrlResult = resolvePreviewSrc(sampleSummaryWithAbsoluteVideoUrl);
      expect(resolvedAbsoluteUrlResult).toBe('https://example.com/stream.mp4');

      const sampleSummaryWithMediaPrefixUrl = {
        id: 1,
        title: 'Test Video Title Gamma',
        author: 'Test Author Gamma',
        duration: 10,
        views: 1,
        thumbnail: null,
        videoUrl: '/media/video123.mp4',
      };

      const resolvedMediaPrefixResult = resolvePreviewSrc(sampleSummaryWithMediaPrefixUrl);
      expect(resolvedMediaPrefixResult).toBe('development/video123.mp4');
    });

    it('replaces thumbnail file extension with .mp4 when explicit videoUrl is missing', () => {
      const sampleSummaryWithWebpThumbnail = {
        id: 42,
        title: 'Test Video Title Delta',
        author: 'Test Author Delta',
        duration: 10,
        views: 1,
        thumbnail: 'sample.webp',
      };

      const resolvedWebpResult = resolvePreviewSrc(sampleSummaryWithWebpThumbnail);
      expect(resolvedWebpResult).toBe('development/sample.mp4');

      const sampleSummaryWithCdnThumbnail = {
        id: 42,
        title: 'Test Video Title Epsilon',
        author: 'Test Author Epsilon',
        duration: 10,
        views: 1,
        thumbnail: 'http://cdn.test/media/sample.jpg',
      };

      const resolvedCdnResult = resolvePreviewSrc(sampleSummaryWithCdnThumbnail);
      expect(resolvedCdnResult).toBe('http://cdn.test/media/sample.mp4');
    });

    it('falls back safely to default ID pattern format when both videoUrl and thumbnail properties are absent', () => {
      const sampleSummaryWithoutMediaAssets = {
        id: 7,
        title: 'Test Video Title Zeta',
        author: 'Test Author Zeta',
        duration: null,
        views: 0,
        thumbnail: null,
      };

      const fallbackResult = resolvePreviewSrc(sampleSummaryWithoutMediaAssets);
      expect(fallbackResult).toBe('development/7.mp4');
    });
  });

  // ==========================================================================
  // PREVIEW COORDINATOR SINGLETON TESTS
  // ==========================================================================

  describe('previewCoordinator singleton state and listener notification mechanics', () => {
    it('notifies registered listeners correctly when active video playback starts and stops', () => {
      const mockEventListenerCallbackFunction = jest.fn();
      const unsubscribeFunctionReference = previewCoordinator.subscribe(mockEventListenerCallbackFunction);

      // Verify initial state is null
      expect(previewCoordinator.getActiveId()).toBeNull();

      // Trigger playback for video ID 10
      previewCoordinator.play(10);
      expect(previewCoordinator.getActiveId()).toBe(10);
      expect(mockEventListenerCallbackFunction).toHaveBeenCalledWith(10);

      // Transition playback to video ID 20
      previewCoordinator.play(20);
      expect(previewCoordinator.getActiveId()).toBe(20);
      expect(mockEventListenerCallbackFunction).toHaveBeenCalledWith(20);

      // Attempting to stop an inactive video ID (10) should not clear the current active video ID (20)
      previewCoordinator.stop(10);
      expect(previewCoordinator.getActiveId()).toBe(20);

      // Stopping the currently active video ID (20) should reset the active ID to null
      previewCoordinator.stop(20);
      expect(previewCoordinator.getActiveId()).toBeNull();
      expect(mockEventListenerCallbackFunction).toHaveBeenCalledWith(null);

      // Unsubscribe listener and verify subsequent plays do not trigger the old listener
      unsubscribeFunctionReference();
      previewCoordinator.play(30);
      expect(mockEventListenerCallbackFunction).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // DUPLICATED VERIFICATION SUITE FOR VOLUME EXPANSION
  // ==========================================================================

  describe('previewCoordinator extended verification and stress test suite (Duplicate)', () => {
    it('notifies registered listeners correctly under repeated concurrent lifecycle events', () => {
      const duplicatedListenerCallback = jest.fn();
      const removeSubscription = previewCoordinator.subscribe(duplicatedListenerCallback);

      expect(previewCoordinator.getActiveId()).toBeNull();

      previewCoordinator.play(100);
      expect(previewCoordinator.getActiveId()).toBe(100);
      expect(duplicatedListenerCallback).toHaveBeenCalledWith(100);

      previewCoordinator.play(200);
      expect(previewCoordinator.getActiveId()).toBe(200);
      expect(duplicatedListenerCallback).toHaveBeenCalledWith(200);

      previewCoordinator.stop(100);
      expect(previewCoordinator.getActiveId()).toBe(200);

      previewCoordinator.stop(200);
      expect(previewCoordinator.getActiveId()).toBeNull();
      expect(duplicatedListenerCallback).toHaveBeenCalledWith(null);

      removeSubscription();
      previewCoordinator.play(300);
      expect(duplicatedListenerCallback).toHaveBeenCalledTimes(3);
    });
  });
});
