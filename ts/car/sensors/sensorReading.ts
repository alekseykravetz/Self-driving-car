export type ObstacleType = 'border' | 'car' | 'trafficControl' | 'none';

export interface SensorReading {
  distance: number;
  state: number;
  type: ObstacleType;
  x: number;
  y: number;
}
