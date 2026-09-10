// server.js - Express & Socket.IO Backend for TransitPulse / Namma Raste
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

const {
  ROUTES,
  buses,
  alerts,
  processGPSUpdate,
  startSimulationEngine,
  resetSimulation,
  isSimulating
} = require('./logic');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Broadcast helper for Socket.IO clients
function broadcastFleetUpdate(payload) {
  io.emit('fleet_update', payload);
}

// REST Endpoints
app.get('/api/buses', (req, res) => {
  res.json({ success: true, buses, isSimulating: isSimulating() });
});

app.get('/api/routes', (req, res) => {
  res.json({ success: true, routes: ROUTES });
});

app.get('/api/alerts', (req, res) => {
  res.json({ success: true, alerts });
});

// Conductor GPS Ingestion Endpoint (Real Smartphone GPS Stream)
app.post('/api/gps', (req, res) => {
  const { busNumber, lat, lng, speed, conductorId } = req.body;
  if (!busNumber || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing busNumber, lat or lng' });
  }

  const bus = buses[busNumber];
  if (!bus) {
    return res.status(404).json({ error: `Bus ${busNumber} not found` });
  }

  // Security & Session Check: Only active trip with assigned conductor can transmit GPS
  if (conductorId && bus.conductorId !== conductorId) {
    return res.status(403).json({ error: 'Unauthorized conductor for this bus' });
  }

  const result = processGPSUpdate(busNumber, parseFloat(lat), parseFloat(lng), speed || 30);
  
  broadcastFleetUpdate({
    buses,
    alerts,
    updatedBus: busNumber,
    isSimulating: isSimulating()
  });

  res.json({ success: true, bus: result.bus });
});

// Conductor Trip Control
app.post('/api/trip/start', (req, res) => {
  const { busNumber, conductorId } = req.body;
  const bus = buses[busNumber];
  if (!bus) return res.status(404).json({ error: 'Bus not found' });

  bus.isTripActive = true;
  bus.status = 'LIVE';
  bus.lastUpdated = new Date().toISOString();

  broadcastFleetUpdate({ buses, alerts, isSimulating: isSimulating() });
  res.json({ success: true, message: `Trip started for Bus ${busNumber}`, bus });
});

app.post('/api/trip/end', (req, res) => {
  const { busNumber } = req.body;
  const bus = buses[busNumber];
  if (!bus) return res.status(404).json({ error: 'Bus not found' });

  bus.isTripActive = false;
  bus.status = 'READY';
  bus.lastUpdated = new Date().toISOString();

  broadcastFleetUpdate({ buses, alerts, isSimulating: isSimulating() });
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

// Socket.IO Real-time streaming
io.on('connection', (socket) => {
  // Send current snapshot immediately on connection
  socket.emit('fleet_init', {
    buses,
    routes: ROUTES,
    alerts,
    isSimulating: isSimulating()
  });

  // Allow conductor to push GPS directly over WebSockets
  socket.on('conductor_gps', (data) => {
    const { busNumber, lat, lng, speed } = data;
    if (busNumber && lat && lng) {
      processGPSUpdate(busNumber, lat, lng, speed || 30);
      broadcastFleetUpdate({ buses, alerts, isSimulating: isSimulating() });
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
  console.log(`[TransitPulse] Server running on http://localhost:${PORT}`);
});
