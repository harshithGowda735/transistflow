const {
  BusModel,
  RouteModel,
  TripLocationLogModel,
  INITIAL_ROUTES,
  INITIAL_BUSES,
  createAlertModel
} = require('./models');

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
  } catch (e) {}

  inMemoryBuses[busNo] = newBusObj;
  return newBusObj;
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
  processGPSUpdate,
  setTripStatus,
  syncInitialData,
  validateBusPayload
};
