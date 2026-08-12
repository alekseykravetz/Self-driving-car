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
const REVEAL_FRAC = 0.25;

/** Fraction of a viewport spent collapsing the header before the pill sequence. */
const HEADER_PHASE_FRAC = 0.1;

/** Duration (ms) of the programmatic page slide — longer = gentler glide. */
const SLIDE_MS = 1600;

/** How long the fully-revealed pill lingers before the page auto-slides. */
const DWELL_MS = 750;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

export function initLandingPreview(): void {
  const header = document.querySelector<HTMLElement>('.landing-header');
  const grid = document.querySelector<HTMLElement>('.landing-sections');
  const track = document.querySelector<HTMLElement>('.preview-track');
  const scene = document.querySelector<HTMLElement>('.preview-scene');
  const splash = document.querySelector<HTMLElement>('.preview-splash');
  const label = document.querySelector<HTMLElement>('.preview-splash-label');
  const sim =
    document.querySelector<PreviewSimulatorElement>('preview-simulator');
  if (!header || !grid || !track || !scene || !splash || !sim) return;

  let ticking = false;
  let running = false;
  let locked = false; // suppress auto-slide re-triggers during a programmatic scroll
  let dwelling = false; // holding the fully-revealed pill before an auto-slide
  let unlockTimer = 0;
  let dwellTimer = 0;
  let slideRaf = 0;
  let lastY = window.scrollY;
  let lastHeaderH = -1;
  let lastGridPin = Number.NaN;
  let lastFromTop: boolean | null = null;

  // Current scroll position inside the gate/slide coordinate (0 = page 1).
  const measureScrolled = (): number => {
    const vh2 = window.innerHeight;
    const H2 = track.offsetHeight;
    const P2 = HEADER_PHASE_FRAC * vh2;
    const top2 = track.getBoundingClientRect().top;
    const raw2 = Math.min(Math.max(vh2 - top2, 0), H2);
    return Math.max(0, raw2 - P2);
  };

  // Custom scroll animation so the slide duration is explicit (native smooth
  // scroll gives no control) and gentle both ways.
  const glideTo = (targetY: number): void => {
    const startY = window.scrollY;
    const dist = targetY - startY;
    if (Math.abs(dist) < 1) return;
    const start = performance.now();
    cancelAnimationFrame(slideRaf);
    const step = (now: number): void => {
      const t = clamp01((now - start) / SLIDE_MS);
      window.scrollTo(0, startY + dist * easeInOutQuad(t));
      if (t < 1) slideRaf = requestAnimationFrame(step);
      else locked = false;
    };
    slideRaf = requestAnimationFrame(step);
  };

  const snapTo = (targetScrolled: number, scrolled: number): void => {
    locked = true;
    glideTo(window.scrollY + (targetScrolled - scrolled));
    window.clearTimeout(unlockTimer);
    unlockTimer = window.setTimeout(() => (locked = false), SLIDE_MS + 400);
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

    // Scroll consumed within the pinned track. A leading header-phase budget
    // (P) is spent only collapsing the header, then the gate/slide zones:
    //   [0, P]        header phase        (page 1, header collapses, no pill)
    //   [P, P+r]      bottom reveal gate  (page 1 frozen, pill from bottom)
    //   [.., H-r]     slide zone          (card slides; auto-snapped)
    //   [H-r, H]      top reveal gate     (page 2 frozen, pill from top)
    const H = track.offsetHeight;
    const P = HEADER_PHASE_FRAC * vh;
    const usable = Math.max(1, H - P);
    const r = REVEAL_FRAC * vh;
    const trackTop = track.getBoundingClientRect().top;
    const raw = Math.min(Math.max(vh - trackTop, 0), H);
    const scrolled = Math.max(0, raw - P); // 0 throughout the header phase
    const slide = clamp01((scrolled - r) / Math.max(1, usable - 2 * r));

    // Which pill (if any) is revealing, and how far.
    let pill = 0;
    let fromTop = false;
    if (scrolled < r)
      pill = scrolled / r; // bottom gate
    else if (scrolled > usable - r) {
      pill = (usable - scrolled) / r; // top gate
      fromTop = true;
    }
    if (locked) pill = 0; // hide during the programmatic slide
    if (dwelling) pill = 1; // keep it fully shown while it lingers
    if (y < 24) pill = 0; // never reveal at rest, whatever the grid height

    // Slide the pill in from just off the screen edge — opacity stays constant
    // (only the glow animates), so it “pops” from the very bottom / very top.
    const rise = (1 - pill) * 180;
    splash.style.opacity = '1';
    splash.style.visibility = pill <= 0.001 ? 'hidden' : 'visible';
    if (fromTop) {
      splash.style.top = 'calc(var(--header-h, 0px) + var(--space-4))';
      splash.style.bottom = 'auto';
      splash.style.transform = `translate(-50%, ${-rise}px)`;
    } else {
      splash.style.top = 'auto';
      splash.style.bottom = 'var(--space-7)';
      splash.style.transform = `translate(-50%, ${rise}px)`;
    }
    // Swap label + chevron direction depending on which way the pill leads.
    if (fromTop !== lastFromTop) {
      if (label)
        label.textContent = fromTop ? 'Back to main' : 'Watch them drive';
      splash.classList.toggle('is-from-top', fromTop);
      lastFromTop = fromTop;
    }
    splash.classList.toggle('is-active', pill >= 0.9 && (!locked || dwelling));

    // Card slides up from below into place (tracks scroll, incl. auto-scroll).
    scene.style.transform = `translateY(${(1 - slide) * 100}%)`;

    // Once page 2 fully covers the viewport, hide page 1 so the transparent
    // scene reveals the body's fixed glow backdrop (stationary) instead of the
    // page-1 cards bleeding through.
    document.body.classList.toggle('preview-page2', slide >= 0.99);

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

    // Auto-slide: never rest inside the slide zone. When a pill is fully
    // revealed, let it linger (dwell) so it reads before the page glides.
    if (locked && (scrolled <= 2 || scrolled >= usable - 2)) locked = false;
    if (!locked && !dwelling) {
      const inSlide = scrolled > r && scrolled < usable - r;
      if (inSlide) {
        const goDown = dir > 0 || (dir === 0 && scrolled >= usable / 2);
        snapTo(goDown ? usable : 0, scrolled);
      } else if (pill >= 0.9) {
        // Settle on the fully-shown pill, then advance in its lead direction.
        dwelling = true;
        const gateRest = fromTop ? usable - r : r;
        const goDown = !fromTop;
        snapTo(gateRest, scrolled);
        window.clearTimeout(dwellTimer);
        dwellTimer = window.setTimeout(() => {
          dwelling = false;
          snapTo(goDown ? usable : 0, measureScrolled());
        }, DWELL_MS);
      }
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
