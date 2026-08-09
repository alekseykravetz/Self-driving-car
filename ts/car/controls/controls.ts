export enum ControlType {
  KEYS = 'KEYS',
  DUMMY = 'DUMMY',
  AI = 'AI', // Added based on car.js usage
  // CAMERA = 'CAMERA', // Assuming possibility
  // PHONE = 'PHONE', // Assuming possibility
}

export class Controls {
  public forward: boolean;
  public left: boolean;
  public right: boolean;
  public reverse: boolean;
  public frozen: boolean = false;

  // Raw human key holds, tracked independently of the effective controls above.
  // While `frozen` (autopilot), the brain writes the effective controls, but the
  // keyboard still updates these so DAgger can read the human's live corrections.
  #humanForward: boolean = false;
  #humanLeft: boolean = false;
  #humanRight: boolean = false;
  #humanReverse: boolean = false;

  constructor(type: ControlType | string) {
    this.forward = false;
    this.left = false;
    this.right = false;
    this.reverse = false;

    switch (type) {
      case ControlType.KEYS:
      case 'KEYS': // Allow string comparison too
        this.#addKeyboardListeners();
        break;
      case ControlType.DUMMY:
      case 'DUMMY':
        this.forward = true; // Dummy cars always move forward
        break;
      case ControlType.AI:
      case 'AI':
        // AI controls are typically set externally (e.g., by the Car class update method)
        // No listeners needed here, properties will be updated.
        break;
      // Add cases for CAMERA, PHONE if those directly integrate here
      // case ControlType.CAMERA:
      //    // Potentially initialize or link camera controls
      //    break;
      // case ControlType.PHONE:
      //    // Potentially initialize or link phone controls
      //    break;
    }
  }

  /** Raw human key state, unaffected by `frozen`. Used for DAgger corrections. */
  get humanControls(): {
    forward: boolean;
    left: boolean;
    right: boolean;
    reverse: boolean;
  } {
    return {
      forward: this.#humanForward,
      left: this.#humanLeft,
      right: this.#humanRight,
      reverse: this.#humanReverse,
    };
  }

  #addKeyboardListeners(): void {
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
          this.#humanLeft = true;
          if (!this.frozen) this.left = true;
          break;
        case 'ArrowRight':
        case 'd':
          this.#humanRight = true;
          if (!this.frozen) this.right = true;
          break;
        case 'ArrowUp':
        case 'w':
          this.#humanForward = true;
          if (!this.frozen) this.forward = true;
          break;
        case 'ArrowDown':
        case 's':
          this.#humanReverse = true;
          if (!this.frozen) this.reverse = true;
          break;
      }
    });
    document.addEventListener('keyup', (event: KeyboardEvent): void => {
      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
          this.#humanLeft = false;
          if (!this.frozen) this.left = false;
          break;
        case 'ArrowRight':
        case 'd':
          this.#humanRight = false;
          if (!this.frozen) this.right = false;
          break;
        case 'ArrowUp':
        case 'w':
          this.#humanForward = false;
          if (!this.frozen) this.forward = false;
          break;
        case 'ArrowDown':
        case 's':
          this.#humanReverse = false;
          if (!this.frozen) this.reverse = false;
          break;
      }
    });
  }
}
