export type ObstacleType = 'border' | 'car' | 'trafficControl' | 'none';
export type Sophistication = 'basic' | 'traffic' | 'classified';

export interface SensorReading {
  distance: number;
  type: ObstacleType;
  relativeSpeed: number;
  controlState: number;
  x: number;
  y: number;
}
