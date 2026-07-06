/**
 * Parse a .car file content string into a CarInfo object.
 * Expects pure JSON `{...}`. Returns null if the content cannot be parsed.
 *
 * Defined as a top-level (global) function rather than a static class method so
 * that callers never reference it through the class name. TypeScript compiles an
 * in-class static self-reference into a shared global `_a` temp, which collides
 * across the classic (non-module) script files this project loads via <script>.
 */
export function parseCarFileContent(content) {
  try {
    return JSON.parse(content.trim());
  } catch (err) {
    console.error('Error parsing car file:', err);
    return null;
  }
}
/**
 * Compare two CarInfo objects by their physical parameters (excluding brain).
 * Returns true if all params match.
 *
 * Top-level (global) function — see {@link parseCarFileContent} for the rationale.
 */
export function compareCarInfoParams(a, b) {
  const aHidden = a.hiddenLayers ?? [6];
  const bHidden = b.hiddenLayers ?? [6];
  // raySpread is a radian float (e.g. Math.PI / 2 = 1.5707963…). Different save
  // points may store it at different precisions (the UI default is "1.57"), so
  // compare it with a small tolerance instead of strict equality.
  const RAY_SPREAD_EPSILON = 1e-2;
  return (
    a.maxSpeed === b.maxSpeed &&
    a.acceleration === b.acceleration &&
    a.friction === b.friction &&
    a.width === b.width &&
    a.height === b.height &&
    aHidden.length === bHidden.length &&
    aHidden.every((v, i) => v === bHidden[i]) &&
    a.sensor.rayCount === b.sensor.rayCount &&
    a.sensor.rayLength === b.sensor.rayLength &&
    Math.abs(a.sensor.raySpread - b.sensor.raySpread) <= RAY_SPREAD_EPSILON &&
    a.sensor.rayOffset === b.sensor.rayOffset
  );
}
/**
 * Reusable car loader utility.
 * Handles file input, reading, and parsing of one or multiple pure-JSON .car files.
 */
export class CarLoader {
  #input;
  #onLoad;
  /**
   * @param onLoad - Callback invoked with an array of parsed CarInfo objects.
   * @param inputId - ID of an existing file input element (default: "loadCarInput").
   *                  If the element doesn't exist, one will be created.
   */
  constructor(onLoad, inputId = 'loadCarInput') {
    this.#onLoad = onLoad;
    let input = document.getElementById(inputId);
    if (!input) {
      input = this.#createInput(inputId);
    }
    this.#input = input;
    this.#input.multiple = true;
    this.#input.addEventListener('change', this.#handleFilesChange.bind(this));
  }
  #createInput(inputId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = inputId;
    input.accept = '.car,.json';
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);
    return input;
  }
  #handleFilesChange(e) {
    const input = e.target;
    const files = input.files;
    if (!files || files.length === 0) {
      input.value = '';
      return;
    }
    const fileArray = Array.from(files);
    const results = [];
    let completed = 0;
    for (const file of fileArray) {
      const reader = new FileReader();
      reader.onload = (event) => {
        completed++;
        if (event.target?.result) {
          const content = event.target.result;
          const carInfo = parseCarFileContent(content);
          if (carInfo) {
            results.push(carInfo);
          } else {
            console.warn(`Failed to parse car file: ${file.name}`);
          }
        }
        if (completed === fileArray.length) {
          input.value = '';
          if (results.length > 0) {
            this.#onLoad(results);
          } else {
            alert('No valid car files could be parsed.');
          }
        }
      };
      reader.onerror = () => {
        completed++;
        console.error(`Error reading file: ${file.name}`);
        if (completed === fileArray.length) {
          input.value = '';
          if (results.length > 0) {
            this.#onLoad(results);
          }
        }
      };
      reader.readAsText(file);
    }
  }
  /**
   * Parse a .car file content string into a CarInfo object.
   * Delegates to the shared {@link parseCarFileContent} helper.
   * Kept for backwards compatibility / discoverability on the class.
   */
  static parseCarFile(content) {
    return parseCarFileContent(content);
  }
  /**
   * Compare two CarInfo objects by their physical parameters (excluding brain).
   * Delegates to the shared {@link compareCarInfoParams} helper.
   */
  static compareCarParams(a, b) {
    return compareCarInfoParams(a, b);
  }
  /**
   * Check if all CarInfo objects in an array have the same physical parameters.
   */
  static allParamsMatch(cars) {
    if (cars.length <= 1) return true;
    for (let i = 1; i < cars.length; i++) {
      if (!compareCarInfoParams(cars[0], cars[i])) return false;
    }
    return true;
  }
}
