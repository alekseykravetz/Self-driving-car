# Landing Scroll Animation: Jitter and Lag Experiments

## Goal

Find the smallest change that makes the landing page scroll transition feel stable and responsive without removing its intended behavior:

- The header slims after the first scroll.
- The landing grid remains pinned during the transition.
- The hint pill reveals at the gate.
- The live-preview card slides into view.
- The preview simulator runs only while the preview is visible.
- The transition works in both directions.

This is an experiment task. Apply and evaluate **one variant at a time**. Do not combine variants until the individual result is recorded.

## Scope

Primary files:

- `ts/landing/landingPreview.ts`
- `ts/ui/organisms/previewSimulator.ts`
- `styles/templates/_landing-page.css`
- `styles/organisms/_preview-simulator.css`
- `styles/pages/_mobile.css`

Related entry points:

- `index.html`
- `ts/landing/entry.ts`

Do not edit generated `js/` files directly.

## Current Architecture

### Scroll controller

`initLandingPreview()` installs a passive `scroll` listener and schedules `apply()` through `requestAnimationFrame`.

`apply()` currently does all of the following in one frame:

- Reads `window.scrollY`, `window.innerHeight`, `track.offsetHeight`, and multiple bounding rectangles.
- Toggles `body.scrolled`, `body.grid-fits`, and `body.preview-page2`.
- Updates `--header-h` and `--grid-pin` CSS variables.
- Computes reveal, slide, direction, dwell, and lock state.
- Writes pill `top`, `bottom`, `transform`, `opacity`, and `visibility`.
- Writes the preview scene `transform`.
- Starts or stops the simulator.
- May call `window.scrollTo()` indirectly through `snapTo()` / `glideTo()`.

### Header layout changes

The `body.scrolled` class changes:

- Header padding.
- Logo width and height.
- Title font size and margin.
- Subtitle `max-height` and opacity.
- Header background and backdrop blur.

The header is sticky, so changing its height while scrolling changes layout and the geometry used by the scroll controller.

### Programmatic scroll

`glideTo()` uses a second `requestAnimationFrame` loop and calls `window.scrollTo()` every frame. Those calls produce scroll events, which schedule the main `apply()` loop.

### Preview simulator

When the card is slightly visible, `PreviewSimulatorElement.activate()` starts a separate animation loop. Each frame updates and draws approximately 20 cars plus the world, borders, markings, and canvas cars.

### Expensive visual effects

The pill and preview use:

- `backdrop-filter: blur(...)`.
- Large animated shadows.
- Blur filters on the glow.
- Multiple CSS animations.
- A fixed large scene with a moving transform.

## Hypotheses

| ID  | Hypothesis                                                                          | Symptom explained                                                                | Confidence |
| --- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------- |
| H1  | Header height changes during scroll cause layout corrections.                       | Page/header/grid visibly shake, especially at the first scroll and near the top. | High       |
| H2  | Dynamic sticky offsets and repeated geometry reads/writes cause forced layout work. | Small jumps and inconsistent scroll response.                                    | High       |
| H3  | `window.scrollTo()` animation feeds back into the scroll listener.                  | Auto-slide can feel uneven or fight the user when direction changes.             | High       |
| H4  | The live simulator competes with scroll rendering on the main thread.               | Transition becomes laggy only when the preview appears.                          | High       |
| H5  | First-time preview initialization causes a one-off hitch.                           | The first reveal is worse than later reveals.                                    | High       |
| H6  | Backdrop blur, animated shadows, and glow filters cause compositor pressure.        | Pill/card movement is worse on slower GPUs or mobile browsers.                   | Medium     |
| H7  | The intentional `easeOutBack` overshoot looks like accidental shaking.              | Card landing has a bump or overshoot, especially on reverse direction.           | Medium     |
| H8  | Scroll and programmatic animation use separate RAF loops.                           | Timing can become uneven under load.                                             | Medium     |

## Baseline Protocol

Record a baseline before changing code.

### Required environments

- Desktop Chromium at approximately 1440 x 900.
- Narrow viewport at approximately 390 x 844.
- One normal desktop browser other than Chromium if available.

### Required scenarios

1. Hard reload at the top of `/index.html`.
2. Slowly wheel from page 1 into the pill reveal.
3. Continue through the card slide to page 2.
4. Scroll back up through the reverse transition.
5. Repeat the transition a second time.
6. Reverse direction during the pill reveal.
7. Reverse direction during the card auto-slide.
8. Leave the preview visible for at least 10 seconds.

### Record these metrics

