/**
 * Cooperative time-slicing helpers for world generation.
 *
 * Large OSM imports run several expensive, purely-synchronous stages (road
 * `Polygon.union`, building placement, tree rejection sampling). Running them
 * in one blocking call froze the tab and triggered the browser's "kill tab"
 * dialog. These helpers let the generation loops `yield` periodically so the
 * main thread returns control to the browser — keeping the UI responsive and
 * driving a progress bar — without moving the hand-rolled geometry off-thread.
 */

/** A single progress update emitted while a world is being generated. */
export interface GenerationProgress {
  /** Which generation stage is currently running. */
  stage: 'roads' | 'buildings' | 'trees';
  /** Human-readable description of the current stage. */
  label: string;
  /** Overall completion across all active stages, in `[0, 1]`. */
  fraction: number;
}

export type GenerationProgressCallback = (progress: GenerationProgress) => void;

/** Runs a generator to completion synchronously and returns its result. */
export function drainGenerator<T>(gen: Generator<unknown, T>): T {
  let step = gen.next();
  while (!step.done) step = gen.next();
  return step.value;
}

/** Resolves on the next macrotask, letting the browser paint between slices. */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Pumps a generator that yields a local `[0, 1]` progress fraction, time-slicing
 * so no single slice blocks the main thread longer than `budgetMs`. Between
 * slices control is returned to the browser via {@link yieldToBrowser}. The
 * generator's return value is passed through.
 */
export async function runChunkedGenerator<T>(
  gen: Generator<number, T>,
  onLocalProgress: (fraction: number) => void,
  budgetMs = 12,
): Promise<T> {
  let sliceStart = performance.now();
  let step = gen.next();
  while (!step.done) {
    onLocalProgress(step.value);
    if (performance.now() - sliceStart >= budgetMs) {
      await yieldToBrowser();
      sliceStart = performance.now();
    }
    step = gen.next();
  }
  return step.value;
}
