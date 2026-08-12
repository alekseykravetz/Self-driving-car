import type { PreviewSimulatorElement } from '../ui/organisms/previewSimulator.js';

/**
 * Landing "second screen" controller.
 *
 * Drives a hard two-page swap between the regular card grid (page 1) and the
 * full-screen Preview Simulator (page 2). A splash button fades in at the
 * bottom of page 1 once the user scrolls to the end of the grid; activating it
 * (click, wheel-down, PageDown/ArrowDown, or swipe-up) slides page 2 up. On
 * page 2 a wheel-up, swipe-down, Escape/ArrowUp, or the Back control slides it
 * back down. The landing header morphs into a compact toolbar while page 2 is
 * open (driven purely by the `preview-open` body class in CSS).
 *
 * The Preview Simulator loop only runs while page 2 is open (activate on open,
 * deactivate on close) so the landing grid stays cheap.
 */

/** Distance (px) from the bottom of page 1 that reveals the down splash. */
const BOTTOM_REVEAL_PX = 120;
/** Minimum vertical swipe (px) that counts as a page-swap gesture. */
const SWIPE_THRESHOLD_PX = 60;
/** Cooldown (ms) after a swap before another gesture can fire. */
const SWAP_COOLDOWN_MS = 700;

export function initLandingPreview(): void {
  const body = document.body;
  const previewPage = document.querySelector<HTMLElement>('.preview-page');
  const sim =
    document.querySelector<PreviewSimulatorElement>('preview-simulator');
  const downSplash = document.querySelector<HTMLElement>('.preview-splash');
  const backControls = document.querySelectorAll<HTMLElement>(
    '[data-preview-back]',
  );
  if (!previewPage || !sim || !downSplash) return;

  let open = false;
  let lastSwap = 0;

  const canSwap = (): boolean => Date.now() - lastSwap > SWAP_COOLDOWN_MS;

  const openPreview = (): void => {
    if (open) return;
    open = true;
    lastSwap = Date.now();
    body.classList.add('preview-open');
    void sim.activate();
  };

  const closePreview = (): void => {
    if (!open) return;
    open = false;
    lastSwap = Date.now();
    body.classList.remove('preview-open');
    sim.deactivate();
  };

  // Reveal the down splash near the bottom of the grid.
  const updateSplash = (): void => {
    if (open) return;
    const atBottom =
      window.innerHeight + window.scrollY >=
      document.body.scrollHeight - BOTTOM_REVEAL_PX;
    body.classList.toggle('at-bottom', atBottom);
  };
  window.addEventListener('scroll', updateSplash, { passive: true });
  window.addEventListener('resize', updateSplash);
  updateSplash();

  // Splash + back affordances.
  downSplash.addEventListener('click', openPreview);
  backControls.forEach((el) => el.addEventListener('click', closePreview));

  // Wheel: down at the bottom opens, up on page 2 closes.
  window.addEventListener(
    'wheel',
    (e) => {
      if (!canSwap()) return;
      if (open) {
        if (e.deltaY < 0) closePreview();
      } else if (e.deltaY > 0 && body.classList.contains('at-bottom')) {
        openPreview();
      }
    },
    { passive: true },
  );

  // Keyboard.
  window.addEventListener('keydown', (e) => {
    if (open) {
      if (e.key === 'Escape' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        closePreview();
      }
      return;
    }
    if (
      (e.key === 'ArrowDown' || e.key === 'PageDown') &&
      body.classList.contains('at-bottom') &&
      canSwap()
    ) {
      openPreview();
    }
  });

  // Touch: swipe up at the bottom opens, swipe down on page 2 closes.
  let touchStartY = 0;
  window.addEventListener(
    'touchstart',
    (e) => (touchStartY = e.touches[0]?.clientY ?? 0),
    { passive: true },
  );
  window.addEventListener(
    'touchend',
    (e) => {
      if (!canSwap()) return;
      const endY = e.changedTouches[0]?.clientY ?? touchStartY;
      const dy = endY - touchStartY;
      if (open) {
        if (dy > SWIPE_THRESHOLD_PX) closePreview();
      } else if (
        dy < -SWIPE_THRESHOLD_PX &&
        body.classList.contains('at-bottom')
      ) {
        openPreview();
      }
    },
    { passive: true },
  );
}
