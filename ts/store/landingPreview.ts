import type { PreviewSimulatorElement } from '../ui/organisms/previewSimulator.js';

/**
 * Landing scroll-transition controller.
 *
 * One continuous scroll for the whole page. After the card grid comes a short
 * "gap" section: as the user keeps scrolling, a splash rises from the bottom
 * (its reveal tied directly to scroll progress through the gap). Once the
 * splash is fully revealed a single smooth slide (one viewport tall) carries
 * the view down onto the big live-preview card. Scrolling back up mirrors it —
 * a full slide up to the splash, then the reveal reverses back into the grid.
 *
 * The Preview Simulator loop only runs while its card is on screen
 * (activate/deactivate driven by an IntersectionObserver).
 */

/** ms after a programmatic slide during which triggers are suppressed. */
const SLIDE_LOCK_MS = 750;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export function initLandingPreview(): void {
  const gap = document.querySelector<HTMLElement>('.preview-gap');
  const scene = document.querySelector<HTMLElement>('.preview-scene');
  const splash = document.querySelector<HTMLElement>('.preview-splash');
  const sim =
    document.querySelector<PreviewSimulatorElement>('preview-simulator');
  if (!gap || !scene || !splash || !sim) return;

  let locked = false;
  let lastY = window.scrollY;
  let ticking = false;

  const lock = (): void => {
    locked = true;
    window.setTimeout(() => (locked = false), SLIDE_LOCK_MS);
  };

  const slideTo = (docY: number): void => {
    lock();
    window.scrollTo({ top: docY, behavior: 'smooth' });
  };

  const apply = (): void => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const dir = y - lastY; // >0 scrolling down
    lastY = y;

    const gapRect = gap.getBoundingClientRect();
    const sceneRect = scene.getBoundingClientRect();
    const gapTopDoc = gapRect.top + y;
    const sceneTopDoc = sceneRect.top + y;
    const span = Math.max(1, sceneTopDoc - gapTopDoc); // gap height in px

    // reveal: 0 as the gap first peeks in at the bottom, 1 once fully scrolled
    // through — at which point the scene's top sits exactly at the viewport
    // bottom, ready for a one-viewport slide.
    const reveal = clamp01((y - (gapTopDoc - vh)) / span);
    // sceneFill: 0 when the scene top is at the viewport bottom, 1 when it
    // reaches the top (the card fills the screen).
    const sceneFill = clamp01((y - (sceneTopDoc - vh)) / vh);

    // Splash rises with the reveal, then fades as the scene slides over it.
    const opacity = clamp01(reveal - sceneFill);
    splash.style.opacity = String(opacity);
    splash.style.transform = `translate(-50%, ${(1 - reveal) * 48}px)`;
    splash.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible';

    if (locked) return;

    // Reveal complete → full slide down onto the card.
    if (dir > 0 && reveal >= 0.999 && sceneFill < 0.02) {
      slideTo(sceneTopDoc);
    } else if (dir < 0 && sceneFill >= 0.999) {
      // Leaving the card upward → full slide up to the fully-revealed splash.
      slideTo(sceneTopDoc - vh);
    }
  };

  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  apply();

  // Run the sim only while its card is visible.
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        scene.classList.toggle('preview-active', entry.isIntersecting);
        if (entry.isIntersecting) void sim.activate();
        else sim.deactivate();
      }
    },
    { threshold: 0.15 },
  );
  io.observe(scene);
}
