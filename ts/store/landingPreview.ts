import type { PreviewSimulatorElement } from '../ui/organisms/previewSimulator.js';

/**
 * Landing scroll-transition controller.
 *
 * A pinned reveal + auto-slide sequence, linked to scroll (symmetric both
 * ways):
 *   - Page 1 scrolls normally, then freezes (the grid is pinned) showing its
 *     bottom — so it stays visible behind the transition.
 *   - Reveal: the "Watch them drive" pill rises over the frozen grid (half a
 *     screen of scroll) and plays a one-shot activation flourish once shown.
 *   - Slide: the moment the user pushes past the reveal, a smooth programmatic
 *     scroll snaps the wide live-preview card fully into view (and snaps back
 *     up the same way). The card never rests half-slid.
 *
 * It also slims the sticky header (with hysteresis so it never flip-flops near
 * the top) and publishes the header height (`--header-h`) + grid pin offset
 * (`--grid-pin`). The sim loop runs only while the card is on screen.
 */

/** Fraction of a viewport of scroll that the pill reveal consumes. */
const REVEAL_FRAC = 0.5;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export function initLandingPreview(): void {
  const header = document.querySelector<HTMLElement>('.landing-header');
  const grid = document.querySelector<HTMLElement>('.landing-sections');
  const track = document.querySelector<HTMLElement>('.preview-track');
  const scene = document.querySelector<HTMLElement>('.preview-scene');
  const splash = document.querySelector<HTMLElement>('.preview-splash');
  const sim =
    document.querySelector<PreviewSimulatorElement>('preview-simulator');
  if (!header || !grid || !track || !scene || !splash || !sim) return;

  let ticking = false;
  let running = false;
  let locked = false; // suppress auto-slide re-triggers during a programmatic scroll
  let unlockTimer = 0;
  let lastY = window.scrollY;
  let lastHeaderH = -1;
  let lastGridPin = Number.NaN;

  const snapTo = (targetScrolled: number, scrolled: number): void => {
    locked = true;
    window.scrollTo({
      top: window.scrollY + (targetScrolled - scrolled),
      behavior: 'smooth',
    });
    window.clearTimeout(unlockTimer);
    unlockTimer = window.setTimeout(() => (locked = false), 1200);
  };

  const apply = (): void => {
    ticking = false;
    const vh = window.innerHeight;
    const y = window.scrollY;
    const dir = y - lastY; // >0 scrolling down
    lastY = y;

    // Slim the header, with hysteresis so it never flip-flops near the top.
    const slim = document.body.classList.contains('scrolled');
    if (!slim && y > 60) document.body.classList.add('scrolled');
    else if (slim && y < 12) document.body.classList.remove('scrolled');

    // Publish the header height + grid pin offset (only when they change).
    const headerH = Math.round(header.getBoundingClientRect().height);
    if (headerH !== lastHeaderH) {
      document.documentElement.style.setProperty('--header-h', `${headerH}px`);
      lastHeaderH = headerH;
    }
    const gridPin = Math.min(0, vh - grid.offsetHeight);
    if (gridPin !== lastGridPin) {
      document.documentElement.style.setProperty('--grid-pin', `${gridPin}px`);
      lastGridPin = gridPin;
    }

    // Scroll consumed within the pinned track.
    const H = track.offsetHeight;
    const revealPx = REVEAL_FRAC * vh;
    const trackTop = track.getBoundingClientRect().top;
    const scrolled = Math.min(Math.max(vh - trackTop, 0), H);
    const reveal = clamp01(scrolled / revealPx);
    const slide = clamp01((scrolled - revealPx) / Math.max(1, H - revealPx));

    // Pill rises + fades in during the reveal, then fades as the card slides.
    const opacity = clamp01(reveal * 1.1) * (1 - slide);
    splash.style.opacity = String(opacity);
    splash.style.transform = `translate(-50%, ${(1 - reveal) * 64}px)`;
    splash.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible';
    splash.classList.toggle('is-active', reveal >= 0.95 && slide < 0.05);

    // Card slides up from below into place (tracks scroll, incl. auto-scroll).
    scene.style.transform = `translateY(${(1 - slide) * 100}%)`;

    // Run the sim only while the card is (partly) on screen.
    const shouldRun = slide > 0.02;
    scene.classList.toggle('preview-active', shouldRun);
    if (shouldRun && !running) {
      running = true;
      void sim.activate();
    } else if (!shouldRun && running) {
      running = false;
      sim.deactivate();
    }

    // Auto-slide: never rest inside the slide zone — snap to whichever end the
    // user is heading toward. Release the lock once an end is reached.
    if (locked && (slide <= 0.02 || slide >= 0.98)) locked = false;
    if (!locked && slide > 0.02 && slide < 0.98) {
      const goDown = dir > 0 || (dir === 0 && slide >= 0.5);
      snapTo(goDown ? H : revealPx, scrolled);
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
}
