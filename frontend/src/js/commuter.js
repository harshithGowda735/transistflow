// frontend/src/js/commuter.js - Commuter Application Logic with Route Selection
let selectedBusNumber = '23A';
let currentOrigin = 'Majestic';
let currentDestination = 'Vijayanagar';
let fleetData = {};
let routesData = {};
let transitMap = null;

function setOrigin(loc) {
  currentOrigin = loc;
  document.getElementById('inputOrigin').value = loc;
  
  // Highlight active chip in Origin row
  document.querySelectorAll('#originChips .pill-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.val === loc);
  });

  resolveRouteMatch();
}

function setDestination(loc) {
  currentDestination = loc;
  document.getElementById('inputDest').value = loc;

  // Highlight active chip in Dest row
  document.querySelectorAll('#destChips .pill-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.val === loc);
  });

  resolveRouteMatch();
}

function swapLocations() {
  const temp = currentOrigin;
  currentOrigin = currentDestination;
  currentDestination = temp;

  document.getElementById('inputOrigin').value = currentOrigin;
  document.getElementById('inputDest').value = currentDestination;

  document.querySelectorAll('#originChips .pill-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.val === currentOrigin);
  });

  document.querySelectorAll('#destChips .pill-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.val === currentDestination);
  });

  resolveRouteMatch();
}

function onManualOriginInput(val) {
  currentOrigin = val;
  document.querySelectorAll('#originChips .pill-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.val.toLowerCase() === val.toLowerCase());
  });
  resolveRouteMatch();
}

function onManualDestInput(val) {
  currentDestination = val;
  document.querySelectorAll('#destChips .pill-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.val.toLowerCase() === val.toLowerCase());
  });
  resolveRouteMatch();
}

function resolveRouteMatch() {
  const o = currentOrigin.toLowerCase();
  const d = currentDestination.toLowerCase();

  if (o.includes('bogadi') || d.includes('mysuru') || o.includes('mysuru') || d.includes('bogadi')) {
    selectBus('17B');
  } else {
    selectBus('23A');
  }
}

function selectBus(busNumber) {
  selectedBusNumber = busNumber;
  renderView();
}

