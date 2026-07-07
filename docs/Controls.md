# Control Systems

The project supports multiple input methods for controlling cars. All control systems provide the same interface: boolean flags for `forward`, `left`, `right`, and `reverse`.

---

## Keyboard & Gesture Shortcuts (Quick Reference)

### Viewport Navigation (all pages)

| Input                        | Action              |
| ---------------------------- | ------------------- |
| Middle-click drag            | Pan viewport        |
| Scroll wheel                 | Zoom in/out (mouse) |
| Two-finger scroll (trackpad) | Pan viewport        |
| Pinch gesture (trackpad)     | Zoom in/out         |
| Ctrl + scroll wheel          | Zoom in/out         |

### Car Driving (Race / Simulator — KEYS mode)

| Key                | Action               |
| ------------------ | -------------------- |
| `ArrowUp` / `W`    | Accelerate (forward) |
| `ArrowDown` / `S`  | Brake / Reverse      |
| `ArrowLeft` / `A`  | Steer left           |
| `ArrowRight` / `D` | Steer right          |

### Graph Editor (World Editor page)

| Key        | Action                                                                   |
| ---------- | ------------------------------------------------------------------------ |
| `S`        | Mark hovered point as path **start**                                     |
| `E`        | Mark hovered point as path **end**                                       |
| `C`        | Clear computed shortest path (also clears start/end)                     |
| `O` (hold) | Enable **one-way** mode while held; next segment created will be one-way |

### Live Traffic Jam (Traffic page)

| Key        | Action                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------ |
| `R` (hold) | Flip the spawn heading 180° while held (preview + next spawn)                                    |
| `G`        | Toggle global green wave — force all traffic lights green, press again to restore normal cycling |

---

## Shortcuts Toolbar (`<shortcuts-toolbar>`)

A shared floating toolbar (`ts/panels/shortcutsToolbar.ts`, tag
`<shortcuts-toolbar>`) visualizes the keyboard shortcuts available on the current
page. It sits inside the `#simulatorToolbar` flex container next to the other
toolbar panels and is reused by the **World Editor**, **Live Traffic Jam**, and
**Training Simulator** pages — each page calls `setShortcuts(defs)` with only the
shortcuts it actually uses.

Each indicator is one of two kinds:

- **Momentary** (`S` / `E` / `C`, driving keys, `Ctrl`) — a one-shot or held key.
  Display-only: it flashes / lights when the key fires. Driving keys and `Ctrl`
  are flagged `display: true`, so the toolbar lights them itself from the
  physical keys; behavior stays in `Controls` / `Viewport`.
- **Toggle** (`O` one-way, `R` reverse heading) — a sticky mode key. **Click** the
  indicator to latch the mode on permanently (click again to release). The
  effective state is `latched OR key-held`, so you can still hold the physical
  key for a momentary effect while unlatched.

Component API:

| Method                  | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `setShortcuts(defs)`    | Render the indicators (grouped, in declaration order) |
| `flash(id)`             | Briefly highlight an indicator (one-shot action)      |
| `setActive(id, active)` | Set the lit state of an indicator                     |
| `setClickListener(fn)`  | Called with the indicator id when a toggle is clicked |

The owner (e.g. `GraphEditor`, `TrafficSimulator`) keeps the behavior and the
latch state, driving the indicator via `flash` / `setActive` and reacting to
clicks via `setClickListener`.

---

## Control Interface

All control systems ultimately set these four boolean flags, consumed by `Car.#move()`:

```typescript
interface ControlFlags {
  forward: boolean; // Accelerate
  left: boolean; // Steer left
  right: boolean; // Steer right
  reverse: boolean; // Decelerate / reverse
}
```

The `Car` class reads these flags once per frame during its physics update. The source of the flags is determined by the car's control type.

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

#### KEYS Mode — Human keyboard input

Registers `keydown` and `keyup` event listeners on `document`:

```typescript
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      this.forward = true;
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      this.left = true;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      this.right = true;
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      this.reverse = true;
      break;
  }
});

document.addEventListener('keyup', (e) => {
  // Same keys → set flag to false
});
```

Both arrow keys and WASD are supported simultaneously.

#### DUMMY Mode — Traffic cars

```typescript
// In constructor:
this.forward = true; // Permanently set
```

DUMMY cars drive straight ahead at constant speed. No event listeners are registered. They serve as obstacles for the AI to learn to avoid.

#### AI Mode — Neural network control

No event listeners registered. The `forward`/`left`/`right`/`reverse` flags are set externally by the neural network output each frame (see Physics.md → AI Integration).

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

### Tilt Detection (Steering)

Listens to `devicemotion` event for accelerometer data:

```typescript
window.addEventListener('devicemotion', (e) => {
  const gx = e.accelerationIncludingGravity.x;
  const gy = e.accelerationIncludingGravity.y;
  this.tilt = Math.atan2(gy, gx) - Math.PI / 2;
});
```

