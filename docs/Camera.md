# Camera & 3D Rendering

The camera system in `ts/camera/` provides pseudo-3D perspective rendering by projecting 2D world geometry into a first-person viewpoint.

---

## File Structure (`ts/camera/`)

| File           | Responsibility                                                         |
| -------------- | ---------------------------------------------------------------------- |
| `types.ts`     | Interfaces (`ICameraPoint`, `IColoredPolygon`, `ICameraRenderOptions`) |
| `extrusion.ts` | Pure geometry functions for 3D extrusion (buildings, cars, trees)      |
| `camera.ts`    | Camera class (movement, frustum, projection, filtering, rendering)     |

---

## Camera Class (`ts/camera/camera.ts`)

### Structure

```typescript
interface ICameraPoint {
  x: number;
  y: number;
  angle: number;
}

interface ICameraRenderOptions {
  keyCar?: Car;               // The car the camera follows (always extruded as detailed 3D)
  bestCar?: Car;              // Best AI car (extruded with gold highlight)
  traffic?: Car[];            // Traffic cars (extruded as smaller 3D shapes)
  debugCtx?: CanvasRenderingContext2D; // Optional debug context for raw polygon drawing
}

class Camera implements ICameraPoint {
  // Position
  x, y: number           // World position
  z: number              // Height (elevation, fixed at -40)
  angle: number          // Heading direction

  // Configuration
  range: number          // View distance (default 1000)
  distanceBehind: number // Offset behind target car (default 100)

  // Frustum points
  center: Point          // Camera position
  tip: Point             // Front of view cone
  left: Point            // Left edge of view (45° left)
  right: Point           // Right edge of view (45° right)
  polygon: Polygon       // View frustum as triangle polygon (for culling)

  // Methods
  move(target: ICameraPoint): void
  simpleMove(target: ICameraPoint): void
  render(ctx, world, options?: ICameraRenderOptions): void
  draw(ctx: CanvasRenderingContext2D): void
}
```

---

## Camera Movement

### Smooth Following (`move`)

```typescript
move(target: ICameraPoint) {
  const t = 0.15  // Interpolation factor (smoothing)
  this.x = lerp(this.x, target.x + distanceBehind * sin(angle), t)
  this.y = lerp(this.y, target.y + distanceBehind * cos(angle), t)
  this.angle = lerp(this.angle, target.angle, t)
  this.#updateFrustumPoints()
}
```

The camera smoothly follows the target car with a lag factor of 0.15, creating natural-feeling camera movement without jarring snaps.

### Instant Snap (`simpleMove`)

Sets position directly without interpolation — used for initial placement or teleportation.

### Frustum Update (`#updateFrustumPoints`)

```
center = (x, y)   // Camera's own position

tip = (x - sin(angle) * range,
       y - cos(angle) * range)

left = (x - sin(angle - π/4) * range,
        y - cos(angle - π/4) * range)

right = (x - sin(angle + π/4) * range,
         y - cos(angle + π/4) * range)

polygon = Polygon([center, left, right])  // Triangle frustum (90° FOV)
```

---

## View Frustum Culling (`#filter`)

Before rendering, all world polygons are tested against the camera's triangular view frustum:

```typescript
#filter(polygons: Polygon[]): Polygon[] {
  for (const polygon of polygons) {
    if (polygon.intersectsPolygon(this.polygon)) {
      // Break at intersection, keep points inside frustum
      ...
    } else if (this.polygon.containsPolygon(polygon)) {
      // Fully inside — keep as is
    }
  }
}
```

Only polygons that overlap or are inside the frustum are rendered. Polygons that intersect the frustum boundary are clipped at the intersection points.

---

## 3D Projection (`#projectPoint`)

Converts world 2D+Z coordinates to screen perspective coordinates:

```typescript
#projectPoint(ctx: CanvasRenderingContext2D, p: Point): Point {
  // Project p onto camera's forward axis (center → tip)
  const segment = new Segment(this.center, this.tip)
  const { point: p1 } = segment.projectPoint(p)

  // Lateral offset via cross product
  const c = cross(subtract(p1, camera), subtract(p, camera))
  const x = (sign(c) * distance(p, p1)) / distance(camera, p1)

  // Vertical offset from Z
  const y = (p.z - this.z) / distance(camera, p1)

  // Scale to canvas coordinates
  const scaler = max(canvas.width / 2, canvas.height / 2)
  return new Point(cX + x * scaler, cY + y * scaler)
}
```

