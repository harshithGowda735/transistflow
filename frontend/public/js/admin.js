let adminTransitMap = null;
let fleetData = {};
let routesData = {};

function checkBusDelays() {
  const tenMinutesMs = 10 * 60 * 1000;
  const now = Date.now();

  Object.values(fleetData).forEach(bus => {
    if (bus.isTripActive && bus.lastUpdated) {
      const elapsed = now - new Date(bus.lastUpdated).getTime();
      if (elapsed > tenMinutesMs) {
        bus.status = 'DELAYED';
        bus.delayMinutes = Math.floor(elapsed / 60000);
      }
    }
  });
}

function loadOwnerBuses() {
  try {
    const saved = localStorage.getItem('transitflow_owner_buses');
    if (saved) {
      const customBuses = JSON.parse(saved);
      fleetData = { ...fleetData, ...customBuses };
    }
  } catch (e) {
    console.warn(e);
  }
}

function handleOwnerAddBus(event) {
  event.preventDefault();
  const busNumber = document.getElementById('newBusNumber').value.trim();
  const registrationNumber = document.getElementById('newRegNumber').value.trim() || `KA-01-F-${Math.floor(1000 + Math.random() * 9000)}`;
  const driverName = document.getElementById('newDriverName').value.trim() || 'Assigned Driver';
  const routeId = document.getElementById('newRouteSelect').value;

  if (!busNumber) return;

  const defaultLoc = routeId === 'ROUTE_17B' ? { lat: 12.3025, lng: 76.6080 } : { lat: 12.9774, lng: 77.5708 };
  const route = routesData[routeId] || { stops: [{ name: 'Depot' }] };

  const newBus = {
    busNumber: busNumber,
    registrationNumber: registrationNumber,
    routeId: routeId,
    conductorId: `COND_${busNumber}`,
    conductorName: driverName,
    status: 'READY',
    isTripActive: false,
    currentLocation: defaultLoc,
    speedKmph: 0,
    etaMinutes: 12,
    delayMinutes: 0,
    distanceRemainingKm: 5.0,
    nextStop: route.stops[0] ? route.stops[0].name : 'Depot',
    lastUpdated: new Date().toISOString()
  };

  fleetData[busNumber] = newBus;

  try {
    const saved = localStorage.getItem('transitflow_owner_buses');
    const existing = saved ? JSON.parse(saved) : {};
    existing[busNumber] = newBus;
    localStorage.setItem('transitflow_owner_buses', JSON.stringify(existing));
  } catch (e) {
    console.warn(e);
  }

  const notice = document.getElementById('ownerNotice');
  if (notice) {
    notice.innerText = `Bus ${busNumber} added successfully! Drivers can now select Bus ${busNumber} in the Driver App.`;
    notice.style.display = 'block';
    setTimeout(() => { notice.style.display = 'none'; }, 5000);
  }

  document.getElementById('newBusNumber').value = '';
  document.getElementById('newRegNumber').value = '';
  document.getElementById('newDriverName').value = '';

  renderFleet();
}

