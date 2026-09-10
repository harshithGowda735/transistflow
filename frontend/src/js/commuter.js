let selectedBusNumber = '23A';
let currentOrigin = 'Majestic';
let currentDestination = 'Vijayanagar';
let fleetData = {};
let routesData = {};
let transitMap = null;
let toastDismissed = false;

const knownStops = [
  { name: 'Majestic KBS', code: 'Majestic', city: 'Bengaluru' },
  { name: 'KR Market', code: 'KR Market', city: 'Bengaluru' },
  { name: 'Sirsi Circle', code: 'Sirsi Circle', city: 'Bengaluru' },
  { name: 'Vijayanagar TTMC', code: 'Vijayanagar', city: 'Bengaluru' },
  { name: 'Attiguppe', code: 'Attiguppe', city: 'Bengaluru' },
  { name: 'Bogadi Ring Road', code: 'Bogadi', city: 'Mysuru' },
  { name: 'Kuvempunagar Complex', code: 'Kuvempunagar', city: 'Mysuru' },
  { name: 'Saraswathipuram', code: 'Saraswathipuram', city: 'Mysuru' },
  { name: 'Mysuru Suburb Stand', code: 'Mysuru Stand', city: 'Mysuru' }
];

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

function showOriginDropdown() {
  renderDropdown('originDropdown', 'inputOrigin', (val) => selectOriginStop(val));
}

function onOriginSearchInput(query) {
  currentOrigin = query;
  renderDropdown('originDropdown', 'inputOrigin', (val) => selectOriginStop(val), query);
  resolveRouteMatch();
}

function selectOriginStop(stopName) {
  currentOrigin = stopName;
  document.getElementById('inputOrigin').value = stopName;
  hideDropdowns();
  resolveRouteMatch();
}

function showDestDropdown() {
  renderDropdown('destDropdown', 'inputDest', (val) => selectDestStop(val));
}

function onDestSearchInput(query) {
  currentDestination = query;
  renderDropdown('destDropdown', 'inputDest', (val) => selectDestStop(val), query);
  resolveRouteMatch();
}

function selectDestStop(stopName) {
  currentDestination = stopName;
  document.getElementById('inputDest').value = stopName;
  hideDropdowns();
  resolveRouteMatch();
}

function renderDropdown(dropdownId, inputId, onSelectCallback, query = '') {
  const dropdown = document.getElementById(dropdownId);
  if (!dropdown) return;

  const q = query.toLowerCase().trim();
  const filtered = knownStops.filter(s => 
    s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)
  );

  if (filtered.length === 0) {
    dropdown.innerHTML = `<div class="autocomplete-item" style="color: var(--text-muted);">No matching stops</div>`;
  } else {
    dropdown.innerHTML = filtered.map(s => `
      <div class="autocomplete-item" onclick="handleDropdownClick('${s.name}', '${dropdownId}')">
        <span>${s.name}</span>
        <span class="autocomplete-item-city">${s.city}</span>
      </div>
    `).join('');
  }

  window.handleDropdownClick = (name, dId) => {
    if (dId === 'originDropdown') {
      selectOriginStop(name);
    } else {
      selectDestStop(name);
    }
  };

  dropdown.classList.add('show');
}

function hideDropdowns() {
  document.querySelectorAll('.autocomplete-dropdown').forEach(d => d.classList.remove('show'));
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')) {
    hideDropdowns();
  }
});

function swapLocations() {
  const temp = currentOrigin;
  currentOrigin = currentDestination;
  currentDestination = temp;

  document.getElementById('inputOrigin').value = currentOrigin;
  document.getElementById('inputDest').value = currentDestination;

  resolveRouteMatch();
}

function resolveRouteMatch() {
  const o = currentOrigin.toLowerCase();
  const d = currentDestination.toLowerCase();

  if (o.includes('bogadi') || d.includes('mysuru') || o.includes('mysuru') || d.includes('bogadi') || o.includes('kuvempu') || d.includes('kuvempu')) {
    selectBus('17B');
  } else {
    const matchingBus = Object.values(fleetData).find(b => b.routeId === 'ROUTE_23A') || { busNumber: '23A' };
    selectBus(matchingBus.busNumber);
  }
}

function selectBus(busNumber) {
  selectedBusNumber = busNumber;
  toastDismissed = false;
  renderView();
}

function dismissToast() {
  toastDismissed = true;
  const alertContainer = document.getElementById('alertContainer');
  if (alertContainer) alertContainer.innerHTML = '';
}

