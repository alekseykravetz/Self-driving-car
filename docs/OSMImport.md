# OpenStreetMap Import

This guide explains how to download road and building data from Overpass Turbo
and import it into the world editor at `html/world.html`.

## 1. Open Overpass Turbo

Open [overpass-turbo.eu](https://overpass-turbo.eu/) and move the map to the
area to import. Keep the selected bounding box reasonably small: large city
areas produce much more JSON and take longer to parse and generate.

## 2. Run the project filter

Paste this Overpass QL query into the editor. The same query is available from
the world's **Copy Filter** button.

```overpass
[out:json];
(
  way["highway"]
  ["highway" !~"pedestrian|footway|cycleway|path|service|corridor|track|steps|raceway|bridleway|proposed|construction|elevator|bus_guideway|no"]
  ["access" !~"private"]
  ({{bbox}});
  way["building"]({{bbox}});
);
out body;
>;
out body;
```

The query includes:

- Drivable road ways, excluding pedestrian paths, cycleways, private roads,
  construction features, and other non-drivable highway types.
- Building ways, so the importer can use real building footprints.
- The recursive `>; out body;` step, which includes the coordinates and tags
  for referenced nodes. Do not replace the final `out body;` with `out skel;`:
  node tags are needed for traffic lights, crossings, stops, and give-ways.

## 3. Export the raw data

1. Click **Run** in Overpass Turbo.
2. Click **Export**.
3. Choose **Copy raw OSM data**, or save the raw response as a `.json` file.

The result must be a standard Overpass JSON object containing an `elements`
array. Do not copy the map image, GeoJSON, CSV, or XML export.

## 4. Import into the world editor

1. Open `html/world.html`.
2. Open **OSM Import** from the world toolbar.
3. Paste the raw JSON into **Paste OSM Data**.
4. Click **Import Roads**.

The editor parses roads and OSM metadata, imports tagged road markings, fits
the viewport to the imported map, and generates road geometry. Building
footprints from the query are preserved as OSM buildings instead of being
replaced by procedural buildings. Large imports run in stages and display a
progress overlay.

## Included example

[`saves/tel-aviv-osm-data.json`](../saves/tel-aviv-osm-data.json) is a raw
Overpass export covering a Tel Aviv area. It can be pasted directly into the
import panel for a repeatable local example.

## Troubleshooting

| Problem                               | Check                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------- |
| Import reports invalid JSON           | Export the raw JSON again and remove any surrounding prose or Markdown fences.               |
| Roads appear without traffic markings | The response likely used `out skel;`, which removes node tags. Use the complete query above. |
| Buildings are missing                 | Confirm the `way["building"]({{bbox}});` clause and the trailing node recursion are present. |
| The browser becomes slow              | Reduce the Overpass bounding box and import the area in smaller sections.                    |

OpenStreetMap data is provided under the [ODbL](https://www.openstreetmap.org/copyright).
Follow the attribution requirements when distributing imported data or maps.
