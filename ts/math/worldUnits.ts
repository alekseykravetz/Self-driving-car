export const WORLD_PIXELS_PER_METER = 14;
export const SIMULATION_FPS = 60;
export const METERS_PER_DEGREE_LATITUDE = 111000;

export function worldPixelsToMeters(px: number): number {
  return px / WORLD_PIXELS_PER_METER;
}

export function metersToWorldPixels(meters: number): number {
  return meters * WORLD_PIXELS_PER_METER;
}

export function pxPerFrameToKmh(pxPerFrame: number): number {
  return (pxPerFrame * SIMULATION_FPS * 3.6) / WORLD_PIXELS_PER_METER;
}

export function kmhToPxPerFrame(kmh: number): number {
  return ((kmh / 3.6) * WORLD_PIXELS_PER_METER) / SIMULATION_FPS;
}

export function formatMetersFromWorldPixels(px: number): string {
  return `${worldPixelsToMeters(px).toFixed(1)} m`;
}

export function formatKmhFromPxPerFrame(pxPerFrame: number): string {
  return `${pxPerFrameToKmh(pxPerFrame).toFixed(1)} km/h`;
}

export function framesToSeconds(frames: number): number {
  return frames / SIMULATION_FPS;
}

export function formatElapsedTime(frames: number): string {
  const totalSeconds = Math.floor(framesToSeconds(frames));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Pixels per lane for road width calculation in OSM import. */
export const LANE_WIDTH_PX = 50;
