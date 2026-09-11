const {
  BusModel,
  RouteModel,
  TripLocationLogModel,
  createAlertModel
} = require('./models');

const INITIAL_ROUTES = {
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
  if (!path || path.length === 0) return { isDeviated: false, distance: 0 };
  let minDistance = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = getDistanceKm(lat, lng, path[i][0], path[i][1]);
    if (d < minDistance) minDistance = d;
  }
  return { isDeviated: minDistance > thresholdKm, distance: minDistance };
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
  try {
    for (const [rId, rData] of Object.entries(INITIAL_ROUTES)) {
      await RouteModel.findOneAndUpdate({ routeId: rId }, rData, { upsert: true, new: true }).catch(() => {});
    }
    for (const [bNo, bData] of Object.entries(INITIAL_BUSES)) {
      await BusModel.findOneAndUpdate({ busNumber: bNo }, bData, { upsert: true, new: true }).catch(() => {});
    }
  } catch (e) {}
}

async function getAllBuses() {
  try {
    const docs = await BusModel.find({}).lean().exec();
    if (docs && docs.length > 0) {
      const map = {};
      docs.forEach(b => { map[b.busNumber] = b; });
      inMemoryBuses = map;
      return map;
    }
  } catch (e) {}
  return inMemoryBuses;
}

async function getAllRoutes() {
  try {
    const docs = await RouteModel.find({}).lean().exec();
    if (docs && docs.length > 0) {
      const map = {};
      docs.forEach(r => { map[r.routeId] = r; });
      inMemoryRoutes = map;
      return map;
    }
  } catch (e) {}
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

  try {
    await BusModel.findOneAndUpdate(
      { busNumber: busNo },
      newBusObj,
      { upsert: true, new: true, runValidators: true }
    ).exec();
  } catch (e) {
    if (e.name === 'ValidationError' || e.code === 11000) {
      e.status = 400;
      throw e;
    }
  }

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

  try {
    await RouteModel.findOneAndUpdate(
      { routeId: rId },
      newRoute,
      { upsert: true, new: true, runValidators: true }
    ).exec();
  } catch (e) {
    if (e.name === 'ValidationError') {
      e.status = 400;
      throw e;
    }
  }

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
  const bus = buses[busNumber];
  if (!bus) {
    const err = new Error(`Bus ${busNumber} not registered`);
    err.status = 404;
    throw err;
  }

  const routes = await getAllRoutes();
  const route = routes[bus.routeId] || INITIAL_ROUTES[bus.routeId];

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

    const effectiveSpeed = bus.speedKmph > 5 ? bus.speedKmph : 20;
    const calculatedEtaMinutes = Math.max(1, Math.round((bus.distanceRemainingKm / effectiveSpeed) * 60));

    const deviation = checkRouteDeviation(parsedLat, parsedLng, path);

    if (deviation.isDeviated) {
      bus.status = 'ROUTE_DEVIATION';
      const alertMsg = `Bus ${bus.busNumber} has deviated from assigned route (${(deviation.distance * 1000).toFixed(0)}m away).`;
      recordAlert(bus.busNumber, 'ROUTE_DEVIATION', alertMsg, 'HIGH');
    } else if (bus.speedKmph < 5 && bus.isTripActive) {
      bus.status = 'DELAYED';
      bus.delayMinutes = Math.max(bus.delayMinutes || 0, 5);
      bus.etaMinutes = calculatedEtaMinutes + bus.delayMinutes;
      const alertMsg = `Bus ${bus.busNumber} is moving slowly / delayed (+${bus.delayMinutes} min).`;
      recordAlert(bus.busNumber, 'DELAY', alertMsg, 'MEDIUM');
    } else {
      bus.status = 'ON TIME';
      bus.delayMinutes = 0;
      bus.etaMinutes = calculatedEtaMinutes;
    }
  }

  inMemoryBuses[busNumber] = bus;

  try {
    await BusModel.findOneAndUpdate(
      { busNumber },
      bus,
      { upsert: true, new: true }
    ).exec();

    await TripLocationLogModel.create({
      busNumber,
      lat: parsedLat,
      lng: parsedLng,
      speed: parsedSpeed,
      timestamp: new Date()
    }).catch(() => {});
  } catch (e) {}

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

  try {
    await BusModel.findOneAndUpdate(
      { busNumber },
      { isTripActive: active, status: bus.status, lastUpdated: bus.lastUpdated },
      { new: true }
    ).exec();
  } catch (e) {}

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

