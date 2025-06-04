'use strict';
// // --- Constants ---
// const INTERPOLATION_FACTOR: number = 0.15;
// const DEFAULT_CAMERA_Z: number = -40;
// const DEFAULT_RANGE: number = 1000;
// const DEFAULT_DISTANCE_BEHIND: number = 100;
// const DEFAULT_HORIZONTAL_FOV_ANGLE: number = Math.PI / 4; // Angle from center to edge (total FOV is this * 2) 45 degrees left and 45 degrees right
// const FOG_FALLOFF_EXPONENT: number = 2;
// // Extrusion/Model Constants
// const BUILDING_HEIGHT: number = 200;
// const ROAD_HEIGHT: number = 10;
// const TREE_CANOPY_HEIGHT: number = 200;
// const TREE_TRUNK_HEIGHT: number = 40;
// const TREE_TRUNK_TAPER: number = 0.4;
// const CAR_HEIGHT: number = 15;
// const CAR_WHEEL_RADIUS_OFFSET: number = 5;
// const CAR_TAPER_FRONT: number = 0.2;
// const CAR_TAPER_BACK: number = 0.1;
// const CAR_TAPER_SIDES: number = 0.1;
// const CAR_ROOF_TAPER: number = 0.3; // Default for #moveInward
// const CAR_ROOF_FRONT_LIFT: number = 7;
// const CAR_ROOF_QUARTER_FRONT_LIFT: number = 6;
// const CAR_ROOF_BACK_LIFT: number = 4;
// // Style Defaults (can be overridden)
// const DEFAULT_BUILDING_STYLE = {
//   fill: 'rgba(150, 150, 150, 0.2)',
//   stroke: 'rgba(150, 150, 150, 0.2)',
// };
// const DEFAULT_TREE_TRUNK_STYLE = {
//   fill: 'rgba(150, 150, 150, 0.2)',
//   stroke: 'rgba(150, 150, 150, 0.2)',
// };
// const DEFAULT_TREE_CANOPY_STYLE = {
//   fill: 'rgba(34, 196, 74, 0.2)',
//   stroke: 'rgba(34, 196, 74, 0.2)',
// };
// const DEFAULT_CAR_SHADOW_STYLE = {
//   fill: 'rgba(220, 220, 220, 1)',
//   stroke: 'rgba(0, 0, 0, 0)',
// };
// const DEFAULT_ROAD_STYLE = {
//   fill: 'rgba(80, 80, 80, 0.5)',
//   stroke: 'rgba(80, 80, 80, 0.5)',
// }; // Example road style
// // --- Interfaces ---
// /** Represents the target position and angle the camera should follow. */
// interface ICameraPoint {
//   x: number;
//   y: number;
//   angle: number;
// }
// /** Represents a polygon combined with its rendering style. */
// interface RenderablePolygon {
//   polygon: Polygon;
//   style: {
//     fill: string;
//     stroke: string;
//   };
//   // Store original distance for sorting/fog (calculated later)
//   distanceToCamera?: number;
// }
// /**
//  * Represents a camera in a 2D/3D environment, handling projection and rendering.
//  */
// class Camera {
//   // Implement Point interface as Camera has x, y, z
//   public x!: number;
//   public y!: number;
//   public z!: number;
//   public angle!: number;
//   public range: number;
//   public distanceBehind: number;
//   public horizontalFovAngle: number; // Angle from center to edge
//   public center!: Point; // Camera's 3D position
//   public tip!: Point; // Point directly in front at max range
//   public left!: Point; // Left corner of the view frustum base
//   public right!: Point; // Right corner of the view frustum base
//   public polygon!: Polygon; // 2D View frustum polygon (on XY plane)
//   /**
//    * Creates a Camera instance.
//    * @param initialTarget - The initial {x, y, angle} the camera should follow.
//    * @param range - The viewing distance range of the camera.
//    * @param distanceBehind - How far behind the target position the camera stays.
//    * @param horizontalFovAngle - The angle (in radians) from the center view axis to the left/right edge.
//    */
//   constructor(
//     initialTarget: ICameraPoint,
//     range: number = DEFAULT_RANGE,
//     distanceBehind: number = DEFAULT_DISTANCE_BEHIND,
//     horizontalFovAngle: number = DEFAULT_HORIZONTAL_FOV_ANGLE,
//   ) {
//     this.range = range;
//     this.distanceBehind = distanceBehind;
//     this.horizontalFovAngle = horizontalFovAngle;
//     this.simpleMove(initialTarget); // Initialize position
//   }
//   /**
//    * Moves the camera smoothly towards a target position and angle using interpolation.
//    * @param target - The target {x, y, angle} to move towards.
//    */
//   move(target: ICameraPoint): void {
//     // Interpolate camera position towards a point behind the target
//     this.x = lerp(
//       this.x,
//       target.x + this.distanceBehind * Math.sin(target.angle),
//       INTERPOLATION_FACTOR,
//     );
//     this.y = lerp(
//       this.y,
//       target.y + this.distanceBehind * Math.cos(target.angle),
//       INTERPOLATION_FACTOR,
//     );
//     this.z = DEFAULT_CAMERA_Z; // Keep Z constant
//     // Interpolate camera angle
//     this.angle = lerp(this.angle, target.angle, INTERPOLATION_FACTOR);
//     // Update camera view frustum points based on new position/angle
//     this.#updateFrustumPoints();
//   }
//   /**
//    * Moves the camera instantly to a position and angle without interpolation.
//    * @param target - The target {x, y, angle} to snap to.
//    */
//   simpleMove(target: ICameraPoint): void {
//     // Set camera position directly to a point behind the target
//     this.x = target.x + this.distanceBehind * Math.sin(target.angle);
//     this.y = target.y + this.distanceBehind * Math.cos(target.angle);
//     this.z = DEFAULT_CAMERA_Z; // Keep Z constant
//     this.angle = target.angle;
//     // Update camera view frustum points based on new position/angle
//     this.#updateFrustumPoints();
//   }
//   /**
//    * Updates the points defining the camera's view frustum (center, tip, left, right)
//    * and the view polygon based on the current camera state.
//    */
//   #updateFrustumPoints(): void {
//     this.center = new Point(this.x, this.y, this.z); // Camera's own position
//     // Point directly in front of the camera at max range
//     this.tip = new Point(
//       this.x - this.range * Math.sin(this.angle),
//       this.y - this.range * Math.cos(this.angle),
//       this.z, // Assume tip is at same Z for frustum base definition
//     );
//     // Left corner of the view frustum base
//     this.left = new Point(
//       this.x - this.range * Math.sin(this.angle - this.horizontalFovAngle),
//       this.y - this.range * Math.cos(this.angle - this.horizontalFovAngle),
//       this.z,
//     );
//     // Right corner of the view frustum base
//     this.right = new Point(
//       this.x - this.range * Math.sin(this.angle + this.horizontalFovAngle),
//       this.y - this.range * Math.cos(this.angle + this.horizontalFovAngle),
//       this.z,
//     );
//     // Define the 2D view polygon (triangle base on XY plane) for filtering
//     this.polygon = new Polygon([this.center, this.left, this.right]);
//   }
//   /**
//    * Projects a 3D point onto the 2D canvas based on the camera's perspective.
//    * @param ctx - The canvas rendering context (used for canvas dimensions).
//    * @param p - The 3D Point to project.
//    * @returns The projected 2D Point on the canvas.
//    */
//   //  #projectPoint(ctx: CanvasRenderingContext2D, p: Point): Point {
//   //   // Project onto the camera's forward vector (center to tip)
//   //   const segment: Segment = new Segment(this.center, this.tip);
//   //   const { point: p1 }: { point: Point; offset: number } =
//   //     segment.projectPoint(p); // p1 is projection of p onto camera axis
//   //   // Calculate perpendicular distance (x-offset) using cross product
//   //   const thisPoint = new Point(this.x, this.y); // 'this' refers to camera center (Point)
//   //   const c: number = cross(subtract(p1, thisPoint), subtract(p, thisPoint));
//   //   // Normalize x-offset by distance along the camera axis
//   //   const x: number =
//   //     (Math.sign(c) * distance(p, p1)) / distance(thisPoint, p1);
//   //   // Calculate y-offset based on Z difference and distance along camera axis
//   //   const y: number = (p.z - this.z) / distance(thisPoint, p1);
//   //   // Scale projected coordinates to canvas coordinates
//   //   const cX: number = ctx.canvas.width / 2;
//   //   const cY: number = ctx.canvas.height / 2;
//   //   const scaler: number = Math.max(cX, cY); // Scaling factor based on canvas size
//   //   return new Point(cX + x * scaler, cY + y * scaler);
//   // }
//   /**
//    * Projects a 3D point into normalized 2D view coordinates (-1 to 1 range typically).
//    * @param p - The 3D Point to project.
//    * @returns The projected 2D Point in normalized view space, or null if behind camera.
//    */
//   #projectPoint(p: Point): Point | null {
//     // Translate point relative to camera position
//     const dx = p.x - this.center.x;
//     const dy = p.y - this.center.y;
//     const dz = p.z - this.center.z;
//     // Rotate point according to camera angle (around Z axis)
//     const rotatedX = dx * Math.cos(this.angle) - dy * Math.sin(this.angle);
//     const rotatedY = dx * Math.sin(this.angle) + dy * Math.cos(this.angle);
//     const rotatedZ = dz;
//     // Basic perspective projection
//     // Check if point is behind the camera's near plane (approximated by rotatedY)
//     // A small positive value avoids division by zero or near-zero.
//     const nearPlaneDist = 0.1;
//     if (rotatedY >= -nearPlaneDist) {
//       // Point is behind or too close
//       return null; // Don't project points behind the camera
//     }
//     // Calculate perspective projection factor (adjust 'focalLength' as needed)
//     // A larger focal length means less perspective distortion (more orthographic)
//     // A smaller focal length means more perspective distortion (wider angle effect)
//     // We can relate focal length to FOV. tan(fov/2) = (view_width/2) / focalLength
//     // Let's use range as a proxy for focal length for simplicity here,
//     // or derive a proper focal length from FOV if needed.
//     // Using range might not be physically accurate but gives a scaling effect.
//     // A more common approach uses a fixed focal length or derives it from FOV.
//     // Let's use a simplified approach where projection scale depends on distance.
//     const perspectiveFactor = this.range / -rotatedY; // Project onto a plane at distance 'range'
//     // Normalized coordinates (usually -1 to 1 or 0 to 1)
//     // Adjust the scaling based on FOV if needed for accurate perspective
//     const normalizedX = (rotatedX * perspectiveFactor) / this.range; // Scale relative to range/fov
//     const normalizedY = (rotatedZ * perspectiveFactor) / this.range; // Scale relative to range/fov
//     // Return a new point with normalized coordinates (z can be used for depth buffering)
//     // We store the original distance (rotatedY) in z for potential depth sorting later.
//     return new Point(normalizedX, normalizedY, -rotatedY);
//   }
//   /**
//    * Filters a list of base polygons, keeping only those intersecting or contained
//    * within the camera's 2D view frustum polygon.
//    * Breaks intersecting polygons at the intersection points.
//    * @param basePolygons - An array of 2D Polygons (bases on XY plane) to filter.
//    * @returns An array of filtered and potentially modified Polygons.
//    */
//   #filterBasePolygons(basePolygons: Polygon[]): Polygon[] {
//     const filteredPolygons: Polygon[] = [];
//     for (const basePolygon of basePolygons) {
//       // Ensure the polygon has points
//       if (!basePolygon || basePolygon.points.length === 0) {
//         continue;
//       }
//       // Check for intersection or containment with the camera's 2D view polygon
//       if (basePolygon.intersectsPolygon(this.polygon)) {
//         // Create copies to avoid modifying originals if they are reused elsewhere
//         const copy1: Polygon = new Polygon(basePolygon.points);
//         const copy2: Polygon = new Polygon(this.polygon.points);
//         // Break polygons at intersections (modifies copy1 and copy2)
//         Polygon.break(copy1, copy2, true); // Mark intersection points
//         // Get points from the modified polygon (copy1)
//         const points: Point[] = copy1.segments.map(
//           (segment: Segment) => segment.p1,
//         );
//         // Keep points that are intersection points OR are inside the camera view
//         const filteredPoints: Point[] = points.filter(
//           (point: Point) =>
//             point.intersection || this.polygon.containsPoint(point),
//         );
//         // Create a new polygon from the filtered points if any exist
//         if (filteredPoints.length >= 3) {
//           // Need at least 3 points for a polygon
//           filteredPolygons.push(new Polygon(filteredPoints));
//         }
//       } else if (this.polygon.containsPolygon(basePolygon)) {
//         // If the polygon is fully contained within the view, keep it as is
//         filteredPolygons.push(basePolygon); // Keep original if fully contained
//       }
//     }
//     return filteredPolygons;
//   }
//   /**
//    * Extrudes 2D polygons vertically to create 3D shapes.
//    * @param basePolygons - An array of 2D Polygons (bases).
//    * @param height - The extrusion height.
//    * @param style - The style to apply to the extruded polygons.
//    * @returns An array of 3D RenderablePolygons representing the extruded shapes.
//    */
//   #extrude(
//     basePolygons: Polygon[],
//     height: number,
//     style: { fill: string; stroke: string },
//   ): RenderablePolygon[] {
//     const extrudedRenderables: RenderablePolygon[] = [];
//     for (const basePolygon of basePolygons) {
//       if (!basePolygon || basePolygon.points.length < 3) continue;
//       // Create the ceiling polygon by copying points and setting Z coordinate
//       const ceilingPoints = basePolygon.points.map(
//         (point: Point) => new Point(point.x, point.y, -height), // Negative Z is 'up' in this context
//       );
//       const ceilingPoly = new Polygon(ceilingPoints);
//       extrudedRenderables.push({ polygon: ceilingPoly, style: style });
//       // Create side polygons connecting base points to ceiling points
//       for (let i = 0; i < basePolygon.points.length; i++) {
//         const p1_base = basePolygon.points[i];
//         const p2_base = basePolygon.points[(i + 1) % basePolygon.points.length];
//         const p1_ceil = ceilingPoly.points[i];
//         const p2_ceil = ceilingPoly.points[(i + 1) % ceilingPoly.points.length];
//         const sidePoly = new Polygon([p1_base, p2_base, p2_ceil, p1_ceil]);
//         extrudedRenderables.push({ polygon: sidePoly, style: style });
//       }
//     }
//     return extrudedRenderables;
//   }
//   /**
//    * Creates a detailed 3D car model from a base polygon.
//    * Assumes base polygon points are [frontRight, frontLeft, backLeft, backRight].
//    * @param basePolygon - The base 2D Polygon of the car.
//    * @param style - The style for the car body parts.
//    * @returns An array of 3D RenderablePolygons representing the car model.
//    */
//   #createCarModel(
//     basePolygon: Polygon | null,
//     style: { fill: string; stroke: string },
//   ): RenderablePolygon[] {
//     if (!basePolygon || basePolygon.points.length < 4) {
//       // console.warn('Cannot create car model: Invalid base polygon provided.');
//       return []; // Return empty if polygon is invalid
//     }
//     // --- Define key points on the car base (create copies) ---
//     const fr_base = new Point(basePolygon.points[0].x, basePolygon.points[0].y);
//     const fl_base = new Point(basePolygon.points[1].x, basePolygon.points[1].y);
//     const bl_base = new Point(basePolygon.points[2].x, basePolygon.points[2].y);
//     const br_base = new Point(basePolygon.points[3].x, basePolygon.points[3].y);
//     // Calculate intermediate points along the sides
//     const ml_base = average(fl_base, bl_base);
//     const mr_base = average(fr_base, br_base);
//     const qfl_base = average(fl_base, ml_base);
//     const qbl_base = average(bl_base, ml_base);
//     const qfr_base = average(fr_base, mr_base);
//     const qbr_base = average(br_base, mr_base);
//     // --- Modify base shape for detail (e.g., tapering) ---
//     this.#moveInward(fl_base, fr_base, CAR_TAPER_FRONT);
//     this.#moveInward(bl_base, br_base, CAR_TAPER_BACK);
//     // --- Create the detailed base polygon points ---
//     const detailedBasePoints = [
//       fl_base,
//       qfl_base,
//       ml_base,
//       qbl_base,
//       bl_base,
//       br_base,
//       qbr_base,
//       mr_base,
//       qfr_base,
//       fr_base,
//     ];
//     // Offset base points down by wheel radius
//     for (const point of detailedBasePoints) {
//       point.z = (point.z || 0) - CAR_WHEEL_RADIUS_OFFSET;
//     }
//     const base = new Polygon(detailedBasePoints);
//     // --- Create ceiling and midline polygons ---
//     const ceilingPoints = base.points.map(
//       (p: Point) => new Point(p.x, p.y, -CAR_HEIGHT),
//     );
//     const midLinePoints = base.points.map(
//       (p: Point) => new Point(p.x, p.y, -CAR_HEIGHT / 2),
//     );
//     const ceiling = new Polygon(ceilingPoints);
//     const midLine = new Polygon(midLinePoints);
//     // --- Modify ceiling shape for roofline ---
//     const [c_fl, c_qfl, c_ml, c_qbl, c_bl, c_br, c_qbr, c_mr, c_qfr, c_fr] =
//       ceiling.points; // Get references
//     // Adjust Z coordinates for sloped roof
//     c_fl.z += CAR_ROOF_FRONT_LIFT;
//     c_fr.z += CAR_ROOF_FRONT_LIFT;
//     c_qfl.z += CAR_ROOF_QUARTER_FRONT_LIFT;
//     c_qfr.z += CAR_ROOF_QUARTER_FRONT_LIFT;
//     c_bl.z += CAR_ROOF_BACK_LIFT;
//     c_br.z += CAR_ROOF_BACK_LIFT;
//     // Taper the ceiling inwards
//     this.#moveInward(c_fl, c_fr, CAR_ROOF_TAPER);
//     this.#moveInward(c_qfl, c_qfr, CAR_ROOF_TAPER);
//     this.#moveInward(c_ml, c_mr, CAR_ROOF_TAPER);
//     this.#moveInward(c_qbl, c_qbr, CAR_ROOF_TAPER);
//     this.#moveInward(c_bl, c_br, CAR_ROOF_TAPER);
//     this.#moveInward(c_fl, c_bl, CAR_TAPER_SIDES); // Taper sides slightly
//     this.#moveInward(c_fr, c_br, CAR_TAPER_SIDES);
//     // --- Create side polygons (split at midline) ---
//     const renderables: RenderablePolygon[] = [];
//     // Lower sides (base to midline)
//     for (let i = 0; i < base.points.length; i++) {
//       renderables.push({
//         polygon: new Polygon([
//           base.points[i],
//           base.points[(i + 1) % base.points.length],
//           midLine.points[(i + 1) % midLine.points.length],
//           midLine.points[i],
//         ]),
//         style: style,
//       });
//     }
//     // Upper sides (midline to ceiling)
//     for (let i = 0; i < base.points.length; i++) {
//       renderables.push({
//         polygon: new Polygon([
//           midLine.points[i],
//           midLine.points[(i + 1) % midLine.points.length],
//           ceiling.points[(i + 1) % ceiling.points.length],
//           ceiling.points[i],
//         ]),
//         style: style,
//       });
//     }
//     // --- Create ceiling part polygons ---
//     // Hood area
//     renderables.push({
//       polygon: new Polygon([c_fl, c_qfl, c_qfr, c_fr]),
//       style: style,
//     });
//     // Front roof
//     renderables.push({
//       polygon: new Polygon([c_qfl, c_ml, c_mr, c_qfr]),
//       style: style,
//     });
//     // Rear roof
//     renderables.push({
//       polygon: new Polygon([c_ml, c_qbl, c_qbr, c_mr]),
//       style: style,
//     });
//     // Trunk area
//     renderables.push({
//       polygon: new Polygon([c_qbl, c_bl, c_br, c_qbr]),
//       style: style,
//     });
//     return renderables;
//   }
//   /**
//    * Moves two points towards each other by a certain percentage of the distance between them.
//    * Modifies the points in place.
//    * @param p1 - The first Point.
//    * @param p2 - The second Point.
//    * @param percent - The percentage to move inward (0 to 1).
//    */
//   #moveInward(p1: Point, p2: Point, percent: number): void {
//     const new_p1: Point = lerp2D(p1, p2, percent);
//     const new_p2: Point = lerp2D(p2, p1, percent);
//     // Update original points
//     p1.x = new_p1.x;
//     p1.y = new_p1.y;
//     p2.x = new_p2.x;
//     p2.y = new_p2.y;
//   }
//   /**
//    * Calculates the centroid (average position) of a set of points.
//    * @param points - An array of Points.
//    * @returns A new Point representing the centroid.
//    */
//   #getCentroid(points: Point[]): Point {
//     if (!points || points.length === 0) return new Point(0, 0); // Handle empty array
//     let xSum: number = 0;
//     let ySum: number = 0;
//     points.forEach((p: Point) => {
//       xSum += p.x;
//       ySum += p.y;
//     });
//     return new Point(xSum / points.length, ySum / points.length);
//   }
//   /**
//    * Creates 3D tree models from base polygons, including trunk and canopy.
//    * @param basePolygons - An array of 2D Polygons representing tree bases.
//    * @returns An array of 3D RenderablePolygons representing the tree models.
//    */
//   #createTreeModels(basePolygons: Polygon[]): RenderablePolygon[] {
//     const treeRenderables: RenderablePolygon[] = [];
//     for (const basePolygon of basePolygons) {
//       if (!basePolygon || basePolygon.points.length < 3) continue;
//       // --- Create Trunk ---
//       // Create a copy for the trunk base, slightly moved inward
//       const trunkBasePoints = basePolygon.points.map(
//         (p) => new Point(p.x, p.y),
//       );
//       const trunkBasePoly = new Polygon(trunkBasePoints);
//       const half = Math.floor(trunkBasePoly.points.length / 2);
//       // Move opposite points inward to form a narrower trunk base
//       for (let i = 0; i < half; i++) {
//         const p1 = trunkBasePoly.points[i];
//         const p2 = trunkBasePoly.points[half + i];
//         if (p1 && p2) {
//           // Ensure points exist
//           this.#moveInward(p1, p2, TREE_TRUNK_TAPER);
//         } else {
//           // console.warn('Skipping moveInward due to missing points in tree trunk polygon.');
//         }
//       }
//       // Define the ceiling of the trunk
//       const trunkCeilingPoints = trunkBasePoly.points.map(
//         (p) => new Point(p.x, p.y, -TREE_TRUNK_HEIGHT),
//       );
//       const trunkCeilingPoly = new Polygon(trunkCeilingPoints);
//       // Create the sides of the trunk
//       for (let i = 0; i < trunkBasePoly.points.length; i++) {
//         const p1_base = trunkBasePoly.points[i];
//         const p2_base =
//           trunkBasePoly.points[(i + 1) % trunkBasePoly.points.length];
//         const p1_ceil = trunkCeilingPoly.points[i];
//         const p2_ceil =
//           trunkCeilingPoly.points[(i + 1) % trunkCeilingPoly.points.length];
//         const sidePoly = new Polygon([p1_base, p2_base, p2_ceil, p1_ceil]);
//         treeRenderables.push({
//           polygon: sidePoly,
//           style: DEFAULT_TREE_TRUNK_STYLE,
//         });
//       }
//       // --- Create Canopy ---
//       // The base of the canopy uses the original base polygon points but raised to trunk height
//       const canopyBasePoints = basePolygon.points.map(
//         (p) => new Point(p.x, p.y, -TREE_TRUNK_HEIGHT),
//       );
//       const canopyBasePoly = new Polygon(canopyBasePoints);
//       // Define the peak of the canopy (centroid of the original base polygon, raised high)
//       const centroid = this.#getCentroid(basePolygon.points);
//       centroid.z = -TREE_CANOPY_HEIGHT; // Canopy peak Z
//       // Create the sides of the canopy (triangles from canopy base to peak)
//       for (let i = 0; i < canopyBasePoly.points.length; i++) {
//         const p1_base = canopyBasePoly.points[i];
//         const p2_base =
//           canopyBasePoly.points[(i + 1) % canopyBasePoly.points.length];
//         const sidePoly = new Polygon([p1_base, p2_base, centroid]); // Triangle side
//         treeRenderables.push({
//           polygon: sidePoly,
//           style: DEFAULT_TREE_CANOPY_STYLE,
//         });
//       }
//       // Add canopy base (which is visually the top of the trunk)
//       treeRenderables.push({
//         polygon: canopyBasePoly,
//         style: DEFAULT_TREE_CANOPY_STYLE,
//       }); // Or trunk style?
//     }
//     return treeRenderables;
//   }
//   /**
//    * Gathers, filters, and prepares all relevant renderable polygons from the world.
//    * @param world - The World object containing scene elements.
//    * @returns An array of 3D RenderablePolygons ready for projection and rendering.
//    */
//   #getRenderables(world: World): RenderablePolygon[] {
//     // --- Filter Base Polygons ---
//     const buildingBases = this.#filterBasePolygons(
//       world.buildings.map((b) => b.base),
//     );
//     const treeBases = this.#filterBasePolygons(world.trees.map((t) => t.base));
//     const carShadowBases = this.#filterBasePolygons(
//       world.cars.map(
//         (c) => new Polygon(c.polygon.map((p) => new Point(p.x, p.y))),
//       ), // Project to XY plane
//     );
//     const bestCarBase = this.#filterBasePolygons(
//       world.bestCar
//         ? [new Polygon(world.bestCar.polygon.map((p) => new Point(p.x, p.y)))]
//         : [],
//     )[0]; // Get the single filtered base, if it exists
//     // --- Create 3D Models / Extrude ---
//     const buildingRenderables = this.#extrude(
//       buildingBases,
//       BUILDING_HEIGHT,
//       DEFAULT_BUILDING_STYLE,
//     );
//     const treeRenderables = this.#createTreeModels(treeBases); // Uses internal styles
//     const carRenderables = this.#createCarModel(
//       bestCarBase,
//       { fill: 'red', stroke: 'black' },
//       // world.bestCar?.style || { fill: 'red', stroke: 'black' },
//     ); // Use car's style
//     // --- Handle Roads ---
//     // Determine which road source to use
//     const roadSegments: Segment[] = world.corridor
//       ? world.corridor.borders
//       : world.roadBorders || [];
//     // Convert road segments to thin polygons for filtering/extrusion
//     const roadBasePolygons = roadSegments.map(
//       (s: Segment) =>
//         new Polygon([
//           new Point(s.p1.x, s.p1.y),
//           new Point(s.p2.x, s.p2.y),
//           // Add tiny thickness perpendicular to the segment for filtering to work better
//           add(
//             new Point(s.p2.x, s.p2.y),
//             scale(normalize(s.directionVector()), 0.1),
//           ),
//           add(
//             new Point(s.p1.x, s.p1.y),
//             scale(normalize(s.directionVector()), 0.1),
//           ),
//         ]),
//     );
//     const filteredRoadBases = this.#filterBasePolygons(roadBasePolygons);
//     const roadRenderables = this.#extrude(
//       filteredRoadBases,
//       ROAD_HEIGHT,
//       DEFAULT_ROAD_STYLE,
//     );
//     // --- Create Renderables for Shadows (Flat Polygons) ---
//     const shadowRenderables: RenderablePolygon[] = carShadowBases.map(
//       (poly) => ({
//         polygon: poly, // Already filtered 2D polygon
//         style: DEFAULT_CAR_SHADOW_STYLE,
//       }),
//     );
//     // --- Combine and Calculate Distances ---
//     const allRenderables = [
//       ...shadowRenderables,
//       ...roadRenderables,
//       ...buildingRenderables,
//       ...treeRenderables,
//       ...carRenderables,
//     ];
//     // Calculate distance from camera center (on XY plane) to polygon center for sorting/fog
//     const cameraCenterXY = new Point(this.center.x, this.center.y);
//     for (const renderable of allRenderables) {
//       const centroid = this.#getCentroid(renderable.polygon.points);
//       renderable.distanceToCamera = distance(
//         cameraCenterXY,
//         new Point(centroid.x, centroid.y),
//       );
//     }
//     // --- Sort by distance (Painter's Algorithm - farthest first) ---
//     allRenderables.sort(
//       (a, b) => (b.distanceToCamera ?? 0) - (a.distanceToCamera ?? 0),
//     );
//     return allRenderables;
//   }
//   /**
//    * Renders the world from the camera's perspective onto the main canvas.
//    * Optionally draws the raw 3D polygons onto a secondary context for debugging.
//    * @param ctx - The main 2D rendering context for the perspective view.
//    * @param world - The World object to render.
//    * @param gameCtx - An optional secondary 2D context for drawing the raw 3D polygons.
//    */
//   public render(
//     ctx: CanvasRenderingContext2D,
//     world: World,
//     gameCtx?: CanvasRenderingContext2D,
//   ): void {
//     // Get all filtered, styled, and sorted renderable polygons
//     const renderables: RenderablePolygon[] = this.#getRenderables(world);
//     // --- Render projected polygons with fog effect ---
//     ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
//     const canvasWidth = ctx.canvas.width;
//     const canvasHeight = ctx.canvas.height;
//     const cX = canvasWidth / 2;
//     const cY = canvasHeight / 2;
//     // Adjust scaler based on canvas dimensions and potentially FOV
//     // A simple approach is to scale normalized coordinates to fit the smaller dimension
//     const scaler = Math.min(canvasWidth, canvasHeight) / 2; // Scale normalized (-1 to 1) to fit half the smaller dimension
//     for (const renderable of renderables) {
//       // Project each 3D polygon's points onto the 2D canvas
//       const projectedPoints: Point[] = [];
//       let allPointsValid = true;
//       for (const point of renderable.polygon.points) {
//         const projected = this.#projectPoint(point);
//         if (projected) {
//           // Scale normalized coordinates to canvas coordinates
//           projectedPoints.push(
//             new Point(
//               cX + projected.x * scaler,
//               cY + projected.y * scaler,
//               projected.z, // Keep depth info if needed
//             ),
//           );
//         } else {
//           allPointsValid = false;
//           break; // If any point is behind camera, skip drawing this polygon
//         }
//       }
//       // Only draw if all points were successfully projected (in front of camera)
//       // and it forms a valid polygon
//       if (allPointsValid && projectedPoints.length >= 3) {
//         const projectedPolygon = new Polygon(projectedPoints);
//         // Apply fog: reduce opacity based on distance
//         const dist = renderable.distanceToCamera ?? this.range;
//         // Clamp distance to avoid issues, ensure alpha is between 0 and 1
//         const clampedDist = Math.max(0, Math.min(dist, this.range));
//         ctx.globalAlpha = Math.max(
//           0,
//           (1 - clampedDist / this.range) ** FOG_FALLOFF_EXPONENT,
//         );
//         // Draw the projected 2D polygon with its style
//         projectedPolygon.draw(ctx, {
//           fill: renderable.style.fill,
//           stroke: renderable.style.stroke,
//           join: 'round', // Keep rounded joins
//         });
//       }
//     }
//     ctx.globalAlpha = 1.0; // Reset global alpha
//     // --- Optional: Draw raw 3D polygons on secondary context ---
//     if (gameCtx) {
//       // This part might need adjustment if gameCtx expects 2D coordinates
//       // For now, draw the original 3D polygons' XY coordinates
//       for (const renderable of renderables) {
//         // Draw the original 3D polygons (using their 2D points) onto the game context
//         // Create a temporary 2D version for drawing on the top-down map
//         const poly2D = new Polygon(
//           renderable.polygon.points.map((p) => new Point(p.x, p.y)),
//         );
//         poly2D.draw(gameCtx, {
//           fill: renderable.style.fill,
//           stroke: renderable.style.stroke,
//         });
//       }
//       // Draw camera frustum on debug context
//       this.drawFrustum(gameCtx);
//     }
//   }
//   /**
//    * Draws the camera's 2D view frustum polygon onto a canvas context.
//    * Useful for debugging in a top-down view.
//    * @param ctx - The 2D rendering context to draw on.
//    */
//   public drawFrustum(ctx: CanvasRenderingContext2D): void {
//     // Draw the camera's 2D view polygon (the triangle representing the frustum base)
//     this.polygon.draw(ctx, { stroke: 'white', lineWidth: 1 });
//     // Optionally draw the camera center point
//     this.center.draw(ctx, { color: 'white', size: 5 });
//   }
// }
