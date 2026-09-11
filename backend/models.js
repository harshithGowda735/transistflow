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
  createAlertModel
};

