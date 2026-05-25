# Control Systems

The project supports multiple input methods for controlling cars, from keyboard to camera-based marker tracking. All control systems provide the same interface: boolean flags for `forward`, `left`, `right`, and `reverse`.

---

## Control Interface

All control systems ultimately set these flags consumed by `Car.#move()`:

```typescript
// From controls:
forward: boolean; // Accelerate
left: boolean; // Steer left
right: boolean; // Steer right
reverse: boolean; // Decelerate / reverse
```

---

## Keyboard Controls (`ts/car/controls/controls.ts`)

### Class Structure

```typescript
enum ControlType {
  KEYS = 'KEYS',
  DUMMY = 'DUMMY',
  AI = 'AI',
}

class Controls {
  forward: boolean;
  left: boolean;
  right: boolean;
  reverse: boolean;

  constructor(type: ControlType);
}
```

### Modes

**KEYS Mode** — Human keyboard input:

- Registers `keydown` and `keyup` event listeners
- Supported keys:
  | Key | Action |
  |-----|--------|
  | `ArrowUp` / `W` | Forward |
  | `ArrowLeft` / `A` | Left |
  | `ArrowRight` / `D` | Right |
  | `ArrowDown` / `S` | Reverse |

**DUMMY Mode** — Traffic cars:

- Sets `forward = true` permanently
- Car drives straight ahead at constant speed
- Used for obstacle traffic in training

**AI Mode** — Neural network control:

- No event listeners registered
- `forward/left/right/reverse` set externally by neural network output each frame

---

## Phone Controls (`ts/car/controls/phoneControls.ts`)

### Purpose

Allows controlling the car by tilting a mobile device. The phone's accelerometer determines steering, and touch events control acceleration.

### Class Structure

```typescript
class PhoneControls {
  tilt: number; // Current tilt angle (radians)
  forward: number; // Forward throttle (0 or 1)
  reverse: number; // Reverse throttle (0 or 1)
  canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement);
}
```

### Tilt Detection

Listens to `devicemotion` event:

```typescript
window.addEventListener('devicemotion', (e) => {
  const gx = e.accelerationIncludingGravity.x;
  const gy = e.accelerationIncludingGravity.y;
  this.tilt = Math.atan2(gy, gx) - Math.PI / 2;
});
```

The tilt angle maps directly to the car's steering — tilting the phone left/right steers the car.

### Canvas Rotation

The entire canvas rotates to match the phone's tilt for an immersive feel:

```typescript
// Smooth interpolation
const smoothingFactor = 0.4;
displayAngle = lerp(displayAngle, tilt, smoothingFactor);
canvas.style.transform = `rotate(${displayAngle}rad)`;
```

### Touch Controls

```typescript
canvas.addEventListener('touchstart', () => {
  if (forward === 0) {
    forward = 1;
    reverse = 0;
  } else {
    forward = 0;
    reverse = 1;
  }
});
```

Single tap toggles between forward and reverse.

### Integration with Car

The phone controls provide analog `tilt` rather than boolean `left/right`. The car integration maps tilt to steering angle directly rather than through discrete button presses.

---

## Camera Controls (`ts/car/controls/cameraControls.ts`)

### Purpose

Uses a webcam feed to detect physical blue markers (held by the player) and maps their position/distance to car controls. This enables gesture-based driving.

### Class Structure

```typescript
class CameraControls {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement; // Display canvas
  tempCanvas: HTMLCanvasElement; // Processing canvas (lower resolution)
  tilt: number; // Steering angle from marker positions
  forward: boolean;
  reverse: boolean;
  markerDetector: MarkerDetector;

  constructor();
}
```

### Camera Initialization

```typescript
#initializeCamera() {
  navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user' }   // Front camera
  }).then(stream => {
    video.srcObject = stream
    video.play()
    requestAnimationFrame(#loop)
  })
}
```

### Processing Loop

Each frame:

1. Draw video frame to `tempCanvas` (downscaled by 4× for performance)
2. Mirror horizontally (front camera is mirrored)
3. Get pixel data from `tempCanvas`
4. Run `markerDetector.detect(imageData)` → `{leftMarker, rightMarker}`
5. Process marker positions into controls

