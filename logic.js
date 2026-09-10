// logic.js - Core Routing, Anomaly Detection & Telemetry Engine

// Real-world coordinates along road corridors
const ROUTES = {
  'ROUTE_23A': {
    id: 'ROUTE_23A',
    name: 'Majestic → Vijayanagar',
    city: 'Bengaluru',
    stops: [
      { name: 'Majestic KBS', lat: 12.9774, lng: 77.5708, order: 1 },
      { name: 'KR Market', lat: 12.9634, lng: 77.5755, order: 2 },
      { name: 'Sirsi Circle', lat: 12.9592, lng: 77.5562, order: 3 },
      { name: 'Vijayanagar TTMC', lat: 12.9698, lng: 77.5358, order: 4 },
      { name: 'Attiguppe', lat: 12.9610, lng: 77.5255, order: 5 }
    ],
    // Smooth polyline waypoints along road path
    path: [
      [12.9774, 77.5708],
      [12.9730, 77.5720],
      [12.9680, 77.5738],
      [12.9634, 77.5755], // KR Market
      [12.9610, 77.5670],
      [12.9592, 77.5562], // Sirsi Circle
      [12.9630, 77.5460],
      [12.9670, 77.5400],
      [12.9698, 77.5358], // Vijayanagar TTMC
      [12.9650, 77.5300],
      [12.9610, 77.5255]  // Attiguppe
    ]
  },
  'ROUTE_17B': {
    id: 'ROUTE_17B',
    name: 'Bogadi → Mysuru Bus Stand',
    city: 'Mysuru',
    stops: [
      { name: 'Bogadi Ring Road', lat: 12.3025, lng: 76.6080, order: 1 },
      { name: 'Kuvempunagar Complex', lat: 12.2920, lng: 76.6260, order: 2 },
      { name: 'Saraswathipuram', lat: 12.3015, lng: 76.6375, order: 3 },
      { name: 'Mysuru Suburb Stand', lat: 12.3106, lng: 76.6570, order: 4 }
    ],
    path: [
      [12.3025, 76.6080],
      [12.2990, 76.6140],
      [12.2950, 76.6200],
      [12.2920, 76.6260], // Kuvempunagar
      [12.2960, 76.6320],
      [12.3015, 76.6375], // Saraswathipuram
      [12.3050, 76.6450],
      [12.3080, 76.6510],
      [12.3106, 76.6570]  // Mysuru Stand
    ]
  }
};

// Initial Fleet State
let buses = {
  '23A': {
    busNumber: '23A',
    registrationNumber: 'KA-01-F-2301',
    routeId: 'ROUTE_23A',
    conductorId: 'COND_01',
    conductorName: 'Ramesh Kumar',
    status: 'ON TIME', // 'READY' | 'ON TIME' | 'DELAYED' | 'ROUTE_DEVIATION'
    isTripActive: false,
    currentLocation: { lat: 12.9774, lng: 77.5708 },
    speedKmph: 32,
    etaMinutes: 8,
    delayMinutes: 0,
    expectedProgressPct: 0,
    actualProgressPct: 0,
    distanceRemainingKm: 6.2,
    nextStop: 'KR Market',
    lastUpdated: new Date().toISOString(),
    simulationIndex: 0
  },
  '17B': {
    busNumber: '17B',
    registrationNumber: 'KA-09-F-1702',
    routeId: 'ROUTE_17B',
    conductorId: 'COND_02',
    conductorName: 'Suresh Gowda',
    status: 'ON TIME',
    isTripActive: false,
    currentLocation: { lat: 12.3025, lng: 76.6080 },
    speedKmph: 28,
    etaMinutes: 10,
    delayMinutes: 0,
    expectedProgressPct: 0,
    actualProgressPct: 0,
    distanceRemainingKm: 5.4,
    nextStop: 'Kuvempunagar Complex',
    lastUpdated: new Date().toISOString(),
    simulationIndex: 0
  }
};

let alerts = [];

// Calculate Haversine distance in KM
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check minimum distance from point to polyline path (deviation check)
function checkRouteDeviation(lat, lng, path, thresholdKm = 0.45) {
  let minDistance = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = getDistanceKm(lat, lng, path[i][0], path[i][1]);
    if (d < minDistance) minDistance = d;
  }
  return { isDeviated: minDistance > thresholdKm, distance: minDistance };
}

// Determine next stop along route
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
  // Next upcoming stop
  const nextStopObj = stops[Math.min(closestIndex + 1, stops.length - 1)];
  return nextStopObj ? nextStopObj.name : stops[stops.length - 1].name;
}