- Subjective jitter score from 0 to 5:
  - `0` = none.
  - `1` = barely noticeable.
  - `3` = clearly distracting.
  - `5` = unusable.
- Subjective lag score from 0 to 5.
- Whether the first reveal has a one-time hitch.
- Whether reverse scrolling causes a jump, bounce, or delayed response.
- Whether the card lands with an unwanted overshoot.
- Chrome DevTools Performance capture during one down-and-up transition:
  - Frames below 60 FPS.
  - Longest frame duration.
  - Main-thread time spent in scripting, layout, paint, and raster/compositing.
- Console errors and warnings.

### Instrumentation allowed during diagnosis

Temporary instrumentation may be added and removed after each experiment. Prefer `performance.mark()` / `performance.measure()` or a temporary `console.table()` over permanent logging.

Useful measurements:

- Duration of `apply()`.
- Duration of `PreviewSimulatorElement.#update()`.
- Duration of `PreviewSimulatorElement.#draw()`.
- Number of `apply()` calls during one glide.
- Number of `scroll` events generated during one glide.
- Time spent in the first `activate()` / `#init()` call.

## Experiment Rules

- Change one hypothesis at a time.
- Keep the same browser, viewport, world, and interaction sequence for comparisons.
- Do not optimize unrelated landing-page code during this task.
- Do not change transition durations while testing layout or simulator hypotheses.
- If a variant changes behavior, document that separately from performance improvement.
- Keep a variant only if it improves the target metric without introducing a regression in the required scenarios.
- Re-run `npm run fix:all` after a code or CSS change.
- Run relevant tests after each retained change; run the full suite before combining retained variants.

## Variant 0: Instrument Only

### Purpose

Confirm whether the problem is layout-bound, simulator-bound, or both before changing behavior.

### Change

Add temporary timing marks around:

- `apply()` in `ts/landing/landingPreview.ts`.
- `#update()` and `#draw()` in `ts/ui/organisms/previewSimulator.ts`.
- The first `#init()` call.

Also count:

- `apply()` executions.
- `window.scrollTo()` executions during a glide.
- Frames where `apply()` exceeds 8 ms and 16.7 ms.

### Expected result

This variant changes no user-visible behavior. It identifies the dominant work.

### Decision

- If `apply()` or layout dominates, prioritize Variants 1, 2, and 3.
- If simulator update/draw dominates, prioritize Variants 4 and 5.
- If raster/compositing dominates, prioritize Variant 6.
- If all timings are low but the motion looks unstable, prioritize Variant 7.

## Variant 1: Freeze Header Geometry

### Purpose

Test H1 directly by preventing header height from changing during the scroll sequence.

### Possible implementations

Choose the smallest implementation for the experiment:

- Reserve the slim header height from the start and animate internal content opacity/transform only.
- Keep header padding, logo dimensions, title font size, and subtitle layout height constant.
- Hide the subtitle visually with opacity instead of changing `max-height`.
- Avoid animating properties that affect document flow.

### Files

- `styles/templates/_landing-page.css`
- Possibly `ts/landing/landingPreview.ts` if `body.scrolled` becomes visual-only.

### Expected result

The first scroll no longer changes the scroll geometry. Header/grid shake should be substantially reduced.

### Risks

- Header may no longer feel compact.
- The landing grid may start lower or leave extra space.

### Keep criteria

Keep if the jitter score improves by at least 1 point and the header remains visually acceptable.

## Variant 2: Remove Dynamic Sticky Offset Changes

### Purpose

Test H2 by keeping the grid’s sticky position stable.

### Possible implementations

- Stop changing `--grid-pin` during every scroll frame.
- Use one static sticky position for the grid.
- Replace the dynamic `body.grid-fits` branch with a layout that reserves the header space without changing `top` during scrolling.
- If a dynamic value is required, calculate it once after resize rather than during scroll.

### Files

- `ts/landing/landingPreview.ts`
- `styles/organisms/_preview-simulator.css`

### Expected result

Scrolling should no longer trigger sticky-position corrections or visible grid jumps.

### Risks

- Tall and short grids may need different static layout rules.
- The first page may no longer remain perfectly pinned under the header.

### Keep criteria

Keep if reverse scrolling remains correct and the grid does not visibly slide behind the header.

## Variant 3: Consolidate Read/Write Phases

### Purpose

Test H2 by reducing forced synchronous layout.

### Change

Restructure `apply()` into explicit phases:

1. Read all geometry and scroll values.
2. Compute all state values in local variables.
3. Apply classes and style properties after all reads are complete.

Cache values that only change on resize:

- Viewport height.
- Track height.
- Grid height.
- Header dimensions where possible.

