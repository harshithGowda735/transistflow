const { createAlertModel } = require('./models');

const INITIAL_ROUTES = {
  'ROUTE_BLR_MYS': {
    routeId: 'ROUTE_BLR_MYS',
    name: 'Majestic KBS → Mysuru Suburb Stand',
    city: 'Bengaluru - Mysuru Expressway',
    stops: [
      { name: 'Majestic KBS', lat: 12.9774, lng: 77.5708, order: 1 },
      { name: 'Kengeri TTMC', lat: 12.9103, lng: 77.4842, order: 2 },
      { name: 'Bidadi', lat: 12.7963, lng: 77.3872, order: 3 },
      { name: 'Ramanagara', lat: 12.7150, lng: 77.2811, order: 4 },
      { name: 'Channapatna', lat: 12.6518, lng: 77.2036, order: 5 },
      { name: 'Maddur', lat: 12.5843, lng: 77.0450, order: 6 },
      { name: 'Mandya', lat: 12.5242, lng: 76.8958, order: 7 },
      { name: 'Srirangapatna', lat: 12.4227, lng: 76.6953, order: 8 },
      { name: 'Mysuru Suburb Stand', lat: 12.3106, lng: 76.6570, order: 9 }
    ],
    path: [
      [12.9774, 77.5708],
      [12.9460, 77.5350],
      [12.9103, 77.4842],
      [12.8550, 77.4350],
      [12.7963, 77.3872],
      [12.7560, 77.3320],
      [12.7150, 77.2811],
      [12.6820, 77.2400],
      [12.6518, 77.2036],
      [12.6180, 77.1250],
      [12.5843, 77.0450],
      [12.5550, 76.9700],
      [12.5242, 76.8958],
      [12.4730, 76.7950],
      [12.4227, 76.6953],
      [12.3660, 76.6760],
      [12.3106, 76.6570]
    ]
  },
  'ROUTE_MYS_BLR': {
    routeId: 'ROUTE_MYS_BLR',
    name: 'Mysuru Suburb Stand → Majestic KBS',
    city: 'Mysuru - Bengaluru Expressway',
    stops: [
      { name: 'Mysuru Suburb Stand', lat: 12.3106, lng: 76.6570, order: 1 },
      { name: 'Srirangapatna', lat: 12.4227, lng: 76.6953, order: 2 },
      { name: 'Mandya', lat: 12.5242, lng: 76.8958, order: 3 },
      { name: 'Maddur', lat: 12.5843, lng: 77.0450, order: 4 },
      { name: 'Channapatna', lat: 12.6518, lng: 77.2036, order: 5 },
      { name: 'Ramanagara', lat: 12.7150, lng: 77.2811, order: 6 },
      { name: 'Bidadi', lat: 12.7963, lng: 77.3872, order: 7 },
      { name: 'Kengeri TTMC', lat: 12.9103, lng: 77.4842, order: 8 },
      { name: 'Majestic KBS', lat: 12.9774, lng: 77.5708, order: 9 }
    ],
    path: [
      [12.3106, 76.6570],
      [12.3660, 76.6760],
      [12.4227, 76.6953],
      [12.4730, 76.7950],
      [12.5242, 76.8958],
      [12.5550, 76.9700],
      [12.5843, 77.0450],
      [12.6180, 77.1250],
      [12.6518, 77.2036],
      [12.6820, 77.2400],
      [12.7150, 77.2811],
      [12.7560, 77.3320],
      [12.7963, 77.3872],
      [12.8550, 77.4350],
      [12.9103, 77.4842],
      [12.9460, 77.5350],
      [12.9774, 77.5708]
    ]
  },
  'ROUTE_23A': {
    routeId: 'ROUTE_23A',
    name: 'Majestic → Vijayanagar',
    city: 'Bengaluru',
    stops: [
      { name: 'Majestic KBS', lat: 12.9774, lng: 77.5708, order: 1 },
      { name: 'KR Market', lat: 12.9634, lng: 77.5755, order: 2 },
      { name: 'Sirsi Circle', lat: 12.9592, lng: 77.5562, order: 3 },
      { name: 'Vijayanagar TTMC', lat: 12.9698, lng: 77.5358, order: 4 },
      { name: 'Attiguppe', lat: 12.9610, lng: 77.5255, order: 5 }
    ],
    path: [
      [12.9774, 77.5708],
      [12.9730, 77.5720],
      [12.9680, 77.5738],
      [12.9634, 77.5755],
      [12.9610, 77.5670],
      [12.9592, 77.5562],
      [12.9630, 77.5460],
      [12.9670, 77.5400],
      [12.9698, 77.5358],
      [12.9650, 77.5300],
      [12.9610, 77.5255]
    ]
  },
  'ROUTE_17B': {
    routeId: 'ROUTE_17B',
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
      [12.2920, 76.6260],
      [12.2960, 76.6320],
      [12.3015, 76.6375],
      [12.3050, 76.6450],
      [12.3080, 76.6510],
      [12.3106, 76.6570]
    ]
  }
};

