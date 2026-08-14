import type { PreviewSimulatorElement } from '../ui/organisms/previewSimulator.js';

/**
 * Landing scroll-transition controller.
 *
 * A symmetric reveal + auto-slide sequence:
 *   - Bottom gate (leaving page 1, scrolling down): the "Watch them drive"
 *     pill rises from the bottom; once revealed a smooth programmatic scroll
 *     slides the live-preview card fully in.
 *   - Top gate (leaving page 2, scrolling up): the pill drops in from the top;
 *     once revealed a smooth scroll takes you back to page 1. Same three
 *     beats, mirrored.
 *
 * The slide zone between the two gates never rests half-way — it snaps to
 * whichever page you're heading toward. The pill is hidden during the
 * programmatic slide. The header remains unchanged throughout the sequence,
 * and the page disables scroll anchoring (CSS) for stable layout geometry.
 */

/** Fraction of a viewport of scroll each reveal gate consumes. */
const REVEAL_FRAC = 0.2;

/** Distance the pill travels from outside the viewport into its resting spot. */
const PILL_TRAVEL_PX = 90;

/** Duration (ms) of the programmatic page slide — longer = gentler glide. */
const SLIDE_MS = 1600;

/** The page-1 → page-2 card slide gets extra time so it doesn't feel rushed
 * (the up-slide already glides all the way to the top, so it reads longer). */
const DOWN_SLIDE_MS = 2600;

/** How long the fully-revealed pill lingers before the page auto-slides. */
const DWELL_MS = 850;

/** How long scrolling must be quiet before the controller resumes auto-slide. */
const MANUAL_IDLE_MS = 140;

/** Accounts for fractional viewport/layout rounding at either page endpoint. */
const PAGE_EDGE_EPSILON_PX = 2;

const SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'PageDown',
  'PageUp',
  'Home',
  'End',
  ' ',
]);

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

/** Ease-out so the pill rushes most of the way into view early in the reveal. */
const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

