const mongoose = require('mongoose');

const BusSchema = new mongoose.Schema({
  busNumber: { 
    type: String, 
    required: [true, 'Bus number is required'], 
    trim: true, 
    unique: true 
  },
  registrationNumber: { 
    type: String, 
    required: [true, 'Registration number is required'], 
    trim: true 
  },
  routeId: { 
    type: String, 
    required: [true, 'Route ID is required'], 
    trim: true 
  },
  conductorId: { 
    type: String, 
    trim: true, 
    default: '' 
  },
  conductorName: { 
    type: String, 
    trim: true, 
    default: 'Assigned Driver' 
  },
  capacity: { 
    type: Number, 
    min: [1, 'Capacity must be at least 1'], 
    default: 40 
  },
  status: { 
    type: String, 
    enum: ['READY', 'LIVE', 'ON TIME', 'DELAYED', 'ROUTE_DEVIATION', 'COMPLETED'], 
    default: 'READY' 
  },
  currentLocation: {
    lat: { type: Number, required: [true, 'Latitude is required'] },
    lng: { type: Number, required: [true, 'Longitude is required'] }
  },
  speedKmph: { 
    type: Number, 
    min: [0, 'Speed cannot be negative'], 
    default: 0 
  },
  etaMinutes: { 
    type: Number, 
    min: [0, 'ETA cannot be negative'], 
    default: 10 
  },
  delayMinutes: { 
    type: Number, 
    min: [0, 'Delay cannot be negative'], 
    default: 0 
  },
  distanceRemainingKm: { 
    type: Number, 
    min: [0, 'Distance cannot be negative'], 
    default: 5.0 
  },
  nextStop: { 
    type: String, 
    trim: true, 
    default: 'Depot' 
  },
  isTripActive: { 
    type: Boolean, 
    default: false 
  },
  lastUpdated: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

const OwnerSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Owner name is required'], trim: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  company: { type: String, trim: true }
}, { timestamps: true });

const DriverSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Driver name is required'], trim: true },
  phone: { type: String, trim: true },
  licenseNumber: { type: String, trim: true },
  assignedBusNumber: { type: String, trim: true },
  activeStatus: { type: Boolean, default: true }
}, { timestamps: true });

const RouteSchema = new mongoose.Schema({
  routeId: { type: String, required: [true, 'Route ID is required'], unique: true, trim: true },
  name: { type: String, required: [true, 'Route name is required'], trim: true },
  city: { type: String, required: [true, 'City is required'], trim: true },
  stops: [{
    name: { type: String, required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    order: { type: Number, required: true }
  }],
  path: [[Number]]
}, { timestamps: true });

const TripLocationLogSchema = new mongoose.Schema({
  busNumber: { type: String, required: true, trim: true },
  tripId: { type: String, trim: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  speed: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

const BusModel = mongoose.models.Bus || mongoose.model('Bus', BusSchema);
const OwnerModel = mongoose.models.Owner || mongoose.model('Owner', OwnerSchema);
const DriverModel = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);
const RouteModel = mongoose.models.Route || mongoose.model('Route', RouteSchema);
const TripLocationLogModel = mongoose.models.TripLocationLog || mongoose.model('TripLocationLog', TripLocationLogSchema);

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

function createAlertModel(busNumber, type, message, severity = 'MEDIUM') {
  return {
    id: 'ALT_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    busNumber,
    type,
    message,
    severity,
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  BusModel,
  OwnerModel,
  DriverModel,
  RouteModel,
  TripLocationLogModel,
  INITIAL_ROUTES,
  INITIAL_BUSES,
  createAlertModel
};
