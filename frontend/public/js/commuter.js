let selectedBusNumber = 'KA-57-F-1008';
let currentOrigin = 'Majestic KBS';
let currentDestination = 'Mysuru Suburb Stand';
let fleetData = {};
let routesData = {};
let transitMap = null;
let toastDismissed = false;

let knownStops = [
  { name: 'Majestic KBS', code: 'Majestic KBS', city: 'Bengaluru' },
  { name: 'Kengeri TTMC', code: 'Kengeri TTMC', city: 'Bengaluru' },
  { name: 'Bidadi', code: 'Bidadi', city: 'Ramanagara Dist' },
  { name: 'Ramanagara', code: 'Ramanagara', city: 'Ramanagara' },
  { name: 'Channapatna', code: 'Channapatna', city: 'Ramanagara Dist' },
  { name: 'Maddur', code: 'Maddur', city: 'Mandya Dist' },
  { name: 'Mandya', code: 'Mandya', city: 'Mandya' },
  { name: 'Srirangapatna', code: 'Srirangapatna', city: 'Mandya Dist' },
  { name: 'Mysuru Suburb Stand', code: 'Mysuru Suburb Stand', city: 'Mysuru' },
  { name: 'KR Market', code: 'KR Market', city: 'Bengaluru' },
  { name: 'Sirsi Circle', code: 'Sirsi Circle', city: 'Bengaluru' },
  { name: 'Vijayanagar TTMC', code: 'Vijayanagar TTMC', city: 'Bengaluru' },
  { name: 'Attiguppe', code: 'Attiguppe', city: 'Bengaluru' },
  { name: 'Bogadi Ring Road', code: 'Bogadi Ring Road', city: 'Mysuru' },
  { name: 'Kuvempunagar Complex', code: 'Kuvempunagar Complex', city: 'Mysuru' },
  { name: 'Saraswathipuram', code: 'Saraswathipuram', city: 'Mysuru' }
];

