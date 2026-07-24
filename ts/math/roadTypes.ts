export const ROAD_TYPES: string[] = [
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
  'residential',
  'service',
  'living_street',
  'unclassified',
  'track',
];

export const ROAD_TYPE_LABELS: Record<string, string> = {
  motorway: 'Motorway',
  trunk: 'Trunk',
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
  residential: 'Residential',
  service: 'Service',
  living_street: 'Living Street',
  unclassified: 'Unclassified',
  track: 'Track',
};

export function defaultLaneCount(
  highwayType: string | undefined,
  oneWay: boolean,
): number {
  switch (highwayType) {
    case 'motorway':
      return 4;
    case 'motorway_link':
      return 2;
    case 'trunk':
      return 4;
    case 'trunk_link':
      return 2;
    case 'primary':
      return 2;
    case 'primary_link':
      return 1;
    case 'secondary':
      return 2;
    case 'secondary_link':
      return 1;
    case 'tertiary':
      return 2;
    case 'tertiary_link':
      return 1;
    case 'residential':
      return 2;
    case 'unclassified':
      return 2;
    case 'service':
      return 1;
    case 'living_street':
      return 1;
    case 'track':
      return 1;
    default:
      return oneWay ? 1 : 2;
  }
}

export function getRoadFillColor(highwayType: string | undefined): string {
  switch (highwayType) {
    case 'motorway':
    case 'motorway_link':
      return '#888';
    case 'trunk':
    case 'trunk_link':
      return '#998877';
    case 'primary':
    case 'primary_link':
      return '#B5774A';
    case 'secondary':
    case 'secondary_link':
      return '#B0A060';
    case 'tertiary':
    case 'tertiary_link':
      return '#CCC';
    case 'service':
      return '#AAA';
    case 'living_street':
      return '#AAA';
    case 'unclassified':
      return '#BBB';
    default:
      return '#BBB';
  }
}

export function applyRoadTypeDefaults(highwayType: string | undefined): {
  lanes: number;
  oneWay: boolean;
} {
  switch (highwayType) {
    case 'motorway':
      return { lanes: 4, oneWay: true };
    case 'trunk':
      return { lanes: 4, oneWay: false };
    case 'service':
      return { lanes: 1, oneWay: false };
    case 'living_street':
      return { lanes: 1, oneWay: false };
    case 'track':
      return { lanes: 1, oneWay: false };
    default:
      return { lanes: 2, oneWay: false };
  }
}
