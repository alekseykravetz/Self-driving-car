'use strict';
/**
 * Reusable world loader utility.
 * Handles file input, reading, and JSON extraction from .world files.
 * Creates and positions the load button at the top-left corner.
 */
class WorldLoader {
  input;
  onLoad;
  /**
   * @param onLoad - Callback invoked with the parsed world JSON object.
   * @param inputId - ID of an existing file input element (default: "loadWorldInput").
   *                  If the element doesn't exist, one will be created.
   */
  constructor(onLoad, inputId = 'loadWorldInput') {
    this.onLoad = onLoad;
    let input = document.getElementById(inputId);
    if (!input) {
      input = this.#createButton(inputId);
    }
    this.input = input;
    this.input.addEventListener('change', this.#handleFileChange.bind(this));
  }

  #createButton(inputId) {
    const label = document.createElement('label');
    label.htmlFor = inputId;
    label.className = 'file-input-label';
    label.style.position = 'absolute';
    label.style.left = '0';
    label.style.top = '0';
    label.textContent = '📁';
    const input = document.createElement('input');
    input.type = 'file';
    input.id = inputId;
    input.accept = '.world';
    label.appendChild(input);
    document.body.appendChild(label);
    return input;
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
    let worldJsonString = null;
    try {
      const startIndex = worldFileContent.indexOf('(');
      const endIndex = worldFileContent.lastIndexOf(')');
      if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
        worldJsonString = worldFileContent.substring(startIndex + 1, endIndex);
      } else if (
        worldFileContent.trim().startsWith('{') &&
        worldFileContent.trim().endsWith('}')
      ) {
        worldJsonString = worldFileContent.trim();
      }
    } catch (error) {
      console.error('Error processing world file content:', error);
      alert('Error processing world file content. Check console for details.');
      return;
    }
    if (!worldJsonString) {
      alert(
        'Could not extract world data from the file. Ensure it contains a valid JSON object within parentheses or as the main content.',
      );
      return;
    }
    try {
      const worldInfo = JSON.parse(worldJsonString);
      this.onLoad(worldInfo);
    } catch (error) {
      console.error('Error parsing world JSON:', error);
      alert('Failed to parse world data. Ensure the file contains valid JSON.');
    }
    this.input.value = '';
  }
}
