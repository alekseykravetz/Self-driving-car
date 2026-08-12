import type { PreviewSimulatorElement } from '../ui/organisms/previewSimulator.js';

/**
 * Landing scroll-transition controller.
 *
 * The big live-preview card sits directly after the grid, so native CSS
 * scroll-snap handles the smooth "full slide" into and out of it (both
 * directions). This controller only fades the "Watch them drive" panel in
 * during the slide — its opacity peaks when the card is halfway on screen and
 * is gone once the card (or the grid) is settled — and runs the sim loop only
 * while the card is visible (IntersectionObserver).
 */

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export function initLandingPreview(): void {
  const scene = document.querySelector<HTMLElement>('.preview-scene');
  const splash = document.querySelector<HTMLElement>('.preview-splash');
  const sim =
    document.querySelector<PreviewSimulatorElement>('preview-simulator');
  if (!scene || !splash || !sim) return;

  let ticking = false;

  const apply = (): void => {
    ticking = false;
    const vh = window.innerHeight;
    const top = scene.getBoundingClientRect().top;

    // fill: 0 when the card's top is at the viewport bottom, 1 when it reaches
    // the top. The panel opacity is a tent peaking at the midpoint of the slide.
    const fill = clamp01((vh - top) / vh);
    const opacity = clamp01(1 - Math.abs(fill - 0.5) * 2);
    splash.style.opacity = String(opacity);
    splash.style.visibility = opacity <= 0.001 ? 'hidden' : 'visible';
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
