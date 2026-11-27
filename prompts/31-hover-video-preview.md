# Video hover preview on catalog cards

**Approved on:** pending (PR for ticket #33)
**Approved by:** pending team review
**Used for:** implementing a muted video preview when hovering catalog cards (VideoCard), with delay, single-preview coordination, reduced-motion/hover device detection, error fallback, and comprehensive Jest unit tests.

## Prompt

```
Preview videos when hovering a catalog card (<Component>).
1. After 400 ms hovering, play the video muted and without controls over the thumbnail (preload="none", from the
   start); on leave, pause and show the thumbnail again. Only one preview plays at a time.
2. Only on devices with hover (matchMedia "(hover: hover)") and not with prefers-reduced-motion. If the video
   fails to load, keep the thumbnail.
3. Tests: Jest with mocked play/pause and fake timers (delay, leave before delay, reduced motion, no hover).
```

## Notes

- Tool/model: Gemini 2.5 Flash / Google Antigravity.
- Preview coordination: Implemented `previewCoordinator` singleton pattern in `src/utils/preview.ts` so that starting a preview automatically pauses any other playing preview across cards.
- Media query detection: Uses `window.matchMedia('(hover: hover)')` and `window.matchMedia('(prefers-reduced-motion: reduce)')`.
- Accessibility: `<video>` element is rendered with `tabIndex={-1}`, `aria-hidden="true"`, and without controls to avoid duplicate screen-reader announcements or interrupting keyboard navigation.
- Tested scenarios: hover delay (399 ms vs 400 ms), mouse leave before delay, mouse leave after delay, reduced motion preference, non-hover devices, single preview coordination across multiple cards, and error loading fallback.














