// frontend/src/js/map.js - Leaflet Map Manager Module for Namma Rasthe

class TransitMap {
  constructor(elementId, initialCenter = [12.9774, 77.5708], initialZoom = 13) {
    this.map = L.map(elementId, { zoomControl: true }).setView(initialCenter, initialZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.routePolyline = null;
    this.stopMarkers = [];
    this.busMarkers = {};
    this.routeLayers = [];
  }

  // Draw a single route with stops and polyline
  drawSingleRoute(route, status = 'ON TIME') {
    if (!route) return;

    if (this.routePolyline) {
      this.map.removeLayer(this.routePolyline);
    }

    const polyColor = status === 'DELAYED' ? '#ea580c' : (status === 'ROUTE_DEVIATION' ? '#ef4444' : '#2563eb');
    this.routePolyline = L.polyline(route.path, {
      color: polyColor,
      weight: 5,
      opacity: 0.85
    }).addTo(this.map);

    // Recreate stop markers
    this.stopMarkers.forEach(m => this.map.removeLayer(m));
    this.stopMarkers = [];

    route.stops.forEach(stop => {
      const marker = L.circleMarker([stop.lat, stop.lng], {
        radius: 6,
        fillColor: '#ffffff',
        color: '#0f172a',
        weight: 2.5,
        fillOpacity: 1
      }).addTo(this.map);

      marker.bindPopup(`<strong>Stop: ${stop.name}</strong><br>Sequence #${stop.order}`);
      this.stopMarkers.push(marker);
    });
  }

  // Draw all routes (for Admin dashboard view)
  drawAllRoutes(routesMap) {
    this.routeLayers.forEach(l => this.map.removeLayer(l));
    this.routeLayers = [];

    Object.values(routesMap).forEach(route => {
      const poly = L.polyline(route.path, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.6
      }).addTo(this.map);
      this.routeLayers.push(poly);

      route.stops.forEach(stop => {
        const marker = L.circleMarker([stop.lat, stop.lng], {
          radius: 4,
          fillColor: '#ffffff',
          color: '#0f172a',
          weight: 2,
          fillOpacity: 1
        }).addTo(this.map);
        marker.bindPopup(`<strong>${stop.name}</strong> (${route.name})`);
        this.routeLayers.push(marker);
      });
    });
  }

  // Update or create a Bus marker with the requested Red Pin & Radar Glow
  updateBusMarker(bus, panTo = false) {
    const lat = bus.currentLocation.lat;
    const lng = bus.currentLocation.lng;

    const pinHtml = `
      <div class="custom-bus-pin-container ${bus.status === 'DELAYED' ? 'delayed' : ''}">
        <div class="pin-badge">Bus ${bus.busNumber}</div>
        <img src="/assets/bus_pin.svg" class="pin-icon-img" alt="Bus Location" />
      </div>
    `;

    const customIcon = L.divIcon({
      className: 'bus-pin-div-icon',
      html: pinHtml,
      iconSize: [60, 72],
      iconAnchor: [30, 62]
    });

    if (this.busMarkers[bus.busNumber]) {
      this.busMarkers[bus.busNumber].setLatLng([lat, lng]);
      this.busMarkers[bus.busNumber].setIcon(customIcon);
    } else {
      this.busMarkers[bus.busNumber] = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
    }

    this.busMarkers[bus.busNumber].bindPopup(`
      <div style="font-size: 13px; font-family: sans-serif; line-height: 1.4;">
        <strong style="color: #0f172a; font-size: 14px;">Bus ${bus.busNumber}</strong><br>
        Status: <strong>${bus.status}</strong><br>
        ETA: <strong>${bus.etaMinutes} min</strong><br>
        Next Stop: <strong>${bus.nextStop || 'En route'}</strong><br>
        Speed: <strong>${bus.speedKmph} km/h</strong>
      </div>
    `);

    if (panTo) {
      this.map.panTo([lat, lng]);
    }
  }
}