function renderView() {
  loadOwnerBuses();
  checkBusDelays();

  const bus = fleetData[selectedBusNumber] || Object.values(fleetData)[0];
  if (!bus) return;

  const route = routesData[bus.routeId] || Object.values(routesData)[0];
  if (!route) return;

  document.getElementById('busTitle').innerText = `Bus ${bus.busNumber}`;
  document.getElementById('routeSubtitle').innerText = `${currentOrigin} to ${currentDestination} (${route.name})`;
  document.getElementById('etaDisplay').innerText = `${bus.etaMinutes} min`;
  document.getElementById('nextStopDisplay').innerText = bus.nextStop || 'En Route';
  document.getElementById('distanceDisplay').innerText = `${bus.distanceRemainingKm} km remaining`;
  document.getElementById('speedDisplay').innerText = `${bus.speedKmph} km/h`;

  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const delayDeltaText = document.getElementById('delayDeltaText');

  if (bus.status === 'DELAYED') {
    statusBadge.className = 'badge badge-delayed';
    statusText.innerText = 'DELAYED';
    delayDeltaText.innerText = `+${bus.delayMinutes || 10} min delay detected`;
  } else if (bus.status === 'ROUTE_DEVIATION') {
    statusBadge.className = 'badge badge-deviation';
    statusText.innerText = 'DEVIATION';
    delayDeltaText.innerText = 'Off expected corridor';
  } else {
    statusBadge.className = 'badge badge-ontime';
    statusText.innerText = 'ON TIME';
    delayDeltaText.innerText = 'Normal Schedule';
  }

  const alertContainer = document.getElementById('alertContainer');
  if (bus.status === 'DELAYED' && !toastDismissed) {
    alertContainer.innerHTML = `
      <div class="alert-banner" style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="alert-title">SERVICE DELAY NOTIFICATION</div>
          <div class="alert-msg">Bus ${bus.busNumber} on this route is currently delayed (+${bus.delayMinutes || 10} mins).</div>
        </div>
        <button onclick="dismissToast()" style="background: none; border: none; font-size: 14px; font-weight: 800; cursor: pointer; color: #92400e; padding: 0 4px;">&times;</button>
      </div>
    `;
  } else if (bus.status === 'ROUTE_DEVIATION' && !toastDismissed) {
    alertContainer.innerHTML = `
      <div class="alert-banner critical" style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div class="alert-title">ROUTE DEVIATION DETECTED</div>
          <div class="alert-msg">Bus ${bus.busNumber} has deviated from assigned corridor.</div>
        </div>
        <button onclick="dismissToast()" style="background: none; border: none; font-size: 14px; font-weight: 800; cursor: pointer; color: #991b1b; padding: 0 4px;">&times;</button>
      </div>
    `;
  } else if (toastDismissed || bus.status === 'ON TIME' || bus.status === 'READY') {
    alertContainer.innerHTML = '';
  }

  const fallbackContainer = document.getElementById('fallbackContainer');
  if (bus.status === 'DELAYED' && bus.busNumber === '17B') {
    fallbackContainer.innerHTML = `
      <div class="fallback-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="fallback-badge">Smart Fallback</span>
          <span style="font-size: 11px; color: #ea580c; font-weight: 700;">Service Delay Detected</span>
        </div>
        <div style="font-size: 12px; color: #7c2d12; margin-top: 6px;">
          Bus 17B is delayed. Recommended alternative:
        </div>
        <div class="fallback-option">
          <div>
            <strong style="font-size: 12px; color: #1e293b;">Alternative: Bus 23A</strong>
            <div style="font-size: 11px; color: var(--status-ontime); font-weight: 600;">On Time • Arriving in 7 min</div>
          </div>
          <button class="btn btn-outline" style="font-size: 11px; padding: 4px 10px;" onclick="selectOriginStop('Majestic'); selectDestStop('Vijayanagar');">Track Bus</button>
        </div>
      </div>
    `;
  } else {
    fallbackContainer.innerHTML = '';
  }

  const stopsList = document.getElementById('stopsList');
  stopsList.innerHTML = route.stops.map((stop) => `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div style="width: 10px; height: 10px; border-radius: 50%; background: ${stop.name.toLowerCase().includes(bus.nextStop ? bus.nextStop.toLowerCase() : '') ? '#ea580c' : '#0f172a'}; border: 2px solid #fff; box-shadow: 0 0 0 1.5px #cbd5e1;"></div>
      <div style="flex: 1;">
        <div style="font-size: 13px; font-weight: ${stop.name.toLowerCase().includes(bus.nextStop ? bus.nextStop.toLowerCase() : '') ? '700' : '500'}; color: ${stop.name.toLowerCase().includes(bus.nextStop ? bus.nextStop.toLowerCase() : '') ? '#ea580c' : '#1e293b'};">
          ${stop.name} ${stop.name.toLowerCase().includes(bus.nextStop ? bus.nextStop.toLowerCase() : '') ? '<span style="font-size: 10px; background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; padding: 1px 5px; border-radius: 9999px; margin-left: 4px; font-weight: 800;">NEXT</span>' : ''}
        </div>
      </div>
    </div>
  `).join('');

  if (transitMap) {
    transitMap.drawDynamicRoute(currentOrigin, currentDestination, route, bus.status);
    transitMap.updateBusMarker(bus, true);
  }
}

const socket = (typeof io !== 'undefined') ? io() : null;

if (socket) {
  socket.on('fleet_init', (data) => {
    fleetData = data.buses;
    routesData = data.routes;
    loadOwnerBuses();
    renderView();
  });

  socket.on('fleet_update', (data) => {
    fleetData = data.buses;
    loadOwnerBuses();
    renderView();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  transitMap = new TransitMap('map', [12.9774, 77.5708], 13);
  
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
      renderView();
    })
    .catch(err => console.warn(err));
});
