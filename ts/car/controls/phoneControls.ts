export class PhoneControls {
  canvas: HTMLCanvasElement;
  tilt: number;
  forward: boolean;
  reverse: boolean;
  canvasAngle: number;
  smoothingFactor: number = 0.4; // For smoothing canvas rotation

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.tilt = 0; // Angle for car control
    this.forward = true;
    this.reverse = false;
    this.canvasAngle = 0; // Separate angle for canvas visual rotation
    this.#addListeners();
  }

  #addListeners(): void {
    // --- Device Orientation (Alternative, often less stable) ---
    // window.addEventListener('deviceorientation', (e: DeviceOrientationEvent) => {
    //   if (e.beta !== null) { // Check if beta value is available
    //      // Normalize beta angle (-90 to 90) potentially useful for tilt
    //      this.tilt = (e.beta * Math.PI) / 180;
    //      const newCanvasAngle = -this.tilt; // Example: canvas rotates opposite to tilt
    //      this.canvasAngle = this.canvasAngle * (1 - this.smoothingFactor) + newCanvasAngle * this.smoothingFactor;
    //      this.canvas.style.transform = `translate(-50%,-50%) rotate(${this.canvasAngle}rad)`;
    //   }
    // });

    // --- Device Motion (Often preferred for responsiveness) ---
    window.addEventListener('devicemotion', (e: DeviceMotionEvent) => {
      if (
        e.accelerationIncludingGravity &&
        e.accelerationIncludingGravity.x !== null &&
        e.accelerationIncludingGravity.y !== null
      ) {
        const gx = e.accelerationIncludingGravity.x;
        const gy = e.accelerationIncludingGravity.y;

        // Calculate tilt based on gravity vector projection on xy plane
        // This gives the angle of the device tilt relative to horizontal plane
        this.tilt = Math.atan2(gy, gx) - Math.PI / 2; // Adjust reference angle if needed
        // Ensure tilt is within a reasonable range if necessary, e.g., Math.atan2 gives -PI to PI

        // Calculate canvas rotation smoothly
        const newCanvasAngle = -this.tilt; // Example: rotate canvas opposite to tilt
        this.canvasAngle =
          this.canvasAngle * (1 - this.smoothingFactor) +
          newCanvasAngle * this.smoothingFactor;
        this.canvas.style.transform = `translate(-50%,-50%) rotate(${this.canvasAngle}rad)`;
      }
    });

    // --- Touch Events for Forward/Reverse ---
    window.addEventListener(
      'touchstart',
      () => {
        this.reverse = true;
        this.forward = false;
      },
      { passive: true },
    ); // Use passive listener if preventDefault is not needed

    window.addEventListener(
      'touchend',
      () => {
        this.reverse = false;
        this.forward = true;
      },
      { passive: true },
    );
  }
}
