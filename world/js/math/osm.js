const Osm = {
  parseRoads: (data) => {
    const nodes = data.elements.filter((element) => element.type === 'node');

    const latitudes = nodes.map((node) => node.lat);
    const longitudes = nodes.map((node) => node.lon);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);

    const deltaLat = maxLat - minLat;
    const deltaLon = maxLon - minLon;
    const ar = deltaLon / deltaLat;
    const height = deltaLat * 111000 * 10; //one degree is 111000 km so it converted to meters. and + 10 is to scale our road width of 100px to 10 meters
    const width = height * ar * Math.cos(degToRad(maxLat));

    const points = [];
    const segments = [];
    for (const node of nodes) {
      const y = invLerp(maxLat, minLat, node.lat) * height;
      const x = invLerp(minLon, maxLon, node.lon) * width;
      const point = new Point(x, y);
      point.id = node.id;
      points.push(point);
    }

    const ways = data.elements.filter((element) => element.type === 'way');
    for (const way of ways) {
      const ids = way.nodes;
      for (let i = 1; i < ids.length; i++) {
        const prev = points.find((point) => point.id === ids[i - 1]);
        const cur = points.find((point) => point.id === ids[i]);
        const oneWay = way.tags.oneway || way.tags.lanes === 1;
        segments.push(new Segment(prev, cur, oneWay));
      }
    }
    return { points, segments };
  },
};
