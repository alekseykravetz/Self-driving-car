# Camera & 3D Rendering

The camera system in `ts/camera.ts` provides pseudo-3D perspective rendering by projecting 2D world geometry into a first-person viewpoint.

---

## Camera Class (`ts/camera.ts`)

### Structure

```typescript
interface ICameraPoint {
  x: number
  y: number
  angle: number
}

class Camera {
  // Position
  x, y: number           // World position
  z: number              // Height (elevation)
  angle: number          // Heading direction

  // Configuration
  range: number          // View distance
  distanceBehind: number // Offset behind target car

  // Frustum points
  center: Point          // Camera position
  tip: Point             // Front of view cone
  left: Point            // Left edge of view
  right: Point           // Right edge of view
  polygon: Polygon       // View frustum as polygon (for culling)

  // Methods
  move(target: ICameraPoint): void
  simpleMove(target: ICameraPoint): void
  draw(ctx: CanvasRenderingContext2D): void
}
```

---

## Camera Movement

### Smooth Following (`move`)

```typescript
move(target: ICameraPoint) {
  const t = 0.15  // Interpolation factor (smoothing)
  this.x = lerp(this.x, target.x, t)
  this.y = lerp(this.y, target.y, t)
  this.angle = lerpAngle(this.angle, target.angle, t)
  this.#updateFrustumPoints()
}
```

The camera smoothly follows the target car with a lag factor of 0.15, creating natural-feeling camera movement without jarring snaps.

### Instant Snap (`simpleMove`)

Sets position directly without interpolation — used for initial placement or teleportation.

### Frustum Update (`#updateFrustumPoints`)

```
center = (x - sin(angle) * distanceBehind,
          y - cos(angle) * distanceBehind)

tip = (x - sin(angle) * range,
       y - cos(angle) * range)

left = (center.x - sin(angle - fov/2) * range,
        center.y - cos(angle - fov/2) * range)

right = (center.x - sin(angle + fov/2) * range,
         center.y - cos(angle + fov/2) * range)

polygon = Polygon([center, left, right])  // Triangle frustum
```

---

## View Frustum Culling (`#filter`)

Before rendering, all world polygons are tested against the camera's triangular view frustum:

```typescript
#filter(polygons: Polygon[]): Polygon[] {
  return polygons.filter(poly =>
    poly.intersectsPolygon(this.polygon) ||
    this.polygon.containsPolygon(poly)
  )
}
```

Only polygons that overlap or are inside the frustum are rendered. This significantly reduces draw calls for large worlds.

---

## 3D Projection (`#projectPoint`)

Converts world 2D coordinates to screen perspective coordinates:

```typescript
#projectPoint(ctx: CanvasRenderingContext2D, p: Point): Point {
  // Vector from camera center to point
  const seg = new Segment(this.center, p)
  const dist = seg.length()

  // Forward distance (dot product with camera direction)
  const forwardDist = dot(subtract(p, this.center), cameraDirection)

  // Lateral offset (cross product for screen X)
  const lateralDist = cross(subtract(p, this.center), cameraDirection)

  // Perspective division
  const screenX = ctx.canvas.width / 2 + (lateralDist / forwardDist) * focalLength
  const screenY = ctx.canvas.height / 2 - (p.z / forwardDist) * focalLength

  return new Point(screenX, screenY)
}
```

Objects further away appear smaller and closer to the horizon. Objects to the left/right of the camera direction are offset horizontally.

---

## 3D Extrusion (`#extrude`)

Converts flat 2D polygons (buildings, trees) into 3D prisms:

```typescript
#extrude(polygons: Polygon[], height: number): Polygon[] {
  const result = []
  for (const poly of polygons) {
    // Create top face by projecting each point upward
    const topPoints = poly.points.map(p =>
      this.#projectPoint(ctx, new Point(p.x, p.y, height))
    )
    const bottomPoints = poly.points.map(p =>
      this.#projectPoint(ctx, new Point(p.x, p.y, 0))
    )

    // Create side faces connecting bottom edges to top edges
    for (let i = 0; i < poly.points.length; i++) {
      const next = (i + 1) % poly.points.length
      result.push(new Polygon([
        bottomPoints[i], bottomPoints[next],
        topPoints[next], topPoints[i]
      ]))
    }

    // Add top face
    result.push(new Polygon(topPoints))
  }
  return result
}
```

---

## Rendering Pipeline (`draw`)

```
1. Get all world polygons (buildings, trees, road borders)
2. Filter by frustum (cull invisible objects)
3. For each visible polygon:
   a. Project all points to screen space
   b. Extrude to create 3D faces (sides + top)
4. Sort all faces by average distance to camera (far → near)
5. Draw in order (painter's algorithm — far objects first)
6. Apply depth-based shading (darker = further)
```

### Depth Shading

Objects further from the camera are drawn slightly darker, creating a fog/depth effect:

```
alpha = 1 - (distance / maxRange)
fillColor = rgba(baseColor, alpha)
```

---

## Usage in Simulators

### Camera View Simulator

```typescript
const camera = new Camera(gameCanvas.width, gameCanvas.height);

// Each frame:
camera.move({ x: myCar.x, y: myCar.y, angle: myCar.angle });
camera.draw(cameraCtx); // Renders 3D view
```

### Race Mode

```typescript
// Split screen: world view (left) + camera view (right)
camera.move(myCar);
world.draw(worldCtx, viewPoint); // Top-down
camera.draw(cameraCtx); // 3D perspective
```

---

## `getFake3dPoint` Utility (`ts/math/utils.ts`)

A simpler perspective projection used for individual items (buildings, trees) in the top-down view:

```typescript
function getFake3dPoint(point: Point, viewPoint: Point, height: number): Point {
  const dir = normalize(subtract(point, viewPoint));
  const dist = distance(point, viewPoint);
  const scaler = Math.atan(dist / 300) / (Math.PI / 2);
  return add(point, scale(dir, height * scaler));
}
```

This creates a "pseudo-3D" effect in the top-down view by offsetting building tops away from the viewer, giving a parallax depth illusion without full perspective projection.

---

## Experimental: AI Camera (`ts/camera_new_ai_ver.ts`)

A work-in-progress alternative camera implementation designed for vision-based AI training. Currently contains commented-out experimental code for:

- Direct pixel-based environment perception
- Frame-by-frame image analysis for neural network input
- Alternative to ray-casting sensor system
