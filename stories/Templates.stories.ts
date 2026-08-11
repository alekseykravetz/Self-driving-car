import type { Meta, StoryObj } from '@storybook/web-components';

// The <store-panel> self-registers on import; <app-icon> is registered in
// preview.ts. The landing-card markup below mirrors index.html exactly so the
// story stays a faithful preview of the real main page.
import '../ts/ui/organisms/storePanel.js';

/**
 * Templates — full page layouts assembled from organisms. These mirror the
 * real HTML pages (`index.html`, etc.) so the composed look — grids, headers
 * and card chrome — stays in sync with production without needing the dev
 * server (unlike the iframe-based "Project Views").
 */
const meta: Meta = {
  title: 'Templates',
  parameters: { layout: 'fullscreen' },
};
export default meta;

/** The five feature cards from index.html, verbatim. */
const FEATURE_CARDS = `
  <section class="landing-card">
    <div class="card-header">
      <div class="card-icon"><app-icon name="brain" animate></app-icon></div>
      <h2>AI Training Simulators</h2>
    </div>
    <p class="card-desc">
      Evolve neural networks through neuroevolution. Watch cars learn to
      navigate roads using genetic algorithms and sensor-based perception.
    </p>
    <div class="card-links">
      <a class="card-btn" href="html/simulator.html?mode=simple">
        <span class="btn-icon"><app-icon name="road" animate label="Simple Road"></app-icon></span>
        <span><strong>Simple Road</strong><small>3-lane straight road with traffic</small></span>
      </a>
      <a class="card-btn" href="html/simulator.html">
        <span class="btn-icon"><app-icon name="globe" animate label="Full World"></app-icon></span>
        <span><strong>Full World</strong><small>Custom maps, camera view &amp; advanced training</small></span>
      </a>
    </div>
  </section>

  <section class="landing-card">
    <div class="card-header">
      <div class="card-icon"><app-icon name="graduation" animate></app-icon></div>
      <h2>Human Backpropagation</h2>
    </div>
    <p class="card-desc">
      Teach a neural network by driving. The car learns from your keypresses
      in real time via backpropagation — watch the network match your
      driving, then let it take the wheel.
    </p>
    <div class="card-links">
      <a class="card-btn" href="html/human-training.html?mode=simple">
        <span class="btn-icon"><app-icon name="road" animate label="Simple Road"></app-icon></span>
        <span><strong>Simple Road</strong><small>3-lane road, learn to dodge traffic</small></span>
      </a>
      <a class="card-btn" href="html/human-training.html">
        <span class="btn-icon"><app-icon name="globe" animate label="Full World"></app-icon></span>
        <span><strong>Full World</strong><small>Custom maps, learn to navigate roads &amp; lights</small></span>
      </a>
    </div>
  </section>

  <section class="landing-card">
    <div class="card-header">
      <div class="card-icon"><app-icon name="traffic-light" animate></app-icon></div>
      <h2>Live Traffic Jam</h2>
    </div>
    <p class="card-desc">
      Load a world and click the road to drop trained cars. Watch them drive
      themselves, weave through traffic, and crash — building your own living
      traffic jam one car at a time.
    </p>
    <div class="card-links">
      <a class="card-btn" href="html/traffic.html">
        <span class="btn-icon"><app-icon name="car" animate></app-icon></span>
        <span><strong>Open Traffic Jam</strong><small>Click to spawn self-driving cars on any map</small></span>
      </a>
    </div>
  </section>

  <section class="landing-card">
    <div class="card-header">
      <div class="card-icon"><app-icon name="flag" animate></app-icon></div>
      <h2>Games</h2>
    </div>
    <p class="card-desc">
      Race against AI opponents using keyboard, webcam markers, or phone tilt.
      Test your driving skills on custom tracks.
    </p>
    <div class="card-links">
      <a class="card-btn" href="html/race.html">
        <span class="btn-icon"><app-icon name="keyboard" animate></app-icon></span>
        <span><strong>Race</strong><small>Keyboard controls vs AI</small></span>
      </a>
      <a class="card-btn" href="html/race.html?mode=camera">
        <span class="btn-icon"><app-icon name="camera" animate></app-icon></span>
        <span><strong>Race (Camera)</strong><small>Steer with webcam markers</small></span>
      </a>
      <a class="card-btn" href="html/race.html?mode=phone">
        <span class="btn-icon"><app-icon name="phone" animate></app-icon></span>
        <span><strong>Race (Phone)</strong><small>Tilt your phone to steer</small></span>
      </a>
    </div>
  </section>

  <section class="landing-card">
    <div class="card-header">
      <div class="card-icon"><app-icon name="map" animate></app-icon></div>
      <h2>World Editor</h2>
    </div>
    <p class="card-desc">
      Design custom road networks, place buildings, trees, traffic lights, and
      more. Import real-world maps from OpenStreetMap.
    </p>
    <div class="card-links">
      <a class="card-btn" href="html/world.html">
        <span class="btn-icon"><app-icon name="edit" animate></app-icon></span>
        <span><strong>Open Editor</strong><small>Create and edit worlds</small></span>
      </a>
      <a class="card-btn" href="html/world.html?import=osm">
        <span class="btn-icon"><app-icon name="map" animate></app-icon></span>
        <span><strong>Import from OpenStreetMap</strong><small>Build a world from real map data</small></span>
      </a>
    </div>
  </section>
`;

const LANDING_HEADER = `
  <header class="landing-header">
    <h1 class="landing-title">
      <img class="landing-logo" src="/assets/logo.svg" alt="Self‑Driving Car Simulator logo" width="56" height="56" />
      <span>Self‑Driving Car Simulator</span>
    </h1>
    <p class="subtitle">Train neural networks, race against AI, and build your own worlds.</p>
  </header>
`;

/** Render a chunk of landing-page HTML inside a `.main-page` body context. */
function landingStage(inner: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'main-page';
  // The Storybook preview iframe's <body> is not `.main-page`, so the shared
  // `body:not(.main-page)` rule applies `overflow:hidden` and flex-centres its
  // content — which clips a full landing page at the bottom. Make this root a
  // self-contained scroll container (exactly one viewport tall) so the page
  // scrolls internally regardless of the body's overflow.
  root.style.cssText =
    'height:100vh;overflow-y:auto;background:var(--color-bg-app);box-sizing:border-box';
  root.innerHTML = inner;
  return root;
}

// ═══════════════════════════════════════════════════════════════════
//  Full landing page — header, all feature cards and the store panel.
// ═══════════════════════════════════════════════════════════════════
export const LandingPage: StoryObj = {
  name: 'Landing Page',
  render: () =>
    landingStage(`
      ${LANDING_HEADER}
      <main class="landing-sections">
        ${FEATURE_CARDS}
        <store-panel></store-panel>
      </main>
    `),
};

// ═══════════════════════════════════════════════════════════════════
//  Feature cards — the five navigation cards in isolation.
// ═══════════════════════════════════════════════════════════════════
export const FeatureCards: StoryObj = {
  name: 'Feature Cards',
  render: () =>
    landingStage(`<main class="landing-sections">${FEATURE_CARDS}</main>`),
};
