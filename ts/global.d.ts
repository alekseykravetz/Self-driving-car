// Ambient global augmentations shared across entry points.
export {};

declare global {
  interface Window {
    /** Debug/test handle to the active simulator (used by the `?paused=1` hook). */
    __sim?: unknown;
  }
}
