const DELAY_THRESHOLD = 5;
const Deviation_THRESHOLD = 0.5;
function calculateDistance(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function detectDelay(expectedTime, actualTime) { return expectedTime && actualTime && (new Date(actualTime) - new Date(expectedTime)) / 60000 >= DELAY_THRESHOLD; }
function detectRouteDeviation(currentLat, currentLng, routeLat, routeLng) { return [currentLat, currentLng, routeLat, routeLng].some((value) => value === undefined) ? false : calculateDistance(currentLat, currentLng, routeLat, routeLng) >= Deviation_THRESHOLD; }
function detectRouteDeviationFromPath(lat, lng, path) { return Array.isArray(path) && path.length > 0 && Math.min(...path.map(([pointLat, pointLng]) => calculateDistance(lat, lng, pointLat, pointLng))) >= Deviation_THRESHOLD; }
function calculateExpectedProgress(elapsedMinutes, totalMinutes) { return totalMinutes > 0 ? Math.min(100, Math.max(0, elapsedMinutes / totalMinutes * 100)) : 0; }
module.exports = { calculateDistance, detectDelay, detectRouteDeviation, detectRouteDeviationFromPath, calculateExpectedProgress, DELAY_THRESHOLD, Deviation_THRESHOLD };
