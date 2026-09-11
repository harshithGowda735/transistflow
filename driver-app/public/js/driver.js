let isTripActive = false;
let watchId = null;
let currentBus = '23A';
let currentRouteId = 'ROUTE_23A';
let conductorId = 'COND_01';
let tripStartTime = null;
let durationInterval = null;
let isSimulationMode = false;
let tripSimulator = null;
let driverMap = null;
let driverMarker = null;
let driverRoutePolyline = null;
let busesMap = {};

const socket = (typeof io !== 'undefined') ? io() : null;

function initDriverMap() {
  const mapElem = document.getElementById('driverMiniMap');
  if (!mapElem || typeof L === 'undefined') return;

  driverMap = L.map('driverMiniMap', {
    zoomControl: false,
    attributionControl: false
  }).setView([12.9774, 77.5708], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(driverMap);

  const customIcon = L.divIcon({
    className: 'driver-mini-marker',
    html: `
      <div style="width: 22px; height: 22px; background: #ea580c; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center;">
        <div style="width: 6px; height: 6px; background: #ffffff; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

  driverMarker = L.marker([12.9774, 77.5708], { icon: customIcon }).addTo(driverMap);
}

async function updateDriverMapRoute(routeId) {
  if (!driverMap) return;
  try {
    const res = await fetch('/api/routes');
    const data = await res.json();
    if (data.success && data.routes && data.routes[routeId]) {
      const route = data.routes[routeId];
      let pathCoords = route.path || [];

      if (route.stops && route.stops.length > 1) {
        const coordsParam = route.stops.map(s => `${s.lng},${s.lat}`).join(';');
        try {
          const osrmRes = await fetch(`/api/route/osrm?coords=${encodeURIComponent(coordsParam)}`);
          const osrmData = await osrmRes.json();
          if (osrmData.success && osrmData.path) {
            pathCoords = osrmData.path;
          }
        } catch (e) {}
      }

      if (pathCoords.length > 0) {
        if (driverRoutePolyline) {
          driverMap.removeLayer(driverRoutePolyline);
        }
        driverRoutePolyline = L.polyline(pathCoords, {
          color: '#2563eb',
          weight: 4,
          opacity: 0.8
        }).addTo(driverMap);
        driverMap.fitBounds(driverRoutePolyline.getBounds(), { padding: [20, 20] });
      }
    }
  } catch (e) {}
}

async function populateBusSelect() {
  const busSelect = document.getElementById('busSelect');
  if (!busSelect) return;

  try {
    const res = await fetch('/api/buses');
    const data = await res.json();
    if (data.success && data.buses) {
      busesMap = data.buses;
    }
  } catch (e) {}

  const busList = Object.values(busesMap);
  if (busList.length === 0) return;

  busSelect.innerHTML = busList.map(b => `
    <option value="${b.busNumber}">Bus ${b.busNumber} (${b.registrationNumber || 'KA-01'}) - Route ${b.routeId || ''}</option>
  `).join('');

  if (busesMap[currentBus]) {
    busSelect.value = currentBus;
  } else {
    currentBus = busList[0].busNumber;
    busSelect.value = currentBus;
  }

  onBusSelectChange();
}

function onBusSelectChange() {
  const busSelect = document.getElementById('busSelect');
  if (busSelect) {
    currentBus = busSelect.value;
    conductorId = `COND_${currentBus}`;
    const selectedBusObj = busesMap[currentBus];
    if (selectedBusObj) {
      currentRouteId = selectedBusObj.routeId || 'ROUTE_23A';
      const nameElem = document.getElementById('conductorName');
      if (nameElem) {
        nameElem.innerText = selectedBusObj.conductorName || 'Assigned Driver';
      }
      if (selectedBusObj.currentLocation) {
        updateDriverMarkerPosition(selectedBusObj.currentLocation.lat, selectedBusObj.currentLocation.lng);
      }
    }
    updateDriverMapRoute(currentRouteId);
  }
}

function updateDriverMarkerPosition(lat, lng) {
  if (driverMarker && !isNaN(lat) && !isNaN(lng)) {
    driverMarker.setLatLng([lat, lng]);
    if (driverMap) {
      driverMap.panTo([lat, lng], { animate: true, duration: 0.8 });
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

function toggleSimulationMode(enabled) {
  isSimulationMode = enabled;
  if (isTripActive) {
    stopTransmission();
    startTransmission();
  }
}

function startDurationTimer() {
  tripStartTime = Date.now();
  if (durationInterval) clearInterval(durationInterval);

  durationInterval = setInterval(() => {
    const elapsedSec = Math.floor((Date.now() - tripStartTime) / 1000);
    const hrs = String(Math.floor(elapsedSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, '0');
    const secs = String(elapsedSec % 60).padStart(2, '0');

    const durationElem = document.getElementById('valDuration');
    if (durationElem) {
      durationElem.innerText = `${hrs}:${mins}:${secs}`;
    }
  }, 1000);
}

function stopDurationTimer() {
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
}

async function startTrip() {
  try {
    await fetch('/api/trip/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ busNumber: currentBus, conductorId })
    });
  } catch (e) {}

  if (socket && socket.connected) {
    socket.emit('trip_toggle', { busNumber: currentBus, active: true });
  }

  isTripActive = true;
  updateUIState(true);
  startDurationTimer();
  startTransmission();
}

async function endTrip() {
  try {
    await fetch('/api/trip/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ busNumber: currentBus, conductorId })
    });
  } catch (e) {}

  if (socket && socket.connected) {
    socket.emit('trip_toggle', { busNumber: currentBus, active: false });
  }

  isTripActive = false;
  stopTransmission();
  stopDurationTimer();
  updateUIState(false);
}

function updateUIState(active) {
  const badge = document.getElementById('trackingStatusBadge');
  const btn = document.getElementById('btnTripToggle');
  const busSelect = document.getElementById('busSelect');

  if (active) {
    if (badge) {
      badge.className = 'status-indicator status-live';
      badge.innerHTML = `<span class="pulse-circle"></span> Live: Bus ${currentBus}`;
    }
    if (btn) {
      btn.className = 'btn-large btn-stop';
      btn.innerText = 'Stop Trip & Halt Transmission';
    }
    if (busSelect) busSelect.disabled = true;
  } else {
    if (badge) {
      badge.className = 'status-indicator status-ready';
      badge.innerText = 'Tracking Off';
    }
    if (btn) {
      btn.className = 'btn-large btn-start';
      btn.innerText = 'Start Trip & Transmit GPS';
    }
    if (busSelect) busSelect.disabled = false;
  }
}

function sendGPSUpdate(lat, lng, speed = 30) {
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);
  const numSpeed = Math.round(speed);

  const valLat = document.getElementById('valLat');
  if (valLat) valLat.innerText = numLat.toFixed(5);

  const valLng = document.getElementById('valLng');
  if (valLng) valLng.innerText = numLng.toFixed(5);

  const valSpeed = document.getElementById('valSpeed');
  if (valSpeed) valSpeed.innerText = `${numSpeed} km/h`;

  const valLastPing = document.getElementById('valLastPing');
  if (valLastPing) valLastPing.innerText = new Date().toLocaleTimeString();

  updateDriverMarkerPosition(numLat, numLng);

  if (socket && socket.connected) {
    socket.emit('conductor_gps', {
      busNumber: currentBus,
      conductorId: conductorId,
      lat: numLat,
      lng: numLng,
      speed: numSpeed
    });
  } else {
    fetch('/api/gps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        busNumber: currentBus,
        conductorId: conductorId,
        lat: numLat,
        lng: numLng,
        speed: numSpeed
      })
    }).catch(() => {});
  }
}

function startTransmission() {
  if (isSimulationMode) {
    if (!tripSimulator && typeof TripSimulator !== 'undefined') {
      tripSimulator = new TripSimulator({
        intervalMs: 1200,
        onUpdate: (lat, lng, speed) => {
          sendGPSUpdate(lat, lng, speed);
        }
      });
    }
    if (tripSimulator) {
      tripSimulator.start(currentRouteId);
    }
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
        if (!tripSimulator && typeof TripSimulator !== 'undefined') {
          tripSimulator = new TripSimulator({
            intervalMs: 1200,
            onUpdate: (lat, lng, speed) => {
              sendGPSUpdate(lat, lng, speed);
            }
          });
        }
        if (tripSimulator) tripSimulator.start(currentRouteId);
      },
      { enableHighAccuracy: true, maximumAge: 1500, timeout: 6000 }
    );
  } else {
    if (!tripSimulator && typeof TripSimulator !== 'undefined') {
      tripSimulator = new TripSimulator({
        intervalMs: 1200,
        onUpdate: (lat, lng, speed) => {
          sendGPSUpdate(lat, lng, speed);
        }
      });
    }
    if (tripSimulator) tripSimulator.start(currentRouteId);
  }
}

function stopTransmission() {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (tripSimulator) {
    tripSimulator.stop();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initDriverMap();
  populateBusSelect();
});
