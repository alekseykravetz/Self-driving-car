export const WORLD_PIXELS_PER_METER = 14;
export const SIMULATION_FPS = 60;
export const METERS_PER_DEGREE_LATITUDE = 111000;
export function worldPixelsToMeters(px) {
    return px / WORLD_PIXELS_PER_METER;
}
export function metersToWorldPixels(meters) {
    return meters * WORLD_PIXELS_PER_METER;
}
export function pxPerFrameToKmh(pxPerFrame) {
    return (pxPerFrame * SIMULATION_FPS * 3.6) / WORLD_PIXELS_PER_METER;
}
export function kmhToPxPerFrame(kmh) {
    return ((kmh / 3.6) * WORLD_PIXELS_PER_METER) / SIMULATION_FPS;
}
export function formatMetersFromWorldPixels(px) {
    return `${worldPixelsToMeters(px).toFixed(1)} m`;
}
export function formatKmhFromPxPerFrame(pxPerFrame) {
    return `${pxPerFrameToKmh(pxPerFrame).toFixed(1)} km/h`;
}
export function framesToSeconds(frames) {
    return frames / SIMULATION_FPS;
}
export function formatElapsedTime(frames) {
    const totalSeconds = Math.floor(framesToSeconds(frames));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
