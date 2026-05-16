# Mathematical Foundations

The simulation relies on a robust set of geometric primitives and utility functions located in `ts/math/`. These are used for everything from road generation to collision detection.

## Geometric Primitives (`ts/math/primitives/`)

### Point

The fundamental unit of position.

- **Properties**: `x`, `y`
- **Utility**: Supports distance calculations, interpolation (`lerp`), and basic vector operations (add, scale).

### Segment

Connects two `Point` objects.

- **Properties**: `p1`, `p2`
- **Key Methods**:
  - `distanceToPoint(p)`: Calculates the shortest distance from a point to the segment.
  - `getIntersection(s)`: Finds the intersection point between two segments.
  - `projectPoint(p)`: Projects a point onto the segment's line.

### Polygon

A collection of points forming a closed shape.

- **Usage**: Used for car bodies, road borders, buildings, and collision masks.
- **Key Methods**:
  - `containsPoint(p)`: Checks if a point is inside the polygon.
  - `intersectsPolygon(poly)`: Checks for collision between two polygons.
  - `union(polygons)`: A static method that merges multiple polygons into a single set of segments (used for generating road boundaries).

### Envelope

A specialized primitive that creates a polygon around a segment with a specified width and roundness.

- **Usage**: The primary way roads and buildings are generated from the graph's segments.

## Graph System (`ts/math/graph/`)

The `Graph` class manages the road network.

- **Nodes**: A collection of `Point` objects.
- **Edges**: A collection of `Segment` objects connecting the nodes.
- **Operations**: Adding/removing points and segments, finding the nearest point, and finding the shortest path (used for the `Corridor` generation).

## Utility Functions (`ts/math/utils.ts`)

- `lerp(a, b, t)`: Linear interpolation between two values.
- `lerp2D(p1, p2, t)`: Linear interpolation between two points.
- `distance(p1, p2)`: Euclidean distance between two points.
- `getIntersection(A, B, C, D)`: Calculates the intersection point of segments AB and CD.
- `polysIntersect(poly1, poly2)`: Determines if two polygons collide by checking for segment intersections.
- `normalize(p)`: Converts a point to a unit vector.
- `dot(p1, p2)`: Dot product of two vectors.