const INITIAL_BUSES = {
  'KA-57-F-1008': {
    busNumber: 'KA-57-F-1008',
    registrationNumber: 'KA-57-F-1008',
    routeId: 'ROUTE_BLR_MYS',
    conductorId: 'COND_1008',
    conductorName: 'Manjunath Gowda',
    capacity: 55,
    status: 'ON TIME',
    isTripActive: false,
    currentLocation: { lat: 12.9774, lng: 77.5708 },
    speedKmph: 58,
    etaMinutes: 12,
    delayMinutes: 0,
    expectedProgressPct: 0,
    actualProgressPct: 0,
    distanceRemainingKm: 138.0,
    nextStop: 'Kengeri TTMC',
    lastUpdated: new Date()
  },
  'KA-09-F-2024': {
    busNumber: 'KA-09-F-2024',
    registrationNumber: 'KA-09-F-2024',
    routeId: 'ROUTE_MYS_BLR',
    conductorId: 'COND_2024',
    conductorName: 'Anand Kumar',
    capacity: 55,
    status: 'ON TIME',
    isTripActive: false,
    currentLocation: { lat: 12.3106, lng: 76.6570 },
    speedKmph: 62,
    etaMinutes: 15,
    delayMinutes: 0,
    expectedProgressPct: 0,
    actualProgressPct: 0,
    distanceRemainingKm: 138.0,
    nextStop: 'Srirangapatna',
    lastUpdated: new Date()
  },
  '23A': {
    busNumber: '23A',
    registrationNumber: 'KA-01-F-2301',
    routeId: 'ROUTE_23A',
    conductorId: 'COND_01',
    conductorName: 'Ramesh Kumar',
    capacity: 45,
    status: 'ON TIME',
    isTripActive: false,
    currentLocation: { lat: 12.9774, lng: 77.5708 },
    speedKmph: 32,
    etaMinutes: 8,
    delayMinutes: 0,
    expectedProgressPct: 0,
    actualProgressPct: 0,
    distanceRemainingKm: 6.2,
    nextStop: 'KR Market',
    lastUpdated: new Date()
  },
  '17B': {
    busNumber: '17B',
    registrationNumber: 'KA-09-F-1702',
    routeId: 'ROUTE_17B',
    conductorId: 'COND_02',
    conductorName: 'Suresh Gowda',
    capacity: 50,
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
    lastUpdated: new Date()
  }
};

let inMemoryBuses = { ...INITIAL_BUSES };
let inMemoryRoutes = { ...INITIAL_ROUTES };
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
  if (!path || path.length < 2) {
    return { isDeviated: false, distance: 0 };
  }

  let minDistance = Infinity;

  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];

    const x1 = p1[1];
    const y1 = p1[0];
    const x2 = p2[1];
    const y2 = p2[0];

    const x = lng;
    const y = lat;

    const dx = x2 - x1;
    const dy = y2 - y1;

    const lengthSquared = dx * dx + dy * dy;

    let t = 0;

    if (lengthSquared !== 0) {
      t = ((x - x1) * dx + (y - y1) * dy) / lengthSquared;
      t = Math.max(0, Math.min(1, t));
    }

    const closestLng = x1 + t * dx;
    const closestLat = y1 + t * dy;

    const distance = getDistanceKm(
      lat,
      lng,
      closestLat,
      closestLng
    );

    if (distance < minDistance) {
      minDistance = distance;
    }
  }

  return {
    isDeviated: minDistance > thresholdKm,
    distance: minDistance
  };
}

