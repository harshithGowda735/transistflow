const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

const {
  getAllBuses,
  getAllRoutes,
  getAlerts,
  registerNewBus,
  registerNewRoute,
  processGPSUpdate,
  setTripStatus,
  syncInitialData
} = require('./logic');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

syncInitialData();

app.use(cors());
app.use(express.json());

const frontendPublicPath = path.join(__dirname, '..', 'frontend', 'public');
const driverPublicPath = path.join(__dirname, '..', 'driver-app', 'public');

app.use(express.static(frontendPublicPath));
app.use('/driver', express.static(driverPublicPath));

async function broadcastFleetUpdate(extra = {}) {
  const buses = await getAllBuses();
  const alerts = getAlerts();
  io.emit('fleet_update', {
    buses,
    alerts,
    ...extra
  });
}

app.get('/api/buses', async (req, res) => {
  try {
    const buses = await getAllBuses();
    res.json({ success: true, buses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/buses', async (req, res) => {
  try {
    const newBus = await registerNewBus(req.body);
    await broadcastFleetUpdate({ addedBus: newBus.busNumber });
    res.status(201).json({ success: true, bus: newBus });
  } catch (err) {
    const statusCode = err.status || 400;
    res.status(statusCode).json({ success: false, error: err.message });
  }
});

app.get('/api/routes', async (req, res) => {
  try {
    const routes = await getAllRoutes();
    res.json({ success: true, routes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/routes/:routeId', async (req, res) => {
  try {
    const routes = await getAllRoutes();
    const route = routes[req.params.routeId];
    if (!route) {
      return res.status(404).json({ success: false, error: 'Route not found' });
    }
    res.json({ success: true, route });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/routes', async (req, res) => {
  try {
    const route = await registerNewRoute(req.body);
    res.status(201).json({ success: true, route });
  } catch (err) {
    const statusCode = err.status || 400;
    res.status(statusCode).json({ success: false, error: err.message });
  }
});

app.get('/api/alerts', (req, res) => {
  res.json({ success: true, alerts: getAlerts() });
});

app.post('/api/gps', async (req, res) => {
  const { busNumber, lat, lng, speed } = req.body;
  if (!busNumber) {
    return res.status(400).json({ success: false, error: 'busNumber is required' });
  }
  if (lat === undefined || isNaN(Number(lat)) || lng === undefined || isNaN(Number(lng))) {
    return res.status(400).json({ success: false, error: 'Valid numeric lat and lng are required' });
  }

  try {
    const result = await processGPSUpdate(busNumber, lat, lng, speed);
    await broadcastFleetUpdate({ updatedBus: busNumber });
    res.json({ success: true, bus: result.bus });
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
});

app.post('/api/trip/start', async (req, res) => {
  const { busNumber } = req.body;
  if (!busNumber) {
    return res.status(400).json({ success: false, error: 'busNumber is required' });
  }

  try {
    const bus = await setTripStatus(busNumber, true);
    await broadcastFleetUpdate({ updatedBus: busNumber });
    res.json({ success: true, bus });
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
});

app.post('/api/trip/end', async (req, res) => {
  const { busNumber } = req.body;
  if (!busNumber) {
    return res.status(400).json({ success: false, error: 'busNumber is required' });
  }

  try {
    const bus = await setTripStatus(busNumber, false);
    await broadcastFleetUpdate({ updatedBus: busNumber });
    res.json({ success: true, bus });
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({ success: false, error: err.message });
  }
});

const osrmRouteCache = {};
app.get('/api/route/osrm', async (req, res) => {
  const { coords } = req.query;
  if (!coords) {
    return res.status(400).json({ error: 'Coordinates query parameter required (lng,lat;lng,lat)' });
  }

  if (osrmRouteCache[coords]) {
    return res.json(osrmRouteCache[coords]);
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM API response status: ${response.status}`);
    }
    const data = await response.json();
    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      const coordinates = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      const payload = { success: true, path: coordinates, distance: data.routes[0].distance, duration: data.routes[0].duration };
      osrmRouteCache[coords] = payload;
      return res.json(payload);
    }
    res.status(400).json({ success: false, error: 'Could not calculate road route' });
  } catch (err) {
    res.status(502).json({ success: false, error: err.message });
  }
});

io.on('connection', async (socket) => {
  const buses = await getAllBuses();
  const routes = await getAllRoutes();
  const alerts = getAlerts();

  socket.emit('fleet_init', {
    buses,
    routes,
    alerts
  });

  socket.on('conductor_gps', async (data) => {
    const { busNumber, lat, lng, speed } = data;
    if (busNumber && lat !== undefined && lng !== undefined) {
      try {
        await processGPSUpdate(busNumber, lat, lng, speed);
        await broadcastFleetUpdate({ updatedBus: busNumber });
      } catch (e) {}
    }
  });

  socket.on('trip_toggle', async (data) => {
    const { busNumber, active } = data;
    if (busNumber) {
      try {
        await setTripStatus(busNumber, active);
        await broadcastFleetUpdate({ updatedBus: busNumber });
      } catch (e) {}
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Sanchar Saathi Server] Running on http://localhost:${PORT}`);
});

