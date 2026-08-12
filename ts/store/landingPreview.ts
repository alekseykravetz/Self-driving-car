import type { PreviewSimulatorElement } from '../ui/organisms/previewSimulator.js';

/**
 * Landing scroll-transition controller.
 *
 * A pinned reveal + slide sequence, all linked to scroll (symmetric both
 * ways):
 *   - Page 1 scrolls normally, then freezes (the grid is `sticky; bottom:0`)
 *     showing its bottom — so it stays visible behind the transition.
 *   - Phase B (first screen of extra scroll): the "Watch them drive" pill
 *     rises over the frozen grid and, once fully revealed, plays a one-shot
 *     activation flourish.
 *   - Phase C (next screen of scroll): the wide live-preview card slides up
 *     to fill the screen under the sticky header.
 *
 * It also slims the sticky header once the user leaves the top and exposes the
 * header height (`--header-h`) for the card's top offset. The sim loop runs
 * only while the card is on screen.
 */

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

  const apply = (): void => {
    ticking = false;
    const vh = window.innerHeight;

    // Slim the header once past the very top, and publish its height so the
    // card can sit flush beneath it.
    document.body.classList.toggle('scrolled', window.scrollY > 24);
    document.documentElement.style.setProperty(
      '--header-h',
      `${Math.round(header.getBoundingClientRect().height)}px`,
    );
    // Pin offset that freezes the (tall) grid with its bottom at the viewport
    // bottom once fully scrolled.
    document.documentElement.style.setProperty(
      '--grid-pin',
      `${Math.min(0, vh - grid.offsetHeight)}px`,
    );

    // Scroll consumed within the pinned track: 0 → 2·vh (reveal then slide).
    const trackTop = track.getBoundingClientRect().top;
    const scrolled = Math.min(Math.max(vh - trackTop, 0), 2 * vh);
    const reveal = clamp01(scrolled / vh);
    const slide = clamp01((scrolled - vh) / vh);

    // Pill rises + fades in during the reveal, then fades as the card slides.
    const opacity = clamp01(reveal * 1.1) * (1 - slide);
    splash.style.opacity = String(opacity);
    splash.style.transform = `translate(-50%, ${(1 - reveal) * 64}px)`;
    splash.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible';
    splash.classList.toggle('is-active', reveal >= 0.95 && slide < 0.05);

    // Card slides up from below into place.
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
