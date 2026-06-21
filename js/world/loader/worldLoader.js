'use strict';
/**
 * Parse a .world file content string into a plain world info object.
 * Expects pure JSON `{...}`. Returns null if the content cannot be parsed.
 *
 * Defined as a top-level (global) function rather than a static class method so
 * that callers never reference it through the class name. TypeScript compiles an
 * in-class static self-reference into a shared global `_a` temp, which collides
 * across the classic (non-module) script files this project loads via <script>.
 */
function parseWorldFileContent(content) {
  try {
    return JSON.parse(content.trim());
  } catch (error) {
    console.error('Error parsing world file:', error);
    return null;
  }
}

/**
 * Reusable world loader utility.
 * Handles file input, reading, and JSON extraction from .world files.
 * Binds to an existing `#loadWorldInput` element provided by the page markup
 * (static HTML in world.html, or the shared <world-toolbar> template).
 */
class WorldLoader {
  input;
  onLoad;
  /**
   * @param onLoad - Callback invoked with the parsed world JSON object.
   * @param inputId - ID of the existing file input element (default: "loadWorldInput").
   */
  constructor(onLoad, inputId = 'loadWorldInput') {
    this.onLoad = onLoad;
    const input = document.getElementById(inputId);
    if (!input) {
      throw new Error(
        `WorldLoader: no element with id "${inputId}" found. ` +
          'Ensure the page provides the file input before constructing WorldLoader.',
      );
    }
    this.input = input;
    this.input.addEventListener('change', this.#handleFileChange.bind(this));
  }

  #handleFileChange(e) {
    const input = e.target;
    const worldFile = input.files?.[0];
    if (!worldFile) {
      alert('No file selected');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.readAsText(worldFile);
    reader.onload = (event) => this.#onFileRead(event);
    reader.onerror = () => {
      alert(`Error reading file: ${reader.error}`);
      input.value = '';
    };
  }

  #onFileRead(e) {
    if (!e.target?.result) {
      alert('Could not read file content');
      return;
    }
    const worldFileContent = e.target.result;
    const worldInfo = parseWorldFileContent(worldFileContent);
    if (!worldInfo) {
      alert(
        'Could not parse world data from the file. Ensure it contains a valid JSON object.',
      );
      this.input.value = '';
      return;
    }
    this.onLoad(worldInfo);
    this.input.value = '';
  }

  /**
   * Parse a .world file content string into a plain world info object.
   * Delegates to the shared {@link parseWorldFileContent} helper.
   * Kept for backwards compatibility / discoverability on the class.
   */
  static parseWorldFile(content) {
    return parseWorldFileContent(content);
  }
}
