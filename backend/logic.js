const { ROUTES, createInitialFleet, createAlertModel } = require('./models');

let buses = createInitialFleet();
let alerts = [];

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function checkRouteDeviation(lat, lng, path, thresholdKm = 0.45) {
  let minDistance = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = getDistanceKm(lat, lng, path[i][0], path[i][1]);
    if (d < minDistance) minDistance = d;
  }
  return { isDeviated: minDistance > thresholdKm, distance: minDistance };
}

function findNextStop(currentLat, currentLng, stops) {
  let closestIndex = 0;
  let minDistance = Infinity;
  for (let i = 0; i < stops.length; i++) {
    const d = getDistanceKm(currentLat, currentLng, stops[i].lat, stops[i].lng);
    if (d < minDistance) {
      minDistance = d;
      closestIndex = i;
    }
  }
  const nextStopObj = stops[Math.min(closestIndex + 1, stops.length - 1)];
  return nextStopObj ? nextStopObj.name : stops[stops.length - 1].name;
}

function processGPSUpdate(busNumber, lat, lng, speed = 30) {
  const bus = buses[busNumber];
  if (!bus) return null;

  const route = ROUTES[bus.routeId];
  if (!route) return null;

  bus.currentLocation = { lat, lng };
  bus.speedKmph = Math.max(0, Math.round(speed));
  bus.lastUpdated = new Date().toISOString();
  bus.isTripActive = true;

  const path = route.path;
  const totalWaypoints = path.length - 1;

  let closestIndex = 0;
  let minDistance = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = getDistanceKm(lat, lng, path[i][0], path[i][1]);
    if (d < minDistance) {
      minDistance = d;
      closestIndex = i;
    }
  }

  bus.actualProgressPct = Math.min(100, Math.round((closestIndex / totalWaypoints) * 100));
  bus.nextStop = findNextStop(lat, lng, route.stops);

  const destWaypoint = path[path.length - 1];
  bus.distanceRemainingKm = parseFloat(getDistanceKm(lat, lng, destWaypoint[0], destWaypoint[1]).toFixed(1));

  const effectiveSpeed = bus.speedKmph > 5 ? bus.speedKmph : 20;
  const calculatedEtaMinutes = Math.max(1, Math.round((bus.distanceRemainingKm / effectiveSpeed) * 60));

  const deviation = checkRouteDeviation(lat, lng, path);
  
  const progressDifference = bus.expectedProgressPct - bus.actualProgressPct;
  const delayDelta = bus.expectedProgressPct > 0 ? Math.max(0, Math.round((progressDifference / 100) * 15)) : 0;

  if (deviation.isDeviated) {
    bus.status = 'ROUTE_DEVIATION';
    const alertMsg = `Bus ${bus.busNumber} has deviated from assigned route (${(deviation.distance * 1000).toFixed(0)}m away).`;
    recordAlert(bus.busNumber, 'ROUTE_DEVIATION', alertMsg, 'HIGH');
  } else if (delayDelta >= 4 || (bus.busNumber === '17B' && bus.delayMinutes >= 4)) {
    bus.status = 'DELAYED';
    bus.delayMinutes = Math.max(bus.delayMinutes, delayDelta || 6);
    bus.etaMinutes = calculatedEtaMinutes + bus.delayMinutes;
    const alertMsg = `Bus ${bus.busNumber} is delayed by approx ${bus.delayMinutes} minutes due to slow traffic / stall.`;
    recordAlert(bus.busNumber, 'DELAY', alertMsg, 'MEDIUM');
  } else {
    bus.status = 'ON TIME';
    bus.delayMinutes = 0;
    bus.etaMinutes = calculatedEtaMinutes;
  }

  return { bus, route };
}

function recordAlert(busNumber, type, message, severity) {
  const now = Date.now();
  const existing = alerts.find(a => a.busNumber === busNumber && a.type === type && (now - new Date(a.createdAt).getTime()) < 15000);
  if (existing) return existing;

  const newAlert = createAlertModel(busNumber, type, message, severity);
  alerts.unshift(newAlert);
  if (alerts.length > 20) alerts.pop();
  return newAlert;
}

let simulationTimer = null;
let simulationStep = 0;
let isSimulating = false;

function startSimulationEngine(broadcastCallback) {
  if (isSimulating) return;
  isSimulating = true;
  simulationStep = 0;

  buses['23A'].simulationIndex = 0;
  buses['23A'].expectedProgressPct = 0;
  buses['23A'].actualProgressPct = 0;
  buses['23A'].status = 'ON TIME';
  buses['23A'].delayMinutes = 0;
  buses['23A'].isTripActive = true;

  buses['17B'].simulationIndex = 0;
  buses['17B'].expectedProgressPct = 0;
  buses['17B'].actualProgressPct = 0;
  buses['17B'].status = 'ON TIME';
  buses['17B'].delayMinutes = 0;
  buses['17B'].isTripActive = true;

  alerts = [];

  simulationTimer = setInterval(() => {
    simulationStep++;

    const path23A = ROUTES['ROUTE_23A'].path;
    const idx23A = Math.min(simulationStep, path23A.length - 1);
    buses['23A'].simulationIndex = idx23A;
    buses['23A'].expectedProgressPct = Math.min(100, Math.round((simulationStep / (path23A.length - 1)) * 100));
    const pt23A = path23A[idx23A];
    processGPSUpdate('23A', pt23A[0], pt23A[1], 35);

    const path17B = ROUTES['ROUTE_17B'].path;
    buses['17B'].expectedProgressPct = Math.min(100, Math.round((simulationStep / (path17B.length - 1)) * 100));

    let idx17B;
    let speed17B = 28;
    if (simulationStep <= 3) {
      idx17B = simulationStep;
      speed17B = 30;
    } else if (simulationStep <= 7) {
      idx17B = 3;
      speed17B = 4;
      buses['17B'].delayMinutes = Math.min(8, (simulationStep - 3) * 2);
    } else if (simulationStep <= 9) {
      idx17B = 4;
      speed17B = 12;
      buses['17B'].delayMinutes = 6;
    } else {
      idx17B = Math.min(path17B.length - 1, 4 + Math.floor((simulationStep - 9) / 2));
      speed17B = 22;
    }
    buses['17B'].simulationIndex = idx17B;
    const pt17B = path17B[idx17B];
    processGPSUpdate('17B', pt17B[0], pt17B[1], speed17B);

    if (broadcastCallback) {
      broadcastCallback({
        buses,
        alerts,
        simulationStep,
        isSimulating: true
      });
    }

    if (simulationStep >= 20) {
      stopSimulationEngine();
      if (broadcastCallback) {
        broadcastCallback({ buses, alerts, simulationStep, isSimulating: false, finished: true });
      }
    }
  }, 1800);
}

function stopSimulationEngine() {
  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
  }
  isSimulating = false;
}

function resetSimulation(broadcastCallback) {
  stopSimulationEngine();
  simulationStep = 0;
  
  buses = createInitialFleet();
  alerts = [];

  if (broadcastCallback) {
    broadcastCallback({ buses, alerts, simulationStep: 0, isSimulating: false });
  }
}

module.exports = {
  getBuses: () => buses,
  getAlerts: () => alerts,
  processGPSUpdate,
  startSimulationEngine,
  stopSimulationEngine,
  resetSimulation,
  isSimulating: () => isSimulating
};