Do not call `getBoundingClientRect()` after writing a class or style in the same frame unless the measurement is unavoidable.

### Files

- `ts/landing/landingPreview.ts`

### Expected result

Lower layout time and fewer inconsistent frames, without changing the transition model.

### Risks

- Cached dimensions may become stale after responsive layout changes.
- Resize handling must invalidate all relevant caches.

### Keep criteria

Keep if Performance recordings show lower layout time and no stale positioning after resize or orientation change.

## Variant 4: Disable the Preview Simulator During Scroll Motion

### Purpose

Test H4 by removing simulator work from the most sensitive part of the transition.

### Possible implementations

- Pause simulation updates while `locked` or while the card transform is changing rapidly.
- Draw a cached last frame during the card slide.
- Activate the simulator only after the card reaches its final position.
- Keep the simulator active only after the slide velocity falls below a threshold.

### Files

- `ts/landing/landingPreview.ts`
- `ts/ui/organisms/previewSimulator.ts`

### Expected result

The card transition becomes smoother, especially on large worlds and slower devices.

### Risks

- Cars freeze briefly during the reveal.
- A cached frame may look less lively.

### Keep criteria

Keep if frame time improves significantly and the pause is not visually distracting. Prefer pausing only during movement, not while the preview is fully visible.

## Variant 5: Reduce Preview Simulation Load

### Purpose

Test H4 without fully pausing the preview.

### Possible implementations

Evaluate separately, not all at once:

- Reduce `PREVIEW_CAR_COUNT` from 20 to 12 or 8.
- Update physics at a lower fixed frequency while still rendering every frame.
- Draw the world less frequently and draw cars against the last world frame.
- Use a smaller render radius during transition.
- Skip expensive decorative layers while the scene is moving.
- Reduce collision checks or use a coarser preview-only collision mode.

### Files

- `ts/ui/organisms/previewSimulator.ts`
- Possibly `ts/landing/landingPreview.ts` for transition-aware quality settings.

### Expected result

More consistent frame times with a still-active preview.

### Risks

- Fewer cars reduce the visual impact.
- Lower update frequency can make cars appear less physically smooth.
- Separate world/car render cadence can produce visual mismatch.

### Keep criteria

Keep the smallest reduction that removes long frames while preserving the showcase impression.

## Variant 6: Replace Expensive Compositor Effects

### Purpose

Test H6 by reducing GPU/compositor pressure.

### Possible implementations

Evaluate one effect at a time:

- Remove `backdrop-filter` from `.preview-splash-pill`.
- Replace glow `filter: blur(...)` with a static radial gradient.
- Stop animating large box shadows while the pill is moving.
- Disable the shimmer, ring, and float animations during scroll motion.
- Reduce the glow element’s oversized `inset: -55%` area.
- Use opacity and transform animations only.

### Files

- `styles/organisms/_preview-simulator.css`

### Expected result

Lower paint/raster time and smoother pill/card compositing.

### Risks

- The special visual treatment becomes less pronounced.

### Keep criteria

Keep if raster/compositor time improves without materially weakening the design.

## Variant 7: Remove or Reduce Card Overshoot

### Purpose

Test H7 by removing intentional spring motion as a source of perceived shaking.

### Possible implementations

- Use `springSlide = slide` for a fully linear scroll-linked transform.
- Replace `easeOutBack` with a non-overshooting ease-out.
- Apply the overshoot only after the card reaches its final position, not while scroll-linked.
- Reduce the back constant from `0.9` to a smaller value.

### Files

- `ts/landing/landingPreview.ts`

### Expected result

The card should track the scroll direction predictably and land without bouncing.

### Risks

- The transition may feel less distinctive.

### Keep criteria

Keep if subjective shake improves while the movement still feels intentional and smooth.

## Variant 8: One Animation Scheduler

### Purpose

Test H3/H8 by preventing independent RAF loops from competing.

### Change

Use one scheduler for scroll state and programmatic glide state:

- Maintain a single pending RAF ID.
- Let the scheduler update the target scroll position and visual state in one frame.
- Avoid having `glideTo()` own a separate RAF while `apply()` is also scheduled by scroll events.
- Ensure user input cancels or supersedes the current glide cleanly.

### Files

- `ts/landing/landingPreview.ts`

### Expected result

More stable timing during automatic slides and fewer duplicate frames.

### Risks

- The state machine is more invasive than the earlier variants.
- Incorrect cancellation can leave `locked` or `dwelling` stuck.

### Keep criteria

Keep only if it improves auto-slide and reversal behavior without regressions at either gate.

## Variant 9: Prewarm Preview Initialization

