let adminTransitMap = null;
let fleetData = {};
let routesData = {};

async function handleOwnerAddBus(event) {
  event.preventDefault();
  const busNumber = document.getElementById('newBusNumber').value.trim();
  const registrationNumber = document.getElementById('newRegNumber').value.trim();
  const driverName = document.getElementById('newDriverName').value.trim();
  const routeId = document.getElementById('newRouteSelect').value;

  const notice = document.getElementById('ownerNotice');
  const errorNotice = document.getElementById('ownerErrorNotice');

  if (notice) notice.style.display = 'none';
  if (errorNotice) errorNotice.style.display = 'none';

  if (!busNumber) {
    if (errorNotice) {
      errorNotice.innerText = 'Bus Number is required';
      errorNotice.style.display = 'block';
    }
    return;
  }

  const payload = {
    busNumber,
    registrationNumber: registrationNumber || `KA-01-F-${Math.floor(1000 + Math.random() * 9000)}`,
    routeId,
    conductorName: driverName || 'Assigned Driver',
    capacity: 45
  };

  try {
    const res = await fetch('/api/buses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      if (errorNotice) {
        errorNotice.innerText = data.error || 'Failed to add bus';
        errorNotice.style.display = 'block';
      }
      return;
    }

    if (notice) {
      notice.innerText = `Bus ${busNumber} registered successfully in MongoDB! Available in Driver Terminal.`;
      notice.style.display = 'block';
      setTimeout(() => { notice.style.display = 'none'; }, 5000);
    }

    document.getElementById('newBusNumber').value = '';
    document.getElementById('newRegNumber').value = '';
    document.getElementById('newDriverName').value = '';

    await reloadFleet();
  } catch (err) {
    if (errorNotice) {
      errorNotice.innerText = err.message || 'Network error adding bus';
      errorNotice.style.display = 'block';
    }
  }
}

async function reloadFleet() {
  try {
    const res = await fetch('/api/buses');
    const data = await res.json();
    if (data.success && data.buses) {
      fleetData = data.buses;
      renderFleet();
    }
  } catch (e) {}
}

function renderFleet() {
  const tbody = document.getElementById('fleetTableBody');
  if (!tbody) return;

  const busesList = Object.values(fleetData);
  let onTimeCount = 0;
  let delayedCount = 0;
  let activeCount = 0;

  tbody.innerHTML = busesList.map(bus => {
    const route = routesData[bus.routeId] || { name: bus.routeId || 'Unassigned', city: '' };
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
        <td>${route.name} <span style="font-size: 11px; color: var(--text-muted);">${route.city || ''}</span></td>
        <td>${bus.conductorName || 'Assigned Driver'} <span style="font-size: 10px; color: var(--primary-orange); font-weight: 700;">Mobile GPS</span></td>
        <td><strong>${bus.speedKmph || 0} km/h</strong></td>
        <td>${bus.nextStop || 'Depot'}</td>
        <td><strong>${bus.etaMinutes || 10} min</strong> ${bus.delayMinutes > 0 ? `<span style="color: var(--status-delayed); font-size: 11px;">(+${bus.delayMinutes}m delay)</span>` : ''}</td>
        <td><span class="badge ${badgeClass}"><span class="pulse-dot"></span> ${bus.status || 'READY'}</span></td>
        <td style="font-size: 11px; color: var(--text-muted);">${bus.lastUpdated ? new Date(bus.lastUpdated).toLocaleTimeString() : '--'}</td>
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
        No critical anomalies detected.<br>All active trips complying with corridor schedule.
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

const socket = (typeof io !== 'undefined') ? io() : null;

if (socket) {
  socket.on('fleet_init', (data) => {
    fleetData = data.buses;
    routesData = data.routes;
    if (adminTransitMap && routesData) {
      adminTransitMap.drawAllRoutes(routesData);
    }
    renderFleet();
    renderAlerts(data.alerts || []);
  });

  socket.on('fleet_update', (data) => {
    fleetData = data.buses;
    renderFleet();
    renderAlerts(data.alerts || []);
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
    .catch(err => console.warn(err));
});
