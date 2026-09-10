const DELAY_THRESHOLD = 5;
const Deviation_THRESHOLD = 0.5;
function calculateDistance(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}



function detectDelay(expectedTime, actualTime) {
  if (!expectedTime || !actualTime) {
    return false;
  }

  const difference =
    (new Date(actualTime) - new Date(expectedTime)) / 60000;

  return difference >= DELAY_THRESHOLD;
}



function detectRouteDeviation(
  currentLat,
  currentLng,
  routeLat,
  routeLng
) {
  if (
    currentLat === undefined ||
    currentLng === undefined ||
    routeLat === undefined ||
    routeLng === undefined
  ) {
    return false;
  }

  const distance = calculateDistance(
    currentLat,
    currentLng,
    routeLat,
    routeLng
  );

  return distance >= Deviation_THRESHOLD;
}


module.exports = {
  calculateDistance,
  detectDelay,
  detectRouteDeviation,
  DELAY_THRESHOLD,
  Deviation_THRESHOLD,
};