function updateKnownStopsFromRoutes() {
  if (!routesData) return;
  const stopsList = [];
  Object.values(routesData).forEach(r => {
    if (r.stops) {
      r.stops.forEach(s => {
        if (!stopsList.some(item => item.name === s.name)) {
          stopsList.push({ name: s.name, code: s.name, city: r.city || '' });
        }
      });
    }
  });
  if (stopsList.length > 0) {
    knownStops = stopsList;
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

  if (isDemoActive && passengerSimulator) {
    const bus = fleetData[selectedBusNumber] || Object.values(fleetData)[0];
    const routeId = bus ? bus.routeId : 'ROUTE_BLR_MYS';
    passengerSimulator.start(routeId);
  }
}

function resolveRouteMatch() {
  const o = currentOrigin.toLowerCase().trim();
  const d = currentDestination.toLowerCase().trim();

  let matchedRouteId = null;
  const routesList = Object.values(routesData);

  for (const route of routesList) {
    const stops = route.stops || [];
    const originIndex = stops.findIndex(s => s.name && s.name.toLowerCase().includes(o));
    const destIndex = stops.findIndex(s => s.name && s.name.toLowerCase().includes(d));

    if (originIndex !== -1 && destIndex !== -1 && originIndex < destIndex) {
      matchedRouteId = route.routeId;
      break;
    }
  }

  if (!matchedRouteId) {
    for (const route of routesList) {
      const stops = route.stops || [];
      const hasOrigin = stops.some(s => s.name && s.name.toLowerCase().includes(o));
      const hasDest = stops.some(s => s.name && s.name.toLowerCase().includes(d));

      if (hasOrigin && hasDest) {
        matchedRouteId = route.routeId;
        break;
      }
    }
  }

  if (!matchedRouteId) {
    for (const route of routesList) {
      const stops = route.stops || [];
      const hasAny = stops.some(s => s.name && (s.name.toLowerCase().includes(o) || s.name.toLowerCase().includes(d)));
      if (hasAny) {
        matchedRouteId = route.routeId;
        break;
      }
    }
  }

  if (!matchedRouteId && routesList.length > 0) {
    matchedRouteId = routesList[0].routeId;
  }

  const matchingBus = Object.values(fleetData).find(b => b.routeId === matchedRouteId);
  if (matchingBus) {
    selectBus(matchingBus.busNumber);
  } else {
    const fallbackBus = Object.values(fleetData)[0];
    if (fallbackBus) selectBus(fallbackBus.busNumber);
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
  const bus = fleetData[selectedBusNumber] || Object.values(fleetData)[0];
  if (!bus) return;

  const route = routesData[bus.routeId] || Object.values(routesData)[0];
  if (!route) return;

  document.getElementById('busTitle').innerText = `Bus ${bus.busNumber}`;
  document.getElementById('routeSubtitle').innerText = `${currentOrigin} to ${currentDestination} (${route.name})`;
  document.getElementById('etaDisplay').innerText = `${bus.etaMinutes || 10} min`;
  document.getElementById('nextStopDisplay').innerText = bus.nextStop || 'En Route';
  document.getElementById('distanceDisplay').innerText = `${bus.distanceRemainingKm || 5.0} km remaining`;
  document.getElementById('speedDisplay').innerText = `${bus.speedKmph || 0} km/h`;

  const statusBadge = document.getElementById('statusBadge');
  const statusText = document.getElementById('statusText');
  const delayDeltaText = document.getElementById('delayDeltaText');

  if (bus.status === 'DELAYED') {
    statusBadge.className = 'badge badge-delayed';
    statusText.innerText = 'DELAYED';
    delayDeltaText.innerText = `+${bus.delayMinutes || 6} min delay detected`;
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
          <div class="alert-msg">Bus ${bus.busNumber} on this route is currently delayed (+${bus.delayMinutes || 6} mins).</div>
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
  if (route.stops) {
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
  }

  renderStrategyPanel(bus);

  if (transitMap) {
    transitMap.drawDynamicRoute(currentOrigin, currentDestination, route, bus.status);
    transitMap.updateBusMarker(bus, true);
  }
}

let passengerSimulator = null;
let isDemoActive = false;

function switchTab(tab) {
  const tabs = ['upcoming', 'strategy'];
  tabs.forEach(t => {
    const btn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
    const panel = document.getElementById('panel' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.toggle('active', t === tab);
    if (panel) panel.classList.toggle('active', t === tab);
  });
}

function renderStrategyPanel(bus) {
  const container = document.getElementById('strategyContent');
  if (!container) return;

  const isDelayed = bus && bus.status === 'DELAYED';
  const delayMins = (bus && bus.delayMinutes) || 0;

  if (!isDelayed) {
    container.innerHTML = `
      <div class="strategy-idle">
        <div style="font-size: 13px; color: var(--text-muted); text-align: center; padding: 18px 0;">
          Bus is on time. No alternate ride needed.
        </div>
      </div>
    `;
    return;
  }

  const discount = 12;
  const rides = [
    {
      name: 'Rapido',
      color: '#FFD700',
      textColor: '#000',
      badge: 'RP',
      eta: '3 min',
      type: 'Bike Taxi',
      price: 'From Rs. 45',
      link: 'https://rapido.bike'
    }
  ];

  container.innerHTML = `
    <div class="strategy-delay-header">
      <div class="strategy-delay-badge">Bus Delayed +${delayMins} min</div>
      <div style="font-size: 12px; color: #7c2d12; margin-top: 6px; font-weight: 600;">
        Book a ride now with ${discount}% exclusive discount.
      </div>
    </div>
    ${rides.map(r => `
      <a class="ride-option-card" href="${r.link}" target="_blank" rel="noopener">
        <div class="ride-option-left">
          <div class="ride-avatar" style="background: ${r.color}; color: ${r.textColor || '#fff'};">${r.badge}</div>
          <div>
            <div class="ride-name">${r.name} <span class="ride-type">${r.type}</span></div>
            <div class="ride-eta">Arrives in ${r.eta}</div>
          </div>
        </div>
        <div class="ride-option-right">
          <div class="ride-price">${r.price}</div>
          <div class="ride-discount">${discount}% OFF</div>
        </div>
      </a>
    `).join('')}
    <div style="font-size: 10px; color: var(--text-muted); margin-top: 10px; text-align: center;">
      Discount applied automatically on booking via links above.
    </div>
  `;
}

function toggleDemoMode() {
  const btn = document.getElementById('btnDemoSimulate');
  isDemoActive = !isDemoActive;

  if (isDemoActive) {
    if (btn) {
      btn.style.background = '#dc2626';
      btn.innerHTML = 'Stop Demo';
    }
    const bus = fleetData[selectedBusNumber] || Object.values(fleetData)[0];
    const routeId = bus ? bus.routeId : 'ROUTE_BLR_MYS';

    if (!passengerSimulator && typeof TripSimulator !== 'undefined') {
      passengerSimulator = new TripSimulator({
        intervalMs: 1000,
        onUpdate: (lat, lng, speed) => {
          if (socket && socket.connected) {
            socket.emit('conductor_gps', {
              busNumber: selectedBusNumber,
              conductorId: `COND_${selectedBusNumber}`,
              lat,
              lng,
              speed
            });
          } else {
            fetch('/api/gps', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                busNumber: selectedBusNumber,
                lat,
                lng,
                speed
              })
            }).catch(() => {});
          }
        }
      });
    }
    if (passengerSimulator) {
      passengerSimulator.start(routeId);
    }
  } else {
    if (btn) {
      btn.style.background = '#ea580c';
      btn.innerHTML = 'Live Demo Mode';
    }
    if (passengerSimulator) {
      passengerSimulator.stop();
    }
  }
}

function initUserGeolocation() {
  if (transitMap) {
    transitMap.setUserLocation(12.9774, 77.5708);
  }
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (transitMap) {
          transitMap.setUserLocation(pos.coords.latitude, pos.coords.longitude);
        }
      },
      (err) => {
        console.warn('Geolocation positioning notice:', err);
      },
      { timeout: 5000, maximumAge: 10000, enableHighAccuracy: true }
    );

    navigator.geolocation.watchPosition(
      (pos) => {
        if (transitMap) {
          transitMap.setUserLocation(pos.coords.latitude, pos.coords.longitude);
        }
      },
      () => {},
      { timeout: 10000, maximumAge: 5000, enableHighAccuracy: true }
    );
  }
}

const socket = (typeof io !== 'undefined') ? io() : null;

if (socket) {
  socket.on('fleet_init', (data) => {
    fleetData = data.buses || {};
    routesData = data.routes || {};
    updateKnownStopsFromRoutes();
    if (transitMap) {
      resolveRouteMatch();
      renderView();
    }
  });

  socket.on('fleet_update', (data) => {
    fleetData = data.buses || {};
    if (transitMap) {
      renderView();
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  transitMap = new TransitMap('map', [12.9774, 77.5708], 13);
  initUserGeolocation();

  fetch('/api/buses')
    .then(res => res.json())
    .then(data => {
      if (data.success) fleetData = data.buses;
      return fetch('/api/routes');
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) routesData = data.routes;
      updateKnownStopsFromRoutes();
      resolveRouteMatch();
      renderView();
    })
    .catch(() => {});
});