function findNextStop(currentLat, currentLng, stops) {
  if (!stops || stops.length === 0) return 'Depot';
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

async function syncInitialData() {
  inMemoryBuses = { ...INITIAL_BUSES };
  inMemoryRoutes = { ...INITIAL_ROUTES };
}

async function getAllBuses() {
  return inMemoryBuses;
}

async function getAllRoutes() {
  return inMemoryRoutes;
}

function validateBusPayload(payload) {
  const errors = [];
  const { busNumber, registrationNumber, routeId, capacity } = payload;
  
  if (!busNumber || typeof busNumber !== 'string' || busNumber.trim().length === 0) {
    errors.push('busNumber is required and must be a non-empty string');
  }
  if (!registrationNumber || typeof registrationNumber !== 'string' || registrationNumber.trim().length === 0) {
    errors.push('registrationNumber is required and must be a non-empty string');
  }
  if (!routeId || typeof routeId !== 'string' || routeId.trim().length === 0) {
    errors.push('routeId is required and must be a non-empty string');
  }
  if (capacity !== undefined) {
    const numCap = Number(capacity);
    if (isNaN(numCap) || numCap < 1) {
      errors.push('capacity must be a valid positive number');
    }
  }
  return errors;
}

async function registerNewBus(busData) {
  const validationErrors = validateBusPayload(busData);
  if (validationErrors.length > 0) {
    const err = new Error(validationErrors.join(', '));
    err.status = 400;
    throw err;
  }

  const busNo = busData.busNumber.trim();
  const regNo = busData.registrationNumber.trim();
  const rId = busData.routeId.trim();
  const cName = (busData.conductorName || 'Assigned Driver').trim();
  const cap = Number(busData.capacity) || 40;

  const routes = await getAllRoutes();
  const matchedRoute = routes[rId] || INITIAL_ROUTES[rId] || Object.values(routes)[0];
  const defaultLoc = matchedRoute && matchedRoute.stops && matchedRoute.stops[0]
    ? { lat: matchedRoute.stops[0].lat, lng: matchedRoute.stops[0].lng }
    : { lat: 12.9774, lng: 77.5708 };

  const newBusObj = {
    busNumber: busNo,
    registrationNumber: regNo,
    routeId: rId,
    conductorId: `COND_${busNo}`,
    conductorName: cName,
    capacity: cap,
    status: 'READY',
    isTripActive: false,
    currentLocation: defaultLoc,
    speedKmph: 0,
    etaMinutes: 10,
    delayMinutes: 0,
    distanceRemainingKm: 5.0,
    nextStop: matchedRoute && matchedRoute.stops && matchedRoute.stops[0] ? matchedRoute.stops[0].name : 'Depot',
    lastUpdated: new Date()
  };

  inMemoryBuses[busNo] = newBusObj;
  return newBusObj;
}

async function registerNewRoute(routeData) {
  const { routeId, name, city, stops, path } = routeData || {};
  if (!routeId || typeof routeId !== 'string' || !routeId.trim()) {
    const err = new Error('routeId is required');
    err.status = 400;
    throw err;
  }
  if (!name || typeof name !== 'string' || !name.trim()) {
    const err = new Error('name is required');
    err.status = 400;
    throw err;
  }

  const rId = routeId.trim();
  const newRoute = {
    routeId: rId,
    name: name.trim(),
    city: (city || '').trim(),
    stops: Array.isArray(stops) ? stops : [],
    path: Array.isArray(path) ? path : []
  };

  inMemoryRoutes[rId] = newRoute;
  return newRoute;
}

async function processGPSUpdate(busNumber, lat, lng, speed = 30) {
  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const parsedSpeed = Math.max(0, Number(speed) || 0);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    const err = new Error('Latitude and Longitude must be valid numbers');
    err.status = 400;
    throw err;
  }

  const buses = await getAllBuses();
  let bus = buses[busNumber];
  if (!bus) {
    bus = {
      busNumber,
      registrationNumber: busNumber,
      routeId: 'ROUTE_BLR_MYS',
      conductorId: `COND_${busNumber}`,
      conductorName: 'Assigned Driver',
      capacity: 50,
      status: 'ON TIME',
      isTripActive: true,
      currentLocation: { lat: parsedLat, lng: parsedLng },
      speedKmph: Math.round(parsedSpeed),
      etaMinutes: 10,
      delayMinutes: 0,
      distanceRemainingKm: 10.0,
      nextStop: 'En route',
      lastUpdated: new Date()
    };
    inMemoryBuses[busNumber] = bus;
  }

  const routes = await getAllRoutes();
  const route = routes[bus.routeId] || INITIAL_ROUTES[bus.routeId] || INITIAL_ROUTES['ROUTE_BLR_MYS'];

  bus.currentLocation = { lat: parsedLat, lng: parsedLng };
  bus.speedKmph = Math.round(parsedSpeed);
  bus.lastUpdated = new Date();
  bus.isTripActive = true;

  if (route && route.path && route.path.length > 0) {
    const path = route.path;
    const totalWaypoints = path.length - 1;

    let closestIndex = 0;
    let minDistance = Infinity;
    for (let i = 0; i < path.length; i++) {
      const d = getDistanceKm(parsedLat, parsedLng, path[i][0], path[i][1]);
      if (d < minDistance) {
        minDistance = d;
        closestIndex = i;
      }
    }

    bus.actualProgressPct = Math.min(100, Math.round((closestIndex / totalWaypoints) * 100));
    bus.nextStop = findNextStop(parsedLat, parsedLng, route.stops);

    const destWaypoint = path[path.length - 1];
    bus.distanceRemainingKm = parseFloat(getDistanceKm(parsedLat, parsedLng, destWaypoint[0], destWaypoint[1]).toFixed(1));

    const effectiveSpeed = bus.speedKmph > 5 ? bus.speedKmph : 40;
    const calculatedEtaMinutes = Math.max(1, Math.round((bus.distanceRemainingKm / effectiveSpeed) * 60));

    const deviation = checkRouteDeviation(parsedLat, parsedLng, path);

  if (bus.speedKmph < 5 && bus.isTripActive) {


  bus.status = 'DELAYED';
  bus.delayMinutes = Math.max(bus.delayMinutes || 0, 5);
  bus.etaMinutes = calculatedEtaMinutes + bus.delayMinutes;

  const alertMsg =
    `Bus ${bus.busNumber} is moving slowly / delayed (+${bus.delayMinutes} min).`;

  recordAlert(
    bus.busNumber,
    'DELAY',
    alertMsg,
    'MEDIUM'
  );

} else if (deviation.isDeviated) {


  bus.status = 'ROUTE_DEVIATION';

  const alertMsg =
    `Bus ${bus.busNumber} has deviated from assigned route (${(deviation.distance * 1000).toFixed(0)}m away).`;

  recordAlert(
    bus.busNumber,
    'ROUTE_DEVIATION',
    alertMsg,
    'HIGH'
  );

} else {

  bus.status = 'ON TIME';
  bus.delayMinutes = 0;
  bus.etaMinutes = calculatedEtaMinutes;

}

  inMemoryBuses[busNumber] = bus;
  return { bus, route };
}

async function setTripStatus(busNumber, active) {
  const buses = await getAllBuses();
  const bus = buses[busNumber];
  if (!bus) {
    const err = new Error(`Bus ${busNumber} not found`);
    err.status = 404;
    throw err;
  }

  bus.isTripActive = active;
  bus.status = active ? 'LIVE' : 'READY';
  bus.lastUpdated = new Date();
  inMemoryBuses[busNumber] = bus;

  return bus;
}

function recordAlert(busNumber, type, message, severity = 'MEDIUM') {
  const now = Date.now();
  const existing = alerts.find(a => a.busNumber === busNumber && a.type === type && (now - new Date(a.createdAt).getTime()) < 15000);
  if (existing) return existing;

  const newAlert = createAlertModel(busNumber, type, message, severity);
  alerts.unshift(newAlert);
  if (alerts.length > 20) alerts.pop();
  return newAlert;
}

module.exports = {
  getAllBuses,
  getAllRoutes,
  getAlerts: () => alerts,
  registerNewBus,
  registerNewRoute,
  processGPSUpdate,
  setTripStatus,
  syncInitialData
};


