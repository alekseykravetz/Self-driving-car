#!/usr/bin/env node
/**
 * Generate the social-share preview image (Open Graph / Twitter card).
 *
 * Renders an on-brand 1200x630 card with headless Chromium (already a dev
 * dependency via Playwright) and writes it to assets/og-image.png. Platforms
 * like LinkedIn/Slack/WhatsApp require a raster PNG/JPG for link previews —
 * they do not render the site's SVG logo.
 *
 * Usage: node scripts/generate-og-image.mjs
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'assets', 'og-image.png');

const LOGO_SVG = `
<svg width="200" height="200" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sdcGrad" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
      <stop stop-color="#7ddf7d" />
      <stop offset="1" stop-color="#4ecdc4" />
    </linearGradient>
  </defs>
  <g stroke="url(#sdcGrad)" stroke-width="2" stroke-linecap="round" opacity="0.55">
    <line x1="32" y1="18" x2="32" y2="4" />
    <line x1="32" y1="18" x2="18" y2="7" />
    <line x1="32" y1="18" x2="46" y2="7" />
  </g>
  <g fill="url(#sdcGrad)">
    <circle cx="32" cy="4" r="2.4" />
    <circle cx="18" cy="7" r="2.4" />
    <circle cx="46" cy="7" r="2.4" />
  </g>
  <g fill="url(#sdcGrad)" opacity="0.8">
    <rect x="13" y="24" width="6" height="11" rx="3" />
    <rect x="45" y="24" width="6" height="11" rx="3" />
    <rect x="13" y="42" width="6" height="11" rx="3" />
    <rect x="45" y="42" width="6" height="11" rx="3" />
  </g>
  <path d="M32 18 C26 18 22 22 21 28 L20.5 50 C20.5 55 24 58 32 58 C40 58 43.5 55 43.5 50 L43 28 C42 22 38 18 32 18 Z" fill="url(#sdcGrad)" />
  <path d="M25 28 C27 25 37 25 39 28 L37 37 L27 37 Z" fill="#0f0f14" opacity="0.85" />
  <rect x="26" y="44" width="12" height="8" rx="2.5" fill="#0f0f14" opacity="0.45" />
</svg>`;

const HTML = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1200px; height: 630px; }
      body {
        display: flex;
        align-items: center;
        gap: 56px;
        padding: 90px 96px;
        font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #f5f7fa;
        background:
          radial-gradient(1100px 700px at 82% -10%, rgba(78, 205, 196, 0.18), transparent 60%),
          radial-gradient(900px 600px at 8% 120%, rgba(125, 223, 125, 0.16), transparent 60%),
          #0f0f14;
        overflow: hidden;
      }
      .logo {
        flex: 0 0 auto;
        width: 240px;
        height: 240px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 40px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(125, 223, 125, 0.25);
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
      }
      .content { display: flex; flex-direction: column; gap: 20px; }
      .eyebrow {
        font-size: 26px;
        font-weight: 700;
        letter-spacing: 3px;
        text-transform: uppercase;
        color: #7ddf7d;
      }
      h1 {
        font-size: 74px;
        font-weight: 800;
        line-height: 1.02;
        background: linear-gradient(120deg, #7ddf7d, #4ecdc4);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      p {
        font-size: 32px;
        font-weight: 500;
        line-height: 1.35;
        color: rgba(245, 247, 250, 0.82);
        max-width: 640px;
      }
      .tags { display: flex; gap: 14px; margin-top: 10px; flex-wrap: wrap; }
      .tag {
        font-size: 22px;
        font-weight: 600;
        padding: 10px 20px;
        border-radius: 999px;
        color: #cdefe9;
        background: rgba(78, 205, 196, 0.12);
        border: 1px solid rgba(78, 205, 196, 0.35);
      }
    </style>
  </head>
  <body>
    <div class="logo">${LOGO_SVG}</div>
    <div class="content">
      <div class="eyebrow">Neuroevolution &middot; TypeScript &middot; Canvas 2D</div>
      <h1>Self&#8209;Driving<br />Car Simulator</h1>
      <p>Cars learn to drive through neuroevolution &mdash; built from scratch, zero dependencies.</p>
      <div class="tags">
        <span class="tag">Neural Networks</span>
        <span class="tag">Genetic Algorithm</span>
        <span class="tag">OpenStreetMap</span>
      </div>
    </div>
  </body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
});
await page.setContent(HTML, { waitUntil: 'networkidle' });
await page.screenshot({ path: OUT });
await browser.close();
console.log(`Wrote ${OUT}`);
