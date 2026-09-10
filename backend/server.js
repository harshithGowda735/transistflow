// backend/server.js - Express & Socket.IO Backend Server for TransitPulse
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

const { ROUTES } = require('./models');
const {
  getBuses,
  getAlerts,
  processGPSUpdate,
  startSimulationEngine,
  resetSimulation,
  isSimulating
} = require('./logic');

const app = express();
const server = http.createServer(app);

// Enable CORS for frontend and mobile driver app
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Static File Routing for Frontend & Driver App
const frontendPublicPath = path.join(__dirname, '..', 'frontend', 'public');
const frontendSrcPath = path.join(__dirname, '..', 'frontend', 'src');
const driverPublicPath = path.join(__dirname, '..', 'driver-app', 'public');
const driverSrcPath = path.join(__dirname, '..', 'driver-app', 'src');
const rootPublicPath = path.join(__dirname, '..', 'public');

// Serve Frontend
app.use(express.static(frontendPublicPath));
app.use('/src', express.static(frontendSrcPath));

// Serve Driver App
app.use('/driver', express.static(driverPublicPath));
app.use('/driver/src', express.static(driverSrcPath));

// Route styles.css and main.css directly so any relative link works
app.get('/styles.css', (req, res) => {
  res.sendFile(path.join(frontendSrcPath, 'styles', 'main.css'));
});
app.get('/main.css', (req, res) => {
  res.sendFile(path.join(frontendSrcPath, 'styles', 'main.css'));
});
app.get('/driver/driver.css', (req, res) => {
  res.sendFile(path.join(driverSrcPath, 'styles', 'driver.css'));
});

// Fallback to root public if needed
app.use(express.static(rootPublicPath));

// Helper to broadcast fleet state via Socket.IO
function broadcastFleetUpdate(payload) {
  io.emit('fleet_update', payload);
}

// REST Endpoints
app.get('/api/buses', (req, res) => {
  res.json({ success: true, buses: getBuses(), isSimulating: isSimulating() });
});

app.get('/api/routes', (req, res) => {
  res.json({ success: true, routes: ROUTES });
});

app.get('/api/alerts', (req, res) => {
  res.json({ success: true, alerts: getAlerts() });
});

// GPS Ingestion Endpoint (Smartphone Geolocation Stream)
app.post('/api/gps', (req, res) => {
  const { busNumber, lat, lng, speed, conductorId } = req.body;
  if (!busNumber || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing busNumber, lat or lng' });
  }

  const buses = getBuses();
  const bus = buses[busNumber];
  if (!bus) {
    return res.status(404).json({ error: `Bus ${busNumber} not found` });
  }

  if (conductorId && bus.conductorId !== conductorId) {
    return res.status(403).json({ error: 'Unauthorized conductor for this bus' });
  }

  const result = processGPSUpdate(busNumber, parseFloat(lat), parseFloat(lng), speed || 30);
  
  broadcastFleetUpdate({
    buses: getBuses(),
    alerts: getAlerts(),
    updatedBus: busNumber,
    isSimulating: isSimulating()
  });

  res.json({ success: true, bus: result.bus });
});

// Conductor / Driver Trip Lifecycle Controls
app.post('/api/trip/start', (req, res) => {
  const { busNumber, conductorId } = req.body;
  const buses = getBuses();
  const bus = buses[busNumber];
  if (!bus) return res.status(404).json({ error: 'Bus not found' });

  bus.isTripActive = true;
  bus.status = 'LIVE';
  bus.lastUpdated = new Date().toISOString();

  broadcastFleetUpdate({ buses: getBuses(), alerts: getAlerts(), isSimulating: isSimulating() });
  res.json({ success: true, message: `Trip started for Bus ${busNumber}`, bus });
});

app.post('/api/trip/end', (req, res) => {
  const { busNumber } = req.body;
  const buses = getBuses();
  const bus = buses[busNumber];
  if (!bus) return res.status(404).json({ error: 'Bus not found' });

  bus.isTripActive = false;
  bus.status = 'READY';
  bus.lastUpdated = new Date().toISOString();

  broadcastFleetUpdate({ buses: getBuses(), alerts: getAlerts(), isSimulating: isSimulating() });
  res.json({ success: true, message: `Trip ended for Bus ${busNumber}`, bus });
});

// Master Simulation Controls
app.post('/api/simulation/start', (req, res) => {
  startSimulationEngine(broadcastFleetUpdate);
  res.json({ success: true, message: 'Simulation started' });
});

app.post('/api/simulation/reset', (req, res) => {
  resetSimulation(broadcastFleetUpdate);
  res.json({ success: true, message: 'Simulation reset' });
});

// Socket.IO Real-Time Streaming
io.on('connection', (socket) => {
  socket.emit('fleet_init', {
    buses: getBuses(),
    routes: ROUTES,
    alerts: getAlerts(),
    isSimulating: isSimulating()
  });

  socket.on('conductor_gps', (data) => {
    const { busNumber, lat, lng, speed } = data;
    if (busNumber && lat && lng) {
      processGPSUpdate(busNumber, parseFloat(lat), parseFloat(lng), speed || 30);
      broadcastFleetUpdate({
        buses: getBuses(),
        alerts: getAlerts(),
        isSimulating: isSimulating()
      });
    }
  });

  socket.on('trigger_simulation', () => {
    startSimulationEngine(broadcastFleetUpdate);
  });

  socket.on('reset_simulation', () => {
    resetSimulation(broadcastFleetUpdate);
  });
});

server.listen(PORT, () => {
  console.log(`[TransitPulse Backend] Server running on http://localhost:${PORT}`);
});
