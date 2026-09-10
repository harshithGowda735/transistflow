let isTripActive = false;
let watchId = null;
let currentBus = '23A';
let conductorId = 'COND_01';
let mockGpsInterval = null;
let isIndoorDemo = false;

const socket = (typeof io !== 'undefined') ? io() : null;

function populateBusSelect() {
  const busSelect = document.getElementById('busSelect');
  if (!busSelect) return;

  const defaultBuses = [
    { busNumber: '23A', reg: 'KA-01-F-2301', route: 'Majestic to Vijayanagar' },
    { busNumber: '17B', reg: 'KA-09-F-1702', route: 'Bogadi to Mysuru Stand' }
  ];

  let ownerBuses = [];
  try {
    const saved = localStorage.getItem('transitflow_owner_buses');
    if (saved) {
      const parsed = JSON.parse(saved);
      ownerBuses = Object.values(parsed).map(b => ({
        busNumber: b.busNumber,
        reg: b.registrationNumber,
        route: b.routeId === 'ROUTE_17B' ? 'Bogadi to Mysuru Stand' : 'Majestic to Vijayanagar'
      }));
    }
  } catch (e) {
    console.warn(e);
  }

  const allBusesMap = {};
  defaultBuses.concat(ownerBuses).forEach(b => {
    allBusesMap[b.busNumber] = b;
  });

  busSelect.innerHTML = Object.values(allBusesMap).map(b => `
    <option value="${b.busNumber}">Bus ${b.busNumber} (${b.reg}) - ${b.route}</option>
  `).join('');

  busSelect.value = currentBus;
}

function onBusSelectChange() {
  const busSelect = document.getElementById('busSelect');
  if (busSelect) {
    currentBus = busSelect.value;
    conductorId = `COND_${currentBus}`;
    const nameElem = document.getElementById('conductorName');
    if (nameElem) {
      nameElem.innerText = currentBus === '23A' ? 'Ramesh Kumar' : (currentBus === '17B' ? 'Suresh Gowda' : 'Assigned Driver');
    }
  }
}

function toggleTrip() {
  if (!isTripActive) {
    startTrip();
  } else {
    endTrip();
  }
}

function toggleIndoorDemo(enabled) {
  isIndoorDemo = enabled;
  if (isTripActive) {
    stopGPSStream();
    startGPSStream();
  }
}

function startTrip() {
  fetch('/api/trip/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ busNumber: currentBus, conductorId: conductorId })
  })
  .then(res => res.json())
  .then(() => {
    isTripActive = true;
    updateUIState(true);
    startGPSStream();
  })
  .catch(() => {
    isTripActive = true;
    updateUIState(true);
    startGPSStream();
  });
}

function endTrip() {
  fetch('/api/trip/end', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ busNumber: currentBus, conductorId: conductorId })
  })
  .then(res => res.json())
  .then(() => {
    isTripActive = false;
    stopGPSStream();
    updateUIState(false);
  })
  .catch(() => {
    isTripActive = false;
    stopGPSStream();
    updateUIState(false);
  });
}

function updateUIState(active) {
  const badge = document.getElementById('trackingStatusBadge') || document.getElementById('tripBadge');
  const btn = document.getElementById('btnTripToggle');
  const busSelect = document.getElementById('busSelect');

  if (active) {
    if (badge) {
      badge.className = 'status-indicator status-live';
      badge.innerHTML = `<span class="pulse-circle"></span> Tracking: Bus ${currentBus} - Live`;
    }
    if (btn) {
      btn.className = 'btn-large btn-stop';
      btn.innerText = 'Stop Sharing Location';
    }
    if (busSelect) busSelect.disabled = true;
  } else {
    if (badge) {
      badge.className = 'status-indicator status-ready';
      badge.innerText = 'Tracking Off';
    }
    if (btn) {
      btn.className = 'btn-large btn-start';
      btn.innerText = 'Start Sharing Location';
    }
    if (busSelect) busSelect.disabled = false;
  }
}

function sendGPSUpdate(lat, lng, speed = 30) {
  const valLat = document.getElementById('valLat');
  if (valLat) valLat.innerText = parseFloat(lat).toFixed(4);

  const valLng = document.getElementById('valLng');
  if (valLng) valLng.innerText = parseFloat(lng).toFixed(4);

  const valSpeed = document.getElementById('valSpeed');
  if (valSpeed) valSpeed.innerText = `${Math.round(speed)} km/h`;

  const valLastPing = document.getElementById('valLastPing');
  if (valLastPing) valLastPing.innerText = new Date().toLocaleTimeString();

  if (socket && socket.connected) {
    socket.emit('conductor_gps', {
      busNumber: currentBus,
      conductorId: conductorId,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      speed: speed
    });
  } else {
    fetch('/api/gps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        busNumber: currentBus,
        conductorId: conductorId,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        speed: speed
      })
    }).catch(() => {});
  }
}

function startGPSStream() {
  if (isIndoorDemo) {
    startMockGPSFallback();
    return;
  }

  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speedKmph = (pos.coords.speed || 8) * 3.6;
        sendGPSUpdate(lat, lng, speedKmph);
      },
      () => {
        startMockGPSFallback();
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );
  } else {
    startMockGPSFallback();
  }
}

function stopGPSStream() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (mockGpsInterval) {
    clearInterval(mockGpsInterval);
    mockGpsInterval = null;
  }
}

function startMockGPSFallback() {
  if (mockGpsInterval) return;
  let lat = currentBus === '23A' ? 12.9774 : 12.3025;
  let lng = currentBus === '23A' ? 77.5708 : 76.6080;

  mockGpsInterval = setInterval(() => {
    lat -= 0.0003;
    lng += 0.0002;
    const speed = 25 + Math.floor(Math.random() * 15);
    sendGPSUpdate(lat, lng, speed);
  }, 2000);
}

window.addEventListener('DOMContentLoaded', () => {
  populateBusSelect();
  onBusSelectChange();
});