The tilt angle maps directly to the car's steering angle — tilting the phone left/right steers the car proportionally.

### Canvas Rotation (Immersive Feedback)

The entire game canvas rotates to match the phone's tilt for an immersive feel:

```typescript
const smoothingFactor = 0.4;
displayAngle = lerp(displayAngle, tilt, smoothingFactor);
canvas.style.transform = `rotate(${displayAngle}rad)`;
```

This creates the illusion that the road stays fixed while the phone (and car) rotate.

### Touch Controls (Acceleration)

```typescript
canvas.addEventListener('touchstart', () => {
  if (forward === 0) {
    forward = 1; // First tap: accelerate
    reverse = 0;
  } else {
    forward = 0; // Second tap: brake/reverse
    reverse = 1;
  }
});
```

Single tap toggles between forward and reverse. Simple one-finger interaction for mobile use.

### Integration with Car

The Race class applies phone controls to the car's angle and forward/reverse flags:

```typescript
// Each frame in Race:
if (this.phoneControls) {
  this.myCar.angle = this.phoneControls.tilt; // Direct angle control
  this.myCar.controls.forward = this.phoneControls.forward;
  this.myCar.controls.reverse = this.phoneControls.reverse;
}
```

### Activation

Phone mode is activated via URL parameter: `/html/race?mode=phone`

---

## Camera Controls (`ts/car/controls/cameraControls.ts`)

### Purpose

Controls the car by detecting colored markers in the webcam feed. The player holds or moves physical colored markers (blue objects) in front of the camera.

### Architecture

```
┌──────────────────────────────────────────────┐
│ Webcam Video Stream                          │
│   → getUserMedia() captures camera feed      │
└──────────────┬───────────────────────────────┘
               │ drawImage(video) each frame
┌──────────────▼───────────────────────────────┐
│ Canvas Frame Buffer                          │
│   → getImageData() extracts pixel array      │
└──────────────┬───────────────────────────────┘
               │ pixel RGB analysis
┌──────────────▼───────────────────────────────┐
│ MarkerDetector                               │
│   → Finds blue pixels (R<100, G<100, B>150)  │
│   → K-means clustering (K=2)                 │
│   → Returns two marker center positions      │
└──────────────┬───────────────────────────────┘
               │ marker positions
┌──────────────▼───────────────────────────────┐
│ CameraControls                               │
│   → Converts marker positions to car inputs  │
│   → Left/right based on marker arrangement   │
│   → Forward based on marker distance         │
└──────────────────────────────────────────────┘
```

### Marker Detection (`ts/car/controls/markerDetector.ts`)

```typescript
class MarkerDetector {
  detect(imageData: ImageData): { markers: Point[]; debug: ImageData };
}
```

**Detection algorithm:**

1. Scan all pixels in the frame
2. Identify "blue" pixels where: R < 100 AND G < 100 AND B > 150
3. Collect all blue pixel positions
4. Run K-means clustering with K=2 to find two marker centers
5. Return the two cluster centroids as marker positions

**K-means clustering:**

- Initialize two centroids at random blue pixel positions
- Iterate: assign each blue pixel to nearest centroid, recompute centroids
- Converge after ~10 iterations
- Result: two marker center points

### Steering Logic

```typescript
// Two markers detected: compute angle between them
const markerAngle = Math.atan2(marker2.y - marker1.y, marker2.x - marker1.x);

// Map to car controls
controls.left = markerAngle > threshold;
controls.right = markerAngle < -threshold;
controls.forward = markerDistance < maxDistance;
```

The relative position and distance of the two markers controls the car.

### Activation

Camera mode is activated via URL parameter: `/html/race?mode=camera`

Requires user permission for webcam access (`navigator.mediaDevices.getUserMedia`).

---

## Control Mode Selection (Race)

The Race class selects the appropriate control system based on URL parameters:

```typescript
const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');

switch (mode) {
  case 'phone':
    controls = null; // PhoneControls created separately
    break;
  case 'camera':
    controls = null; // CameraControls created separately
    break;
  default:
    controls = new Controls('KEYS'); // Standard keyboard
    break;
}
```

| URL Parameter  | Control System                      | Input Device  |
| -------------- | ----------------------------------- | ------------- |
| (none)         | `Controls('KEYS')`                  | Keyboard      |
| `?mode=phone`  | `PhoneControls`                     | Accelerometer |
| `?mode=camera` | `CameraControls` + `MarkerDetector` | Webcam        |

---

## Controls in Training (Simulator)

The simulator always creates one KEYS car alongside the AI population:

```typescript
// In getStartInfo callback, first car is KEYS type:
createCarsForTraining(1, 'KEYS', config, startInfo); // Player car
createCarsForTraining(count, 'AI', config, startInfo); // AI population
```

This allows the user to:

- Drive manually alongside AI cars
- Switch camera tracking to follow the KEYS car
- Compare human vs AI performance in real-time

The KEYS car is never subject to genetic algorithm operations (selection, mutation, crossover) — it's purely for the human player.
