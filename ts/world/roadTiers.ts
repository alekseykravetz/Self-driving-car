import { Envelope } from '../math/primitives/envelope.js';
import { Segment } from '../math/primitives/segment.js';

/**
 * Draw-order rank per OSM highway type. Lower ranks draw first (underneath);
 * higher ranks draw last (on top). Roads with no/unknown highwayType
 * (hand-drawn, legacy) rank 0 — the bottom tier.
 */
export const HIGHWAY_TIER_RANK: Record<string, number> = {
  track: 1,
  living_street: 2,
  service: 3,
  residential: 4,
  unclassified: 4,
  tertiary: 5,
  secondary: 6,
  primary: 7,
  trunk: 8,
  motorway: 9,
};

/** Tier rank of a segment's road type; unknown/undefined → 0 (bottom). */
export function getHighwayTierRank(seg: Segment): number {
  return HIGHWAY_TIER_RANK[seg.highwayType ?? ''] ?? 0;
}

/**
 * Returns a new array of envelopes sorted by ascending tier rank (draw
 * first → last). Stable: equal ranks keep their relative input order.
 * Does not mutate the input array.
 */
export function sortEnvelopesByTier(envelopes: Envelope[]): Envelope[] {
  return [...envelopes].sort(
    (a, b) => getHighwayTierRank(a.skeleton) - getHighwayTierRank(b.skeleton),
  );
}
