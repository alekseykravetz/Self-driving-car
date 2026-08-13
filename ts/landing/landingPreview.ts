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
 * programmatic slide. The header remains unchanged throughout the sequence,
 * and the page disables scroll anchoring (CSS) for stable layout geometry.
 */

/** Fraction of a viewport of scroll each reveal gate consumes. */
const REVEAL_FRAC = 0.3;

/** Distance the pill travels from outside the viewport into its resting spot. */
const PILL_TRAVEL_PX = 240;

/** Duration (ms) of the programmatic page slide — longer = gentler glide. */
const SLIDE_MS = 1600;

/** The page-1 → page-2 card slide gets extra time so it doesn't feel rushed
 * (the up-slide already glides all the way to the top, so it reads longer). */
const DOWN_SLIDE_MS = 2600;

/** How long the fully-revealed pill lingers before the page auto-slides. */
const DWELL_MS = 850;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

/** Ease-out so the pill rushes most of the way into view early in the reveal. */
const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/** Springy ease-out that overshoots then settles — gives the card a bump.
 * A gentle back constant keeps the overshoot to a small sliver (~3%). */
const easeOutBack = (t: number): number => {
  const c1 = 0.9;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

export function initLandingPreview(): void {
  const header = document.querySelector<HTMLElement>('.landing-header');
  const track = document.querySelector<HTMLElement>('.preview-track');
  const scene = document.querySelector<HTMLElement>('.preview-scene');
  const splash = document.querySelector<HTMLElement>('.preview-splash');
  const label = document.querySelector<HTMLElement>('.preview-splash-label');
  const sim =
    document.querySelector<PreviewSimulatorElement>('preview-simulator');
  if (!header || !track || !scene || !splash || !sim) return;

  let ticking = false;
  let running = false;
  let locked = false; // suppress auto-slide re-triggers during a programmatic scroll
  let dwelling = false; // holding the fully-revealed pill before an auto-slide
  let unlockTimer = 0;
  let dwellTimer = 0;
  let slideRaf = 0;
  let lastY = window.scrollY;
  let lastHeaderH = -1;
  let lastFromTop: boolean | null = null;
  let lastSlide = 0; // previous card-slide fraction (for entry-only bump)

  // Current scroll position inside the gate/slide coordinate (0 = page 1).
  const measureScrolled = (): number => {
    const vh2 = window.innerHeight;
    const H2 = track.offsetHeight;
    const top2 = track.getBoundingClientRect().top;
    const raw2 = Math.min(Math.max(vh2 - top2, 0), H2);
    return raw2;
  };

  // Custom scroll animation so the slide duration is explicit (native smooth
  // scroll gives no control) and gentle both ways.
  const glideTo = (targetY: number, duration = SLIDE_MS): void => {
    const startY = window.scrollY;
    const dist = targetY - startY;
    if (Math.abs(dist) < 1) return;
    const start = performance.now();
    cancelAnimationFrame(slideRaf);
    const step = (now: number): void => {
      const t = clamp01((now - start) / duration);
      window.scrollTo(0, startY + dist * easeInOutQuad(t));
      if (t < 1) slideRaf = requestAnimationFrame(step);
      else locked = false;
    };
    slideRaf = requestAnimationFrame(step);
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
    window.clearTimeout(unlockTimer);
    unlockTimer = window.setTimeout(() => (locked = false), duration + 400);
  };

  const apply = (): void => {
    ticking = false;
    const vh = window.innerHeight;
    const y = window.scrollY;
    const dir = y - lastY; // >0 scrolling down
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
    // On the way IN (slide growing) a springy ease overshoots slightly so the
    // card lands with a bump; on the way OUT it stays linear so the smooth
    // page-2 → page-1 exit is undisturbed.
    const entering = slide >= lastSlide;
    const springSlide = entering && slide < 1 ? easeOutBack(slide) : slide;
    lastSlide = slide;
    scene.style.transform = `translateY(${(1 - springSlide) * 100}%)`;

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

  const onScroll = (): void => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(apply);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  apply();
}