export function initLandingPreview(): void {
  const header = document.querySelector<HTMLElement>('.landing-header');
  const track = document.querySelector<HTMLElement>('.preview-track');
  const scene = document.querySelector<HTMLElement>('.preview-scene');
  const splash = document.querySelector<HTMLElement>('.preview-splash');
  const label = document.querySelector<HTMLElement>('.preview-splash-label');
  const sim =
    document.querySelector<PreviewSimulatorElement>('preview-simulator');
  if (!header || !track || !scene || !splash || !sim) return;

  let running = false;
  let locked = false; // suppress auto-slide re-triggers during a programmatic scroll
  let dwelling = false; // holding the fully-revealed pill before an auto-slide
  let dwellTimer = 0;
  let manualIdleTimer = 0;
  let manualInputActive = false;
  let frameRaf = 0;
  let inFrame = false;
  let glide: {
    startY: number;
    targetY: number;
    startedAt: number;
    duration: number;
  } | null = null;
  let lastY = window.scrollY;
  let lastDirection = 0;
  let lastHeaderH = -1;
  let lastFromTop: boolean | null = null;

  // Current scroll position inside the gate/slide coordinate (0 = page 1).
  const measureScrolled = (): number => {
    const vh2 = window.innerHeight;
    const H2 = track.offsetHeight;
    const top2 = track.getBoundingClientRect().top;
    const raw2 = Math.min(Math.max(vh2 - top2, 0), H2);
    return raw2;
  };

  // Schedule scroll-state updates and glides through one RAF loop. This keeps
  // programmatic scroll and the visual state from running on competing clocks.
  const requestFrame = (): void => {
    if (inFrame || frameRaf) return;
    frameRaf = requestAnimationFrame(runFrame);
  };

  // Custom scroll animation so the slide duration is explicit (native smooth
  // scroll gives no control) and gentle both ways.
  const glideTo = (targetY: number, duration = SLIDE_MS): void => {
    const startY = window.scrollY;
    const dist = targetY - startY;
    if (Math.abs(dist) < 1) {
      glide = null;
      locked = false;
      return;
    }
    glide = {
      startY,
      targetY,
      startedAt: performance.now(),
      duration,
    };
    requestFrame();
  };

  const snapTo = (
    targetScrolled: number,
    scrolled: number,
    duration = SLIDE_MS,
  ): void => {
    locked = true;
    // Heading back to page 1 glides all the way to the very top of the page
    // (not just the start of the gate zone), so the main page rests flush.
    const targetY =
      targetScrolled <= 0 ? 0 : window.scrollY + (targetScrolled - scrolled);
    glideTo(targetY, duration);
  };

  const cancelAutoMotion = (): void => {
    glide = null;
    locked = false;
    dwelling = false;
    window.clearTimeout(dwellTimer);
    if (frameRaf) {
      cancelAnimationFrame(frameRaf);
      frameRaf = 0;
    }
  };

  const scheduleManualSettle = (): void => {
    window.clearTimeout(manualIdleTimer);
    manualIdleTimer = window.setTimeout(() => {
      manualInputActive = false;
      requestFrame();
    }, MANUAL_IDLE_MS);
  };

  const apply = (): void => {
    const vh = window.innerHeight;
    const y = window.scrollY;
    const delta = y - lastY;
    const dir = delta === 0 ? lastDirection : delta; // >0 scrolling down
    if (delta !== 0) lastDirection = delta;
    lastY = y;

    // Publish the stable header height (only when it changes).
    const headerH = Math.round(header.getBoundingClientRect().height);
    if (headerH !== lastHeaderH) {
      document.documentElement.style.setProperty('--header-h', `${headerH}px`);
      lastHeaderH = headerH;
    }
    // Scroll consumed within the preview track. The gate/slide zones are:
    //   [0, r]        bottom reveal gate  (page 1, pill from bottom)
    //   [.., H-r]     slide zone          (card slides; auto-snapped)
    //   [H-r, H]      top reveal gate     (page 2 frozen, pill from top)
    const H = track.offsetHeight;
    const usable = Math.max(1, H);
    const r = REVEAL_FRAC * vh;
    const trackTop = track.getBoundingClientRect().top;
    const raw = Math.min(Math.max(vh - trackTop, 0), H);
    const scrolled = raw;
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
    // The browser can clamp the final scroll position a fractional pixel
    // before the track's exact endpoint. Treat that small gap as page 2 so the
    // top-gate pill does not remain visible at rest.
    if (scrolled >= usable - PAGE_EDGE_EPSILON_PX) pill = 0;
    if (locked) pill = 0; // hide during the programmatic slide
    if (dwelling) pill = 1; // keep it fully shown while it lingers
    if (y < 24) pill = 0; // never reveal at rest, whatever the grid height

    // Slide the pill in from just off the screen edge — opacity stays constant
    // (only the glow animates), so it “pops” from the very bottom / very top.
    // Ease-out the travel so it clears the screen edge (and, on the top gate,
    // the fixed header) early in the reveal instead of lingering half-hidden.
    const rise = (1 - easeOutCubic(pill)) * PILL_TRAVEL_PX;
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
    // Keep this monotonic in both directions so the page-2 card cannot bump or
    // briefly reverse while the user scrolls back to page 1.
    scene.style.transform = `translateY(${(1 - slide) * 100}%)`;

    // Keep the fixed header out of the way while page 1 moves under the
    // transition, then bring it back once page 2 has fully arrived. Opacity
    // changes do not affect the stable header geometry.
    document.body.classList.toggle('header-hidden', y >= 24 && slide < 0.99);

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
    if (!locked && !dwelling && !manualInputActive) {
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
          // The down (page-1 → page-2) card slide gets the longer duration so
          // its second half doesn't feel rushed or jumpy.
          snapTo(
            goDown ? usable : 0,
            measureScrolled(),
            goDown ? DOWN_SLIDE_MS : SLIDE_MS,
          );
        }, DWELL_MS);
      }
    }
  };

  const runFrame = (now: number): void => {
    frameRaf = 0;
    inFrame = true;

    if (glide) {
      const motion = glide;
      const t = clamp01((now - motion.startedAt) / motion.duration);
      window.scrollTo(
        0,
        motion.startY + (motion.targetY - motion.startY) * easeInOutQuad(t),
      );
      if (t >= 1) {
        glide = null;
        locked = false;
      }
    }

    apply();
    inFrame = false;
    if (glide) requestFrame();
  };

  const onScroll = (): void => {
    if (manualInputActive) scheduleManualSettle();
    requestFrame();
  };

  const onManualInput = (event: Event): void => {
    if (event.type === 'keydown') {
      const key = (event as KeyboardEvent).key;
      if (!SCROLL_KEYS.has(key)) return;
    }
    if (event.type === 'pointerdown') {
      const pointerType = (event as PointerEvent).pointerType;
      if (pointerType === 'mouse') return;
    }
    cancelAutoMotion();
    manualInputActive = true;
    scheduleManualSettle();
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('wheel', onManualInput, {
    passive: true,
    capture: true,
  });
  window.addEventListener('pointerdown', onManualInput, {
    passive: true,
    capture: true,
  });
  window.addEventListener('keydown', onManualInput, true);
  apply();
}
