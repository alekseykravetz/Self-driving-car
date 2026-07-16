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

  #addKeyboardListeners(): void {
    document.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (this.frozen) return;
      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
          this.left = true;
          break;
        case 'ArrowRight':
        case 'd':
          this.right = true;
          break;
        case 'ArrowUp':
        case 'w':
          this.forward = true;
          break;
        case 'ArrowDown':
        case 's':
          this.reverse = true;
          break;
      }
    });
    document.addEventListener('keyup', (event: KeyboardEvent): void => {
      if (this.frozen) return;
      switch (event.key) {
        case 'ArrowLeft':
        case 'a':
          this.left = false;
          break;
        case 'ArrowRight':
        case 'd':
          this.right = false;
          break;
        case 'ArrowUp':
        case 'w':
          this.forward = false;
          break;
        case 'ArrowDown':
        case 's':
          this.reverse = false;
          break;
      }
    });
  }
}
