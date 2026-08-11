import type { Segment } from '../../math/primitives/segment.js';
import type { SegmentMetadata } from '../../ui/organisms/worldEditorPanel.js';

/** Reads a segment's OSM metadata into the panel's {@link SegmentMetadata} shape. */
export function segmentToMetadata(seg: Segment): SegmentMetadata {
  return {
    highwayType: seg.highwayType,
    lanes: seg.lanes,
    oneWay: seg.oneWay,
    separated: seg.separated,
    name: seg.name,
    nameEn: seg.nameEn,
    nameHe: seg.nameHe,
    nameAr: seg.nameAr,
    nameRu: seg.nameRu,
    maxSpeed: seg.maxSpeed,
    ref: seg.ref,
    bridge: seg.bridge,
    laneMarkings: seg.laneMarkings,
    parkingLeft: seg.parkingLeft,
    parkingRight: seg.parkingRight,
  };
}

/**
 * Writes panel metadata back onto a segment. In inspect mode the panel always
 * sends the segment's complete state, so every field is applied directly
 * (including toggling `bridge` / `laneMarkings` back off) — `undefined` is a
 * meaningful value here, not "leave unchanged".
 */
export function applyMetadataToSegment(
  seg: Segment,
  meta: Partial<SegmentMetadata>,
): void {
  seg.highwayType = meta.highwayType || undefined;
  if (meta.lanes !== undefined) seg.lanes = meta.lanes;
  seg.oneWay = meta.oneWay ?? false;
  seg.separated = meta.separated ?? false;
  seg.name = meta.name || undefined;
  seg.nameEn = meta.nameEn || undefined;
  seg.nameHe = meta.nameHe || undefined;
  seg.nameAr = meta.nameAr || undefined;
  seg.nameRu = meta.nameRu || undefined;
  seg.maxSpeed = meta.maxSpeed;
  seg.ref = meta.ref || undefined;
  seg.bridge = meta.bridge ? true : undefined;
  seg.laneMarkings = meta.laneMarkings === false ? false : undefined;
  seg.parkingLeft = meta.parkingLeft ? true : undefined;
  seg.parkingRight = meta.parkingRight ? true : undefined;
}
