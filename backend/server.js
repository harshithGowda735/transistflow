const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { detectRouteDeviationFromPath } = require("./logic");
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, methods: ["GET", "POST"] } });
app.use(cors()); app.use(express.json());
const routes = [
  { id: "route-a", name: "Route A", origin: "Majestic", destination: "Vijayanagar", color: "#2563eb", durationMinutes: 38, stops: ["Majestic", "City Market", "Vijayanagar"], path: [[12.9763, 77.5713], [12.9667, 77.5664], [12.9615, 77.5456], [12.9706, 77.5382]] },
  { id: "route-b", name: "Route B", origin: "Bogadi", destination: "Mysuru City Center", color: "#0f766e", durationMinutes: 34, stops: ["Bogadi", "Kuvempunagar", "Mysuru City Center"], path: [[12.318, 76.594], [12.292, 76.613], [12.305, 76.639], [12.3052, 76.655]] },
];
const buses = [
  { number: "23A", routeId: "route-a", conductor: "Rajesh Kumar", status: "ON TIME", eta: "8 min", progress: 18, location: { lat: 12.9702, lng: 77.559 }, lastUpdate: new Date().toISOString(), active: false },
  { number: "17B", routeId: "route-b", conductor: "Suresh Babu", status: "ON TIME", eta: "11 min", progress: 16, location: { lat: 12.298, lng: 76.608 }, lastUpdate: new Date().toISOString(), active: false },
];
let alerts = [], simulationTimer = null, simulationTick = 0;
const publicBus = (bus) => ({ ...bus, route: routes.find((route) => route.id === bus.routeId) });
const addAlert = (bus, type, message) => { const alert = { id: `${Date.now()}-${bus.number}-${type}`, busNumber: bus.number, type, message, createdAt: new Date().toISOString() }; alerts = [alert, ...alerts].slice(0, 30); io.emit("alert", alert); };
function updateBus(bus, progress, deviation = false) {
  const route = routes.find((item) => item.id === bus.routeId); const index = Math.min(route.path.length - 2, Math.floor(progress / 100 * (route.path.length - 1))); const local = progress / 100 * (route.path.length - 1) - index; const [a, b] = [route.path[index], route.path[index + 1]];
  bus.location = { lat: a[0] + (b[0] - a[0]) * local + (deviation ? 0.006 : 0), lng: a[1] + (b[1] - a[1]) * local + (deviation ? 0.006 : 0) }; bus.progress = Math.round(progress); bus.lastUpdate = new Date().toISOString(); bus.active = true; bus.eta = `${Math.max(1, Math.round(route.durationMinutes * (100 - progress) / 100))} min`;
}
function simulationStep() {
  simulationTick++; const first = buses[0], second = buses[1]; updateBus(first, (simulationTick * 1.4) % 101); const slowProgress = simulationTick < 28 ? simulationTick * 1.2 : 33.6 + (simulationTick - 28) * 0.38; const deviated = slowProgress >= 70; updateBus(second, Math.min(slowProgress, 99), deviated);
  if (simulationTick === 28) { second.status = "DELAYED"; addAlert(second, "delay", "17B is running more than 5 minutes late."); }
  if (deviated && simulationTick === 59) { second.status = "DEVIATION"; addAlert(second, "deviation", "17B has left its planned route near Mysuru City Center."); }
  io.emit("bus-location-update", { buses: buses.map(publicBus), simulationTick });
}
app.get("/", (req, res) => res.json({ message: "TransitPulse backend is running" }));
app.get("/api/health", (req, res) => res.json({ success: true, message: "TransitPulse API is working" }));
app.get("/api/buses", (req, res) => res.json(buses.map(publicBus)));
app.get("/api/routes", (req, res) => res.json(routes));
app.get("/api/alerts", (req, res) => res.json(alerts));
app.post("/api/login", (req, res) => { const role = req.body.role || "passenger"; const users = { passenger: { name: "Ananya Sharma", role }, operator: { name: "Transit Operations", role }, conductor: { name: "Rajesh Kumar", role, assignedBus: "23A" } }; res.json({ success: true, user: users[role] || users.passenger }); });
app.post("/api/trip/start", (req, res) => { const bus = buses.find((item) => item.number === req.body.busNumber) || buses[0]; bus.active = true; bus.status = "ON TIME"; io.emit("trip-started", publicBus(bus)); res.json(publicBus(bus)); });
app.post("/api/trip/end", (req, res) => { const bus = buses.find((item) => item.number === req.body.busNumber); if (bus) bus.active = false; io.emit("trip-ended", bus && publicBus(bus)); res.json(bus ? publicBus(bus) : { success: false }); });
app.post("/api/simulation/start", (req, res) => { if (!simulationTimer) { simulationTick = 0; simulationTimer = setInterval(simulationStep, 1000); } res.json({ running: true }); });
app.post("/api/simulation/stop", (req, res) => { if (simulationTimer) clearInterval(simulationTimer); simulationTimer = null; simulationTick = 0; alerts = []; buses.forEach((bus, index) => { bus.status = "ON TIME"; bus.active = false; bus.progress = index ? 16 : 18; }); io.emit("simulation-reset"); res.json({ running: false, buses: buses.map(publicBus), alerts }); });
io.on("connection", (socket) => { socket.emit("bus-location-update", { buses: buses.map(publicBus) }); socket.on("bus-location", (data) => { const bus = buses.find((item) => item.number === data.busNumber); if (bus && data.location) { bus.location = data.location; bus.active = true; bus.lastUpdate = new Date().toISOString(); io.emit("bus-location-update", { buses: buses.map(publicBus) }); } }); });
const PORT = process.env.PORT || 5000; server.listen(PORT, () => console.log(`TransitPulse server running on port ${PORT}`));