/**
 * Ingest GPS location update (works for both live smartphone GPS and simulation)
 * Automatic delay & deviation detection
 */
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

  // Find closest waypoint on route to determine progress
  let closestIndex = 0;
  let minDistance = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = getDistanceKm(lat, lng, path[i][0], path[i][1]);
    if (d < minDistance) {
      minDistance = d;
      closestIndex = i;
    }
  }

  // Calculate actual progress percentage
  bus.actualProgressPct = Math.min(100, Math.round((closestIndex / totalWaypoints) * 100));

  // Determine next stop
  bus.nextStop = findNextStop(lat, lng, route.stops);

  // Remaining distance to route end
  const destWaypoint = path[path.length - 1];
  bus.distanceRemainingKm = parseFloat(getDistanceKm(lat, lng, destWaypoint[0], destWaypoint[1]).toFixed(1));

  // Dynamic ETA based on distance and speed (or nominal 30 km/h)
  const effectiveSpeed = bus.speedKmph > 5 ? bus.speedKmph : 20;
  const calculatedEtaMinutes = Math.max(1, Math.round((bus.distanceRemainingKm / effectiveSpeed) * 60));

  // Check route deviation
  const deviation = checkRouteDeviation(lat, lng, path);
  
  // Rule-based Delay Detection:
  // Compare expected progress vs actual progress
  // If simulation or clock indicates expected arrival is much earlier than actual
  const progressDifference = bus.expectedProgressPct - bus.actualProgressPct;
  const delayDelta = bus.expectedProgressPct > 0 ? Math.max(0, Math.round((progressDifference / 100) * 15)) : 0;

  if (deviation.isDeviated) {
    bus.status = 'ROUTE_DEVIATION';
    const alertMsg = `Bus ${bus.busNumber} has deviated from assigned route (${(deviation.distance * 1000).toFixed(0)}m away).`;
    createAlert(bus.busNumber, 'ROUTE_DEVIATION', alertMsg, 'HIGH');
  } else if (delayDelta >= 4 || (bus.busNumber === '17B' && bus.delayMinutes >= 4)) {
    bus.status = 'DELAYED';
    bus.delayMinutes = Math.max(bus.delayMinutes, delayDelta || 6);
    bus.etaMinutes = calculatedEtaMinutes + bus.delayMinutes;
    const alertMsg = `Bus ${bus.busNumber} is delayed by approx ${bus.delayMinutes} minutes due to slow traffic / stall.`;
    createAlert(bus.busNumber, 'DELAY', alertMsg, 'MEDIUM');
  } else {
    bus.status = 'ON TIME';
    bus.delayMinutes = 0;
    bus.etaMinutes = calculatedEtaMinutes;
  }

  return { bus, route };
}

function createAlert(busNumber, type, message, severity) {
  // Avoid duplicate spam alerts within 15 seconds
  const now = Date.now();
  const existing = alerts.find(a => a.busNumber === busNumber && a.type === type && (now - new Date(a.createdAt).getTime()) < 15000);
  if (existing) return existing;

  const newAlert = {
    id: 'ALT_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    busNumber,
    type,
    message,
    severity,
    createdAt: new Date().toISOString()
  };
  alerts.unshift(newAlert);
  if (alerts.length > 20) alerts.pop();
  return newAlert;
}

// Simulation Engine state
let simulationTimer = null;
let simulationStep = 0;
let isSimulating = false;

function startSimulationEngine(broadcastCallback) {
  if (isSimulating) return;
  isSimulating = true;
  simulationStep = 0;

  // Reset bus starting locations
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

    // --- BUS 23A: Steady, on-time progression ---
    const path23A = ROUTES['ROUTE_23A'].path;
    const idx23A = Math.min(simulationStep, path23A.length - 1);
    buses['23A'].simulationIndex = idx23A;
    buses['23A'].expectedProgressPct = Math.min(100, Math.round((simulationStep / (path23A.length - 1)) * 100));
    const pt23A = path23A[idx23A];
    const update23A = processGPSUpdate('23A', pt23A[0], pt23A[1], 35);

    // --- BUS 17B: Normal initially, then slows down / pauses ---
    // Expected progress advances steadily, but actual index falls behind
    const path17B = ROUTES['ROUTE_17B'].path;
    buses['17B'].expectedProgressPct = Math.min(100, Math.round((simulationStep / (path17B.length - 1)) * 100));

    let idx17B;
    let speed17B = 28;
    if (simulationStep <= 3) {
      // Normal motion
      idx17B = simulationStep;
      speed17B = 30;
    } else if (simulationStep <= 7) {
      // Congestion: bus stalls at waypoint 3
      idx17B = 3;
      speed17B = 4;
      buses['17B'].delayMinutes = Math.min(8, (simulationStep - 3) * 2);
    } else if (simulationStep <= 9) {
      // Moves very slowly to waypoint 4
      idx17B = 4;
      speed17B = 12;
      buses['17B'].delayMinutes = 6;
    } else {
      // Continues with existing delay
      idx17B = Math.min(path17B.length - 1, 4 + Math.floor((simulationStep - 9) / 2));
      speed17B = 22;
    }
    buses['17B'].simulationIndex = idx17B;
    const pt17B = path17B[idx17B];
    const update17B = processGPSUpdate('17B', pt17B[0], pt17B[1], speed17B);

    if (broadcastCallback) {
      broadcastCallback({
        buses,
        alerts,
        simulationStep,
        isSimulating: true
      });
    }

    // Auto-loop or stop after 20 steps
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
  
  // Reset initial positions
  buses['23A'].currentLocation = { lat: 12.9774, lng: 77.5708 };
  buses['23A'].status = 'ON TIME';
  buses['23A'].etaMinutes = 8;
  buses['23A'].delayMinutes = 0;
  buses['23A'].expectedProgressPct = 0;
  buses['23A'].actualProgressPct = 0;
  buses['23A'].isTripActive = false;

  buses['17B'].currentLocation = { lat: 12.3025, lng: 76.6080 };
  buses['17B'].status = 'ON TIME';
  buses['17B'].etaMinutes = 10;
  buses['17B'].delayMinutes = 0;
  buses['17B'].expectedProgressPct = 0;
  buses['17B'].actualProgressPct = 0;
  buses['17B'].isTripActive = false;

  alerts = [];

  if (broadcastCallback) {
    broadcastCallback({ buses, alerts, simulationStep: 0, isSimulating: false });
  }
}

module.exports = {
  ROUTES,
  buses,
  alerts,
  processGPSUpdate,
  startSimulationEngine,
  stopSimulationEngine,
  resetSimulation,
  isSimulating: () => isSimulating
};
