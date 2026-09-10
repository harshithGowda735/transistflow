// backend/models.js - Data Models and Schemas for TransitPulse

/**
 * Predefined Route Corridor Definitions with road path polylines and stops
 */
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
    // Precise road waypoints
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

/**
 * Initial Fleet state
 */
function createInitialFleet() {
  return {
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
}

/**
 * Alert Factory
 */
function createAlertModel(busNumber, type, message, severity = 'MEDIUM') {
  return {
    id: 'ALT_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    busNumber,
    type, // 'DELAY' | 'ROUTE_DEVIATION' | 'SYSTEM'
    message,
    severity, // 'LOW' | 'MEDIUM' | 'HIGH'
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  ROUTES,
  createInitialFleet,
  createAlertModel
};