### Marker → Controls Mapping

```typescript
#processMarkers(result: { leftMarker, rightMarker }) {
  if (both markers detected) {
    // Steering: angle between two markers
    tilt = Math.atan2(
      rightMarker.centroid.y - leftMarker.centroid.y,
      rightMarker.centroid.x - leftMarker.centroid.x
    )

    // Speed: marker size vs expected size
    const distance = markerRadius / expectedRadius
    if (distance > threshold) forward = true
    else reverse = true
  }
}
```

- **Steering**: Angle of the line connecting left and right markers
- **Throttle**: How close the markers are to the camera (larger markers = closer = forward)

### Visualization

- Draws camera feed on display canvas
- Lime dots on detected marker pixels
- Circle at the midpoint of the two markers (virtual "steering wheel")
- Status indicators for detection confidence

---

## Marker Detector (`ts/car/controls/markerDetector.ts`)

### Purpose

Detects blue-colored physical markers in a camera image using pixel analysis and K-means clustering.

### Class Structure

```typescript
class MarkerDetector {
  threshold: HTMLInputElement; // Blueness threshold control
  thresholdValue: number; // Current threshold (adjustable via mouse wheel)

  detect(imgData: ImageData): {
    leftMarker: Marker | null;
    rightMarker: Marker | null;
  };
}
```

### Detection Algorithm

#### Step 1: Blue Pixel Extraction

```typescript
for each pixel (r, g, b):
  blueness = b - Math.max(r, g)
  if (blueness > thresholdValue):
    bluePixels.push({x, y})
```

"Blueness" is defined as how much the blue channel exceeds red and green.

#### Step 2: K-Means Clustering (K=2)

```typescript
// Initialize two cluster centers (left half, right half of image)
let c1 = { x: width * 0.25, y: height / 2 }
let c2 = { x: width * 0.75, y: height / 2 }

// Iterate until convergence:
for (iterations) {
  // Assign each blue pixel to nearest center
  for (pixel of bluePixels) {
    if (distance(pixel, c1) < distance(pixel, c2))
      cluster1.push(pixel)
    else
      cluster2.push(pixel)
  }
  // Recompute centers
  c1 = centroid(cluster1)
  c2 = centroid(cluster2)
}
```

#### Step 3: Marker Properties

For each cluster:

- **Centroid**: Average (x, y) of all pixels in cluster
- **Radius**: Average distance from centroid to cluster pixels
- **Point count**: Number of pixels (confidence metric)

#### Step 4: Left/Right Assignment

The marker with the smaller X centroid is "left", the other is "right".

### Threshold Adjustment

```typescript
canvas.addEventListener('wheel', (e) => {
  thresholdValue += e.deltaY > 0 ? 1 : -1;
  thresholdValue = clamp(thresholdValue, 0, 255);
});
```

Users can adjust the blue detection sensitivity via mouse wheel to account for different lighting conditions.

---

## Control System Comparison

| System   | Input Device     | Steering        | Throttle       | Latency | Best For             |
| -------- | ---------------- | --------------- | -------------- | ------- | -------------------- |
| Keyboard | Computer         | Digital (L/R)   | Digital (F/R)  | Instant | Development/testing  |
| AI       | Neural Network   | Binary          | Binary         | 1 frame | Training             |
| Phone    | Accelerometer    | Analog (tilt)   | Touch toggle   | ~50ms   | Mobile demos         |
| Camera   | Webcam + markers | Analog (angle)  | Distance-based | ~100ms  | Physical interaction |
| DUMMY    | None             | None (straight) | Always forward | N/A     | Traffic obstacles    |

---

## Integration Architecture

```
┌─────────────────────────────────────────┐
│              Car.update()                │
│                                         │
│  if (type === 'AI' && brain):           │
│    offsets = sensor.readings → [0-1]    │
│    outputs = NeuralNetwork.feedForward() │
│    controls.forward = outputs[0]        │
│    controls.left    = outputs[1]        │
│    controls.right   = outputs[2]        │
│    controls.reverse = outputs[3]        │
│                                         │
│  Car.#move(controls) → physics update   │
└─────────────────────────────────────────┘
```

All control systems converge to the same boolean interface, making the car physics completely agnostic to the input source.
