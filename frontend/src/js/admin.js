// frontend/src/js/admin.js - Operations & SLA Compliance Logic
let adminTransitMap = null;
let fleetData = {};
let routesData = {};

function renderFleet() {
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
        <td>${bus.conductorName} <span style="font-size: 10px; color: var(--primary-accent);">● GPS Phone</span></td>
        <td><strong>${bus.speedKmph} km/h</strong></td>
        <td>${bus.nextStop || 'Depot'}</td>
        <td><strong>${bus.etaMinutes} min</strong> ${bus.delayMinutes > 0 ? `<span style="color: var(--status-delayed); font-size: 11px;">(+${bus.delayMinutes}m)</span>` : ''}</td>
        <td><span class="badge ${badgeClass}"><span class="pulse-dot"></span> ${bus.status}</span></td>
        <td style="font-size: 11px; color: var(--text-muted);">${new Date(bus.lastUpdated).toLocaleTimeString()}</td>
      </tr>
    `;
  }).join('');

  // Update KPI counters
  document.getElementById('metricActive').innerText = `${activeCount} Live`;
  document.getElementById('metricOnTime').innerText = `${onTimeCount}`;
  document.getElementById('metricDelayed').innerText = `${delayedCount}`;

  // Update Map bus markers
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
      <div class="alert-title">${alt.type === 'DELAY' ? '⏱ DELAY DETECTED' : '🚨 ROUTE DEVIATION'} • Bus ${alt.busNumber}</div>
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
      if (btn) btn.innerText = '⏳ Simulation Running...';
    });
}

function resetSimulation() {
  fetch('/api/simulation/reset', { method: 'POST' })
    .then(res => res.json())
    .then(() => {
      const btn = document.getElementById('btnStartSim');
      if (btn) btn.innerText = '▶ Start Simulation';
    });
}

const socket = (typeof io !== 'undefined') ? io() : null;

if (socket) {
  socket.on('fleet_init', (data) => {
    fleetData = data.buses;
    routesData = data.routes;
    if (adminTransitMap) {
      adminTransitMap.drawAllRoutes(routesData);
    }
    renderFleet();
    renderAlerts(data.alerts || []);
  });

  socket.on('fleet_update', (data) => {
    fleetData = data.buses;
    renderFleet();
    renderAlerts(data.alerts || []);
    const btn = document.getElementById('btnStartSim');
    if (btn && !data.isSimulating) {
      btn.innerText = '▶ Start Simulation';
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  adminTransitMap = new TransitMap('adminMap', [12.9774, 77.5708], 11);

  fetch('/api/buses')
    .then(res => res.json())
    .then(data => {
      fleetData = data.buses;
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
    .catch(err => console.warn('Could not load admin initial data:', err));
});
