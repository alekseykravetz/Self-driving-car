/**
 * Mock for HTMLImageElement for Node.js unit tests.
 * CarRenderer constructor calls new Image(), which doesn't exist in Node.
 * Import this before any Car import to make construction possible.
 */
export function setupImageMock(): void {
  if (typeof globalThis.Image !== 'undefined') return;

  class MockImage {
    src: string = '';
    complete: boolean = true;
    naturalWidth: number = 1;
    naturalHeight: number = 1;
    onload: (() => void) | null = null;
    constructor() {}
    addEventListener() {}
    removeEventListener() {}
    setAttribute() {}
    getAttribute() {
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.Image = MockImage as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.HTMLImageElement = MockImage as any;
}