function renderView() {
  const bus = fleetData[selectedBusNumber];
  if (!bus) return;

  const route = routesData[bus.routeId];
  if (!route) return;

  // Update DOM telemetry
  document.getElementById('busTitle').innerText = `Bus ${bus.busNumber}`;
  document.getElementById('routeSubtitle').innerText = `${route.name} (${route.city})`;
  document.getElementById('etaDisplay').innerText = `${bus.etaMinutes} min`;
  document.getElementById('nextStopDisplay').innerText = bus.nextStop || 'En Route';
  document.getElementById('distanceDisplay').innerText = `${bus.distanceRemainingKm} km remaining`;
  document.getElementById('speedDisplay').innerText = `${bus.speedKmph} km/h`;

  // Status Badge
  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const delayDeltaText = document.getElementById('delayDeltaText');

  if (bus.status === 'DELAYED') {
    statusBadge.className = 'badge badge-delayed';
    statusText.innerText = 'DELAYED';
    delayDeltaText.innerText = `+${bus.delayMinutes} min delay detected`;
  } else if (bus.status === 'ROUTE_DEVIATION') {
    statusBadge.className = 'badge badge-deviation';
    statusText.innerText = 'DEVIATION';
    delayDeltaText.innerText = 'Off expected corridor';
  } else {
    statusBadge.className = 'badge badge-ontime';
    statusText.innerText = 'ON TIME';
    delayDeltaText.innerText = 'Normal Schedule';
  }

  // Render Alert Banner
  const alertContainer = document.getElementById('alertContainer');
  if (bus.status === 'DELAYED') {
    alertContainer.innerHTML = `
      <div class="alert-banner">
        <div class="alert-title">⚠ AUTOMATIC DELAY DETECTED</div>
        <div class="alert-msg">Bus ${bus.busNumber} is moving slower than scheduled timetable (+${bus.delayMinutes} min delay).</div>
      </div>
    `;
  } else if (bus.status === 'ROUTE_DEVIATION') {
    alertContainer.innerHTML = `
      <div class="alert-banner critical">
        <div class="alert-title">🚨 ROUTE DEVIATION DETECTED</div>
        <div class="alert-msg">Bus ${bus.busNumber} has deviated from assigned route corridor.</div>
      </div>
    `;
  } else {
    alertContainer.innerHTML = '';
  }

  // Render Smart Fallback Card on delay
  const fallbackContainer = document.getElementById('fallbackContainer');
  if (bus.status === 'DELAYED' && bus.busNumber === '17B') {
    fallbackContainer.innerHTML = `
      <div class="fallback-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="fallback-badge">Smart Fallback</span>
          <span style="font-size: 11px; color: #ea580c; font-weight: 700;">Service Delay Detected</span>
        </div>
        <div style="font-size: 12px; color: #7c2d12; margin-top: 6px;">
          Bus 17B is delayed. Recommended alternatives:
        </div>
        <div class="fallback-option">
          <div>
            <strong style="font-size: 12px; color: #1e293b;">Alternative: Bus 23A</strong>
            <div style="font-size: 11px; color: var(--status-ontime); font-weight: 600;">● On Time • Arriving in 7 min</div>
          </div>
          <button class="btn btn-outline" style="font-size: 11px; padding: 4px 10px;" onclick="setOrigin('Majestic'); setDestination('Vijayanagar');">Track Bus</button>
        </div>
        <div class="fallback-option">
          <div>
            <strong style="font-size: 12px; color: #1e293b;">Partner Ride (Auto/Cab)</strong>
            <div style="font-size: 11px; color: #64748b;">
              <span style="text-decoration: line-through;">₹80</span> <strong style="color: #0f172a;">₹60</strong> (Namma Rasthe Subsidy)
            </div>
          </div>
          <button class="btn btn-primary" style="font-size: 11px; padding: 4px 10px;">Book Ride</button>
        </div>
      </div>
    `;
  } else {
    fallbackContainer.innerHTML = '';
  }

  // Render Route Stops
  const stopsList = document.getElementById('stopsList');
  stopsList.innerHTML = route.stops.map((stop) => `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 10px; height: 10px; border-radius: 50%; background: ${stop.name === bus.nextStop ? '#ea580c' : '#0f172a'}; border: 2px solid #fff; box-shadow: 0 0 0 1.5px #cbd5e1;"></div>
      <div style="flex: 1;">
        <div style="font-size: 13px; font-weight: ${stop.name === bus.nextStop ? '700' : '500'}; color: ${stop.name === bus.nextStop ? '#ea580c' : '#1e293b'};">
          ${stop.name} ${stop.name === bus.nextStop ? '<span style="font-size: 10px; background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; padding: 1px 5px; border-radius: 9999px; margin-left: 4px; font-weight: 800;">NEXT</span>' : ''}
        </div>
      </div>
    </div>
  `).join('');

  // Update map
  if (transitMap) {
    transitMap.drawSingleRoute(route, bus.status);
    transitMap.updateBusMarker(bus, true);
  }
}

// Connect to backend Socket.IO
const socket = (typeof io !== 'undefined') ? io() : null;

if (socket) {
  socket.on('fleet_init', (data) => {
    fleetData = data.buses;
    routesData = data.routes;
    renderView();
  });

  socket.on('fleet_update', (data) => {
    fleetData = data.buses;
    renderView();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  transitMap = new TransitMap('map', [12.9774, 77.5708], 13);
  
  fetch('/api/buses')
    .then(res => res.json())
    .then(data => {
      fleetData = data.buses;
      return fetch('/api/routes');
    })
    .then(res => res.json())
    .then(data => {
      routesData = data.routes;
      renderView();
    })
    .catch(err => console.warn('Could not fetch initial data:', err));
});