function renderFleet() {
  loadOwnerBuses();
  checkBusDelays();

  const tbody = document.getElementById('fleetTableBody');
  if (!tbody) return;

  const busesList = Object.values(fleetData);
  let onTimeCount = 0;
  let delayedCount = 0;
  let activeCount = 0;

  tbody.innerHTML = busesList.map(bus => {
    const route = routesData[bus.routeId] || { name: 'Unassigned', city: '' };
    if (bus.isTripActive) activeCount++;
    if (bus.status === 'ON TIME') onTimeCount++;
    if (bus.status === 'DELAYED') delayedCount++;

    let badgeClass = 'badge-ontime';
    if (bus.status === 'DELAYED') badgeClass = 'badge-delayed';
    if (bus.status === 'ROUTE_DEVIATION') badgeClass = 'badge-deviation';
    if (bus.status === 'READY') badgeClass = 'badge-ready';

    return `
      <tr>
        <td><strong style="color: var(--primary-navy); font-size: 14px;">${bus.busNumber}</strong> <span style="font-size: 11px; color: var(--text-muted);">(${bus.registrationNumber})</span></td>
        <td>${route.name} <span style="font-size: 11px; color: var(--text-muted);">${route.city}</span></td>
        <td>${bus.conductorName} <span style="font-size: 10px; color: var(--primary-orange); font-weight: 700;">Mobile GPS</span></td>
        <td><strong>${bus.speedKmph} km/h</strong></td>
        <td>${bus.nextStop || 'Depot'}</td>
        <td><strong>${bus.etaMinutes} min</strong> ${bus.delayMinutes > 0 ? `<span style="color: var(--status-delayed); font-size: 11px;">(+${bus.delayMinutes}m delay)</span>` : ''}</td>
        <td><span class="badge ${badgeClass}"><span class="pulse-dot"></span> ${bus.status}</span></td>
        <td style="font-size: 11px; color: var(--text-muted);">${new Date(bus.lastUpdated).toLocaleTimeString()}</td>
      </tr>
    `;
  }).join('');

  const totalMetric = document.getElementById('metricTotalFleet');
  if (totalMetric) totalMetric.innerText = `${busesList.length} Buses`;

  const metricActive = document.getElementById('metricActive');
  if (metricActive) metricActive.innerText = `${activeCount} Live`;

  const metricOnTime = document.getElementById('metricOnTime');
  if (metricOnTime) metricOnTime.innerText = `${onTimeCount}`;

  const metricDelayed = document.getElementById('metricDelayed');
  if (metricDelayed) metricDelayed.innerText = `${delayedCount}`;

  if (adminTransitMap) {
    busesList.forEach(bus => {
      adminTransitMap.updateBusMarker(bus, false);
    });
  }
}

function renderAlerts(alertsList) {
  const metricAlerts = document.getElementById('metricAlerts');
  if (metricAlerts) metricAlerts.innerText = alertsList.length;

  const alertFeed = document.getElementById('alertFeed');
  if (!alertFeed) return;

  if (alertsList.length === 0) {
    alertFeed.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 12px; margin-top: 40px;">
        No critical anomalies detected.<br>All active trips complying with schedule.
      </div>
    `;
    return;
  }

  alertFeed.innerHTML = alertsList.map(alt => `
    <div class="alert-banner ${alt.severity === 'HIGH' ? 'critical' : ''}" style="margin: 0;">
      <div class="alert-title">${alt.type === 'DELAY' ? 'DELAY DETECTED' : 'ROUTE DEVIATION'} • Bus ${alt.busNumber}</div>
      <div class="alert-msg">${alt.message}</div>
      <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Detected at ${new Date(alt.createdAt).toLocaleTimeString()}</div>
    </div>
  `).join('');
}

function startSimulation() {
  fetch('/api/simulation/start', { method: 'POST' })
    .then(res => res.json())
    .then(() => {
      const btn = document.getElementById('btnStartSim');
      if (btn) btn.innerText = 'Simulation Running...';
    });
}

function resetSimulation() {
  fetch('/api/simulation/reset', { method: 'POST' })
    .then(res => res.json())
    .then(() => {
      const btn = document.getElementById('btnStartSim');
      if (btn) btn.innerText = 'Start Simulation';
    });
}

const socket = (typeof io !== 'undefined') ? io() : null;

if (socket) {
  socket.on('fleet_init', (data) => {
    fleetData = data.buses;
    routesData = data.routes;
    loadOwnerBuses();
    if (adminTransitMap) {
      adminTransitMap.drawAllRoutes(routesData);
    }
    renderFleet();
    renderAlerts(data.alerts || []);
  });

  socket.on('fleet_update', (data) => {
    fleetData = data.buses;
    loadOwnerBuses();
    renderFleet();
    renderAlerts(data.alerts || []);
    const btn = document.getElementById('btnStartSim');
    if (btn && !data.isSimulating) {
      btn.innerText = 'Start Simulation';
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  adminTransitMap = new TransitMap('adminMap', [12.9774, 77.5708], 11);

  fetch('/api/buses')
    .then(res => res.json())
    .then(data => {
      fleetData = data.buses;
      loadOwnerBuses();
      return fetch('/api/routes');
    })
    .then(res => res.json())
    .then(data => {
      routesData = data.routes;
      if (adminTransitMap) {
        adminTransitMap.drawAllRoutes(routesData);
      }
      renderFleet();
      return fetch('/api/alerts');
    })
    .then(res => res.json())
    .then(data => {
      renderAlerts(data.alerts || []);
    })
    .catch(err => console.warn(err));
});
