/**
 * Reusable car loader utility.
 * Handles file input, reading, and parsing of one or multiple .car files.
 * Supports both pure JSON and assignment syntax (e.g. `let carInfo = {...};`).
 */
class CarLoader {
  private input: HTMLInputElement;
  private onLoad: (cars: CarInfo[]) => void;

  /**
   * @param onLoad - Callback invoked with an array of parsed CarInfo objects.
   * @param inputId - ID of an existing file input element (default: "loadCarInput").
   *                  If the element doesn't exist, one will be created.
   */
  constructor(onLoad: (cars: CarInfo[]) => void, inputId = 'loadCarInput') {
    this.onLoad = onLoad;

    let input = document.getElementById(inputId) as HTMLInputElement | null;
    if (!input) {
      input = this.#createInput(inputId);
    }
    this.input = input;
    this.input.multiple = true;
    this.input.addEventListener('change', this.#handleFilesChange.bind(this));
  }

  #createInput(inputId: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = inputId;
    input.accept = '.car,.json';
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);
    return input;
  }

  #handleFilesChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const files = input.files;

    if (!files || files.length === 0) {
      input.value = '';
      return;
    }

    const fileArray = Array.from(files);
    const results: CarInfo[] = [];
    let completed = 0;

    for (const file of fileArray) {
      const reader = new FileReader();
      reader.onload = (event) => {
        completed++;
        if (event.target?.result) {
          const content = event.target.result as string;
          const carInfo = CarLoader.parseCarFile(content);
          if (carInfo) {
            results.push(carInfo);
          } else {
            console.warn(`Failed to parse car file: ${file.name}`);
          }
        }
        if (completed === fileArray.length) {
          input.value = '';
          if (results.length > 0) {
            this.onLoad(results);
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
            this.onLoad(results);
          }
        }
      };
      reader.readAsText(file);
    }
  }

  /**
   * Parse a .car file content string into a CarInfo object.
   * Supports pure JSON `{...}` and assignment syntax `let/var/const name = {...};`.
   */
  static parseCarFile(content: string): CarInfo | null {
    try {
      const trimmed = content.trim();
      if (trimmed.startsWith('{')) {
        return JSON.parse(trimmed);
      }
      const match = content.match(/=\s*([\s\S]*?)\s*;?\s*$/);
      if (match) {
        let jsonStr = match[1].trim();
        if (jsonStr.endsWith(';')) jsonStr = jsonStr.slice(0, -1).trim();
        return JSON.parse(jsonStr);
      }
      return null;
    } catch (err) {
      console.error('Error parsing car file:', err);
      return null;
    }
  }

  /**
   * Compare two CarInfo objects by their physical parameters (excluding brain).
   * Returns true if all params match.
   */
  static compareCarParams(a: CarInfo, b: CarInfo): boolean {
    const aHidden = a.hiddenLayers ?? [6];
    const bHidden = b.hiddenLayers ?? [6];
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
      a.sensor.raySpread === b.sensor.raySpread &&
      a.sensor.rayOffset === b.sensor.rayOffset
    );
  }

  /**
   * Check if all CarInfo objects in an array have the same physical parameters.
   */
  static allParamsMatch(cars: CarInfo[]): boolean {
    if (cars.length <= 1) return true;
    for (let i = 1; i < cars.length; i++) {
      if (!CarLoader.compareCarParams(cars[0], cars[i])) return false;
    }
    return true;
  }
}