### Purpose

Test H5 by moving one-time simulator setup away from the first visible transition.

### Possible implementations

- Initialize the world and car data after page load while the preview is hidden.
- Keep the simulator loop stopped until activation.
- Split initialization into small idle-time chunks if setup is still expensive.
- Preserve the current behavior when no usable world exists.

### Files

- `ts/ui/organisms/previewSimulator.ts`
- Possibly `ts/landing/landingPreview.ts`

### Expected result

The first reveal no longer has a one-time hitch.

### Risks

- More work occurs during initial page load.
- Store data may not be ready immediately.
- Initialization may waste resources if the user never reaches the preview.

### Keep criteria

Keep if first-reveal latency improves and initial landing-page load does not regress materially.

## Variant 10: Native Scroll-Snap / CSS-First Transition

### Purpose

Evaluate whether the custom scroll hijacking is the fundamental source of instability.

### Possible implementation

Replace the custom `window.scrollTo()` glide and some sticky calculations with CSS scroll-snap or a simpler section-based layout. Keep only lightweight JS for activation and direction state.

### Files

- `ts/landing/landingPreview.ts`
- `styles/organisms/_preview-simulator.css`
- `styles/templates/_landing-page.css`
- Possibly `index.html`

### Expected result

The browser owns scroll physics and avoids the custom scroll feedback loop.

### Risks

- This may substantially change the interaction model.
- Exact mirrored gate behavior may be harder to preserve.
- Touch behavior needs dedicated testing.

### Keep criteria

Use only if smaller variants cannot produce stable behavior. Treat this as a redesign fallback, not the first fix.

## Recommended Execution Order

1. Variant 0: Instrument only.
2. Variant 1: Freeze header geometry.
3. Variant 2: Remove dynamic sticky offset changes.
4. Variant 3: Consolidate layout reads and writes.
5. Variant 4: Disable simulator during scroll motion.
6. Variant 5: Reduce simulator load if Variant 4 is too visually static.
7. Variant 6: Reduce compositor effects.
8. Variant 7: Remove or reduce card overshoot.
9. Variant 8: Consolidate RAF scheduling.
10. Variant 9: Prewarm initialization.
11. Variant 10: Consider CSS/native scroll snapping only if necessary.

## Results Log

Record one row after each experiment.

| Variant  | Browser / viewport | Jitter 0-5 | Lag 0-5 | Longest frame | Main finding | Keep? |
| -------- | ------------------ | ---------: | ------: | ------------: | ------------ | ----- |
| Baseline |                    |            |         |               |              |       |
| 0        |                    |            |         |               |              |       |
| 1        | Chromium, desktop + narrow | not measured | not measured | not measured | Header layout footprint is now stable; landing visual and scroll activation tests pass. Manual interaction/performance scoring still required. | Candidate |
| 2        |                    |            |         |               |              |       |
| 3        |                    |            |         |               |              |       |
| 4        |                    |            |         |               |              |       |
| 5        |                    |            |         |               |              |       |
| 6        |                    |            |         |               |              |       |
| 7        |                    |            |         |               |              |       |
| 8        |                    |            |         |               |              |       |
| 9        |                    |            |         |               |              |       |
| 10       |                    |            |         |               |              |       |

## Acceptance Criteria For The Final Change

- No visible header or grid jump during the first scroll.
- No visible shake when entering or leaving the preview.
- Reverse scrolling cancels or reverses the transition predictably.
- The card does not visibly overshoot unless that effect is intentionally retained.
- Preview simulation does not create obvious dropped frames during the transition.
- First reveal does not contain a noticeable initialization hitch.
- Desktop and narrow viewport behavior both remain usable.
- `prefers-reduced-motion: reduce` still disables decorative animations.
- No console errors or unhandled promise rejections.
- `npm run fix:all` passes.
- Relevant unit tests pass; visual tests are run if CSS or landing-page geometry changes.

## Verification Commands

```bash
npm run fix:all
npm run tsc:watch
npm test
npm run test:visual
```

For a focused local check, serve the project and open:

```text
http://localhost:9090/index.html
```

Use `?paused=1` only when checking static layout. It disables the preview simulator animation and is not sufficient for evaluating scroll performance.

## Completion Criteria

The task is complete when:

1. At least the instrumentation baseline and the high-confidence variants have been tested.
2. The results log identifies the dominant cause.
3. The smallest effective variant, or a justified combination of retained variants, is implemented.
4. The final behavior is verified on desktop and narrow viewports.
5. Documentation and tests are updated if the final implementation changes the scroll state machine or preview lifecycle.