Objects further away appear smaller and closer to the horizon. Objects to the left/right of the camera direction are offset horizontally.

---

## 3D Extrusion

### Buildings (`#extrude`)

Converts flat 2D polygons into 3D prisms (sides + ceiling):

```typescript
#extrude(polygons: Polygon[], height: number = 10): Polygon[] {
  // For each polygon:
  //   1. Create ceiling by copying points with z = -height
  //   2. Create side quads connecting base edges to ceiling edges
  //   3. Return [...sides, ceiling]
}
```

### Trees (`#extrudeTrees`)

Creates simple cone shapes from base polygons to a single centroid peak. This approach is robust regardless of how many base points survive the camera frustum clipping:

```typescript
#extrudeTrees(polygons: Polygon[], height: number = 200): Polygon[] {
  for (const polygon of polygons) {
    // Calculate centroid of base as the peak point
    const centroid = getCentroid(polygon.points)
    centroid.z = -height

    // Create triangular faces from each base edge to the peak
    for (let i = 0; i < polygon.points.length; i++) {
      sides.push(new Polygon([points[i], points[i+1], centroid]))
    }
  }
}
```

### Cars (`#extrudeCar`)

Creates a detailed car model with:

- Tapered front/back
- Base polygon with 10 points (front, quarter, middle, quarter, back × 2 sides)
- Lower sides (base → midline), upper sides (midline → ceiling)
- Shaped roof with sloped front/back

---

## Render Options & Car Extrusion

The `render` method accepts `ICameraRenderOptions` to control which cars are extruded:

| Option    | Style                                             | Purpose                                         |
| --------- | ------------------------------------------------- | ----------------------------------------------- |
| `keyCar`  | Car's own color, full detail                      | The car the camera follows (player/tracked car) |
| `bestCar` | Gold highlight (`rgba(255, 200, 0, 0.6)`)         | Best AI car when different from keyCar          |
| `traffic` | Car's own color, slightly smaller (h=12, wheel=4) | Traffic/opponent cars                           |

**Fallback behavior:** If no `keyCar` is provided, `world.bestCar` is used as the extruded car (backward compatible).

**Car shadows:** All `world.cars` that are NOT the `keyCar` or `bestCar` are drawn as flat gray shadows on the ground.

### Usage in Simple Mode Simulator

```typescript
const keysCar = cars.find((c) => c.type === 'KEYS');
camera.move(bestCar);
camera.render(cameraCtx, world, {
  keyCar: keysCar || bestCar,
  bestCar: keysCar ? bestCar : undefined,
  traffic: this.traffic,
});
```

### Usage in World Mode Simulator

```typescript
const keysCar = cars.find((c) => c.type === 'KEYS');
camera.move(cameraTarget);
camera.render(cameraCtx, world, {
  keyCar: keysCar || currentBestCar,
  bestCar: keysCar ? currentBestCar : undefined,
  debugCtx,
});
```

### Usage in Race Game

```typescript
camera.move(myCar);
camera.render(cameraCtx, world, {
  keyCar: myCar,
  traffic: cars.filter((c) => c !== myCar),
});
```

---

## Rendering Pipeline (`render`)

```
1. Gather world geometry (buildings, trees, road borders)
2. Filter by frustum (cull/clip invisible objects)
3. Extrude filtered polygons to 3D:
   - Buildings: height 200, gray
   - Trees: cone shape, green
   - Roads: height 10
   - Key car: full detail car model
   - Best car: full detail, gold
   - Traffic: slightly smaller car models
4. Project all 3D polygon points to 2D screen space
5. Draw in layer order with fog effect:
   alpha = max(0, (1 - distance/range)²)
6. Optionally draw raw polygons to debug context
```

### Layer Order (back to front)

1. Car shadows (flat, gray)
2. Road polygons
3. Building polygons
4. Tree polygons
5. Traffic car polygons
6. Best car polygons
7. Key car polygons (always on top)

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
