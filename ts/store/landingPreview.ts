import type { PreviewSimulatorElement } from '../ui/organisms/previewSimulator.js';

/**
 * Landing scroll-transition controller.
 *
 * A pinned, symmetric reveal + auto-slide sequence:
 *   - Bottom gate (leaving page 1, scrolling down): the grid freezes and the
 *     "Watch them drive" pill rises from the bottom; once revealed a smooth
 *     programmatic scroll slides the live-preview card fully in.
 *   - Top gate (leaving page 2, scrolling up): the card freezes and the pill
 *     drops in from the top; once revealed a smooth scroll takes you back to
 *     page 1. Same three beats, mirrored.
 *
 * The slide zone between the two gates never rests half-way — it snaps to
 * whichever page you're heading toward. The pill is hidden during the
 * programmatic slide. Header slimming uses hysteresis and the page disables
 * scroll anchoring (CSS) so header height changes don't shake the layout.
 */

/** Fraction of a viewport of scroll each reveal gate consumes. */
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

    // Scroll consumed within the pinned track, split into three zones:
    //   [0, r]      bottom reveal gate  (page 1 frozen, pill from bottom)
    //   [r, H-r]    slide zone          (card slides; auto-snapped)
    //   [H-r, H]    top reveal gate     (page 2 frozen, pill from top)
    const H = track.offsetHeight;
    const r = REVEAL_FRAC * vh;
    const trackTop = track.getBoundingClientRect().top;
    const scrolled = Math.min(Math.max(vh - trackTop, 0), H);
    const slide = clamp01((scrolled - r) / Math.max(1, H - 2 * r));

    // Which pill (if any) is revealing, and how far.
    let pill = 0;
    let fromTop = false;
    if (scrolled < r)
      pill = scrolled / r; // bottom gate
    else if (scrolled > H - r) {
      pill = (H - scrolled) / r; // top gate
      fromTop = true;
    }
    if (locked) pill = 0; // hide during the programmatic slide

    const rise = (1 - pill) * 64;
    splash.style.opacity = String(pill);
    splash.style.visibility = pill <= 0.001 ? 'hidden' : 'visible';
    if (fromTop) {
      splash.style.top = '16vh';
      splash.style.bottom = 'auto';
      splash.style.transform = `translate(-50%, ${-rise}px)`;
    } else {
      splash.style.top = 'auto';
      splash.style.bottom = '16vh';
      splash.style.transform = `translate(-50%, ${rise}px)`;
    }
    splash.classList.toggle('is-active', pill >= 0.95 && !locked);

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

    // Auto-slide: never rest inside the slide zone — snap to page 1 or 2
    // depending on the scroll direction. Release the lock at either end.
    if (locked && (scrolled <= 2 || scrolled >= H - 2)) locked = false;
    if (!locked && scrolled > r && scrolled < H - r) {
      const goDown = dir > 0 || (dir === 0 && scrolled >= H / 2);
      snapTo(goDown ? H : 0, scrolled);
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
