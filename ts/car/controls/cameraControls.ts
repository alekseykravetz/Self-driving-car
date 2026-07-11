import { MarkerDetector, Marker } from './markerDetector.js';
import { Point } from '../../math/primitives/point.js';
import { average, distance } from '../../math/utils.js';

const VIDEO_DOWNSCALE_FACTOR = 4;
const REVERSE_SIZE_RATIO = 0.8;
const FORWARD_SIZE_RATIO = 1.2;

export class CameraControls {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tempCanvas: HTMLCanvasElement;
  tempCtx: CanvasRenderingContext2D;
  video?: HTMLVideoElement;

  tilt: number;
  forward: boolean;
  reverse: boolean;

  initializing: boolean;
  expectedSize: number;

  markerDetector: MarkerDetector;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.tempCanvas = document.createElement('canvas');
    // Initial dimensions, will be updated later
    this.tempCanvas.width = this.canvas.width;
    this.tempCanvas.height = this.canvas.height;
    this.tempCtx = this.tempCanvas.getContext('2d')!;

    this.tilt = 0;
    this.forward = true;
    this.reverse = false;

    this.initializing = true;
    this.expectedSize = 0;

    this.markerDetector = new MarkerDetector();

    this.#initializeCamera();
    this.#addListeners();
  }

  #initializeCamera(): void {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream: MediaStream) => {
          this.video = document.createElement('video');
          this.video.srcObject = stream;
          this.video.play();
          this.video.onloadeddata = () => {
            if (!this.video) return; // Type guard
            // Adjust canvas size based on video dimensions for performance
            this.canvas.width = this.video.videoWidth / VIDEO_DOWNSCALE_FACTOR;
            this.canvas.height =
              this.video.videoHeight / VIDEO_DOWNSCALE_FACTOR;
            this.tempCanvas.width = this.canvas.width;
            this.tempCanvas.height = this.canvas.height;
            // Start the processing loop once video data is loaded
            this.#loop();
          };
        })
        .catch((err: Error) => {
          // Catch specific errors if possible
          console.error('Error accessing camera:', err);
          alert(
            'Could not access the camera. Please ensure permissions are granted.',
          );
        });
    } else {
      alert('getUserMedia is not supported in this browser.');
    }
  }

  #addListeners(): void {
    // Use wheel event for threshold adjustment
    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault(); // Prevent page scrolling
      this.markerDetector.updateThreshold(-Math.sign(e.deltaY) * 5); // Adjust sensitivity
    });
  }

  // Public method to finalize initialization if needed externally
  saveExpectedSize(): void {
    this.initializing = false;
    console.log('Expected marker size saved:', this.expectedSize);
  }

  #processMarkers(result: { leftMarker: Marker; rightMarker: Marker }): void {
    const { leftMarker, rightMarker } = result;

    // Calculate tilt angle based on marker centroids
    this.tilt = Math.atan2(
      rightMarker.centroid.y - leftMarker.centroid.y,
      rightMarker.centroid.x - leftMarker.centroid.x,
    );

    // Calculate current average size
    const currentSize = (leftMarker.radius + rightMarker.radius) / 2;

    if (this.initializing) {
      // If initializing, set the expected size
      this.expectedSize = currentSize;
      // Optionally call saveExpectedSize() automatically after first detection
      // this.saveExpectedSize();
    } else {
      // Once initialized, compare current size to expected size
      const sizeRatio = currentSize / this.expectedSize;
      if (sizeRatio < REVERSE_SIZE_RATIO) {
        this.forward = false;
        this.reverse = true;
      } else if (sizeRatio > FORWARD_SIZE_RATIO) {
        // Optional: Threshold for moving forward (if stopped)
        this.forward = true;
        this.reverse = false;
      } else {
        // Maintain current state if size is within range
        this.forward = true; // Default to forward if in expected range
        this.reverse = false;
      }
    }

    // --- Drawing (optional visualization) ---
    const wheelCenter = average(
      leftMarker.centroid as Point,
      rightMarker.centroid as Point,
    );
    const wheelRadius = distance(wheelCenter, leftMarker.centroid as Point);

    this.ctx.beginPath();
    this.ctx.fillStyle = this.forward ? 'blue' : this.reverse ? 'red' : 'gray'; // Indicate forward/reverse state
    this.ctx.arc(wheelCenter.x, wheelCenter.y, wheelRadius, 0, 2 * Math.PI);
    this.ctx.fill();

    // Optionally draw detected marker points/centroids for debugging
    this.ctx.fillStyle = 'lime';
    [leftMarker, rightMarker].forEach((marker) => {
      this.ctx.beginPath();
      this.ctx.arc(marker.centroid.x, marker.centroid.y, 5, 0, 2 * Math.PI);
      this.ctx.fill();
    });
  }

  #loop(): void {
    if (!this.video) {
      // Ensure necessary elements are available
      requestAnimationFrame(() => this.#loop()); // Continue trying
      return;
    }

    // Draw mirrored video onto the main canvas
    this.ctx.save();
    this.ctx.translate(this.canvas.width, 0);
    this.ctx.scale(-1, 1); // Mirror horizontally
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    // Get image data from the main canvas
    const imageData = this.ctx.getImageData(
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );

    // Detect markers
    const result = this.markerDetector.detect(imageData);

    if (result) {
      this.#processMarkers(result);

      // --- Visualization on temp canvas (shows only detected marker pixels) ---
      const tempData = this.tempCtx.createImageData(
        imageData.width,
        imageData.height,
      );

      // Make tempData transparent initially
      for (let i = 3; i < tempData.data.length; i += 4) {
        tempData.data[i] = 0; // Alpha channel
      }

      // Set alpha for detected marker points
      for (const point of [
        ...result.leftMarker.points,
        ...result.rightMarker.points,
      ]) {
        // Ensure point coordinates are within bounds
        const x = Math.round(point.x);
        const y = Math.round(point.y);
        if (x >= 0 && x < imageData.width && y >= 0 && y < imageData.height) {
          const index = (y * imageData.width + x) * 4;
          // Copy original color and set full alpha
          tempData.data[index] = imageData.data[index]; // R
          tempData.data[index + 1] = imageData.data[index + 1]; // G
          tempData.data[index + 2] = imageData.data[index + 2]; // B
          tempData.data[index + 3] = 255; // Alpha
        }
      }

      // Put the processed marker data onto the temp canvas
      this.tempCtx.putImageData(tempData, 0, 0);

      // Draw the temp canvas (marker visualization) over the main canvas video feed
      this.ctx.drawImage(this.tempCanvas, 0, 0);
      // --- End Visualization ---
    } else {
      // Handle case where no markers are detected (e.g., stop movement)
      // this.forward = false;
      // this.reverse = false;
      // Optionally clear the visualization or show a status
    }

    // Continue the loop
    requestAnimationFrame(() => this.#loop());
  }
}
