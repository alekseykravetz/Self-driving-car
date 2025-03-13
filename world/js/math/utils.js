function getNearestPoint(
  location,
  points,
  threshold = Number.MAX_SAFE_INTEGER
) {
  let minDistance = Number.MAX_SAFE_INTEGER;
  let nearestPoint = null;
  for (const point of points) {
    const distance = getDistance(location, point);
    if (distance < minDistance && distance < threshold) {
      minDistance = distance;
      nearestPoint = point;
    }
  }
  return nearestPoint;
}

function getDistance(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  //   const dx = p1.x - p2.x;
  //   const dy = p1.y - p2.y;
  //   return Math.sqrt(dx * dx + dy * dy);
}
