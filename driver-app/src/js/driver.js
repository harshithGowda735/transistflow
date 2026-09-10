// driver-app/src/js/driver.js - Driver & Conductor Mobile Terminal Logic
let isTripActive = false;
let watchId = null;
let currentBus = '23A';
let conductorId = 'COND_01';
let mockGpsInterval = null;

// Connect to backend Socket.IO (or relative host)
const socket = (typeof io !== 'undefined') ? io() : null;

function onBusSelectChange() {
  const busSelect = document.getElementById('busSelect');
  currentBus = busSelect.value;
  conductorId = currentBus === '23A' ? 'COND_01' : 'COND_02';
  document.getElementById('conductorName').innerText = currentBus === '23A' ? 'Ramesh Kumar' : 'Suresh Gowda';
}

function toggleTrip() {
  if (!isTripActive) {
    startTrip();
  } else {
    endTrip();
  }
}

function startTrip() {
  fetch('/api/trip/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ busNumber: currentBus, conductorId: conductorId })
  })
  .then(res => res.json())
  .then(data => {
    isTripActive = true;
    updateUIState(true);
    startGPSStream();
  })
  .catch(err => {
    console.error('Trip start error:', err);
    // Proceed locally
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
  .then(data => {
    isTripActive = false;
    stopGPSStream();
    updateUIState(false);
  })
  .catch(err => {
    console.error('Trip end error:', err);
    isTripActive = false;
    stopGPSStream();
    updateUIState(false);
  });
}

function updateUIState(active) {
  const badge = document.getElementById('tripBadge');
  const btn = document.getElementById('btnTripToggle');
  const busSelect = document.getElementById('busSelect');

  if (active) {
    badge.className = 'status-indicator status-live';
    badge.innerHTML = '<span class="pulse-circle"></span> TRANSMITTING LIVE';
    btn.className = 'btn-large btn-stop';
    btn.innerHTML = '⏹ END TRIP SESSION';
    busSelect.disabled = true;
  } else {
    badge.className = 'status-indicator status-ready';
    badge.innerText = 'READY / STANDBY';
    btn.className = 'btn-large btn-start';
    btn.innerHTML = '▶ START TRIP TRANSMISSION';
    busSelect.disabled = false;
  }
}

function sendGPSUpdate(lat, lng, speed = 30) {
  document.getElementById('valLat').innerText = parseFloat(lat).toFixed(4);
  document.getElementById('valLng').innerText = parseFloat(lng).toFixed(4);
  document.getElementById('valSpeed').innerText = `${Math.round(speed)} km/h`;
  document.getElementById('valLastPing').innerText = new Date().toLocaleTimeString();

  // 1. Send via WebSockets if connected
  if (socket && socket.connected) {
    socket.emit('conductor_gps', {
      busNumber: currentBus,
      conductorId: conductorId,
      lat: lat,
      lng: lng,
      speed: speed
    });
  } else {
    // 2. Fallback to REST POST
    fetch('/api/gps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        busNumber: currentBus,
        conductorId: conductorId,
        lat: lat,
        lng: lng,
        speed: speed
      })
    }).catch(e => console.warn('GPS POST failed:', e));
  }
}

function startGPSStream() {
  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speedKmph = (pos.coords.speed || 8) * 3.6;
        sendGPSUpdate(lat, lng, speedKmph);
      },
      (err) => {
        console.warn('Geolocation warning (using demo simulation fallback):', err.message);
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

// Fallback GPS simulation for desktop browsers without active physical road travel
function startMockGPSFallback() {
  if (mockGpsInterval) return;
  let lat = currentBus === '23A' ? 12.9774 : 12.3025;
  let lng = currentBus === '23A' ? 77.5708 : 76.6080;

  mockGpsInterval = setInterval(() => {
    lat -= 0.0004;
    lng += 0.0003;
    const speed = 25 + Math.floor(Math.random() * 15);
    sendGPSUpdate(lat, lng, speed);
  }, 2000);
}
