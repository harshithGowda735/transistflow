const routeRoadCache = {};

class TransitMap {
  constructor(elementId, initialCenter = [12.9774, 77.5708], initialZoom = 13) {
    this.map = L.map(elementId, { zoomControl: true }).setView(initialCenter, initialZoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    this.routePolyline = null;
    this.stopMarkers = [];
    this.busMarkers = {};
    this.routeLayers = [];
    this.userLocationMarker = null;
    this.destMarker = null;
    this.activeRouteKey = null;
  }

  setUserLocation(lat, lng) {
    const userPinHtml = `
      <div class="user-live-pin">
        <div class="user-pulse"></div>
        <div class="user-dot"></div>
      </div>
    `;

    const userIcon = L.divIcon({
      className: 'user-pin-div-icon',
      html: userPinHtml,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (this.userLocationMarker) {
      this.userLocationMarker.setLatLng([lat, lng]);
    } else {
      this.userLocationMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(this.map);
      this.userLocationMarker.bindPopup('<strong>Your Current Location</strong>');
    }
  }

  async fetchRoadPath(stops) {
    if (!stops || stops.length < 2) return null;
    const coordsParam = stops.map(s => `${s.lng},${s.lat}`).join(';');
    if (routeRoadCache[coordsParam]) {
      return routeRoadCache[coordsParam];
    }

    try {
      const res = await fetch(`/api/route/osrm?coords=${encodeURIComponent(coordsParam)}`);
      const data = await res.json();
      if (data.success && data.path && data.path.length > 0) {
        routeRoadCache[coordsParam] = data.path;
        return data.path;
      }
    } catch (e) {}

    try {
      const directUrl = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;
      const directRes = await fetch(directUrl);
      const directData = await directRes.json();
      if (directData.code === 'Ok' && directData.routes && directData.routes[0]) {
        const roadCoords = directData.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
        routeRoadCache[coordsParam] = roadCoords;
        return roadCoords;
      }
    } catch (e) {}

    return stops.map(s => [s.lat, s.lng]);
  }

  async drawDynamicRoute(origin, dest, route, status = 'ON TIME') {
    if (!route || !route.stops || route.stops.length === 0) return;

    const routeKey = `${route.routeId}_${origin}_${dest}`;
    const polyColor = status === 'DELAYED' ? '#ea580c' : (status === 'ROUTE_DEVIATION' ? '#ef4444' : '#2563eb');

    if (this.activeRouteKey === routeKey && this.routePolyline) {
      this.routePolyline.setStyle({ color: polyColor });
      return;
    }

    this.activeRouteKey = routeKey;

    if (this.routePolyline) {
      this.map.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }

    if (this.destMarker) {
      this.map.removeLayer(this.destMarker);
      this.destMarker = null;
    }

    this.stopMarkers.forEach(m => this.map.removeLayer(m));
    this.stopMarkers = [];

    const immediatePath = route.path || route.stops.map(s => [s.lat, s.lng]);
    this.routePolyline = L.polyline(immediatePath, {
      color: polyColor,
      weight: 5,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(this.map);

    const oLower = (origin || '').toLowerCase().trim();
    const dLower = (dest || '').toLowerCase().trim();

    route.stops.forEach((stop, index) => {
      const isOrigin = oLower && stop.name.toLowerCase().includes(oLower);
      const isDest = (dLower && stop.name.toLowerCase().includes(dLower)) || (!dLower && index === route.stops.length - 1);

      if (isDest) {
        const destIcon = L.divIcon({
          className: 'dest-pin-icon',
          html: `<div class="destination-node-marker" title="Destination: ${stop.name}"><div class="destination-inner-core"></div></div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });
        this.destMarker = L.marker([stop.lat, stop.lng], { icon: destIcon, zIndexOffset: 900 }).addTo(this.map);
        this.destMarker.bindPopup(`<strong>DESTINATION: ${stop.name}</strong><br>Final Stop (#${stop.order || (index + 1)})`);
      } else {
        const marker = L.circleMarker([stop.lat, stop.lng], {
          radius: isOrigin ? 8 : 5.5,
          fillColor: isOrigin ? '#10b981' : '#ffffff',
          color: '#0f172a',
          weight: isOrigin ? 3 : 2,
          fillOpacity: 1
        }).addTo(this.map);

        const label = isOrigin ? `<strong>BOARDING: ${stop.name}</strong>` : `<strong>Stop: ${stop.name}</strong>`;
        marker.bindPopup(`${label}<br>Sequence #${stop.order || (index + 1)}`);
        this.stopMarkers.push(marker);
      }
    });

    if (immediatePath && immediatePath.length > 0) {
      this.map.fitBounds(L.polyline(immediatePath).getBounds(), { padding: [40, 40] });
    }

    this.fetchRoadPath(route.stops).then(roadPath => {
      if (roadPath && roadPath.length > 0 && this.routePolyline && this.activeRouteKey === routeKey) {
        this.routePolyline.setLatLngs(roadPath);
      }
    });
  }

  async drawAllRoutes(routesMap) {
    this.routeLayers.forEach(l => this.map.removeLayer(l));
    this.routeLayers = [];

    for (const route of Object.values(routesMap)) {
      const polyPath = route.path || route.stops.map(s => [s.lat, s.lng]);

      const poly = L.polyline(polyPath, {
        color: '#2563eb',
        weight: 4,
        opacity: 0.65,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.map);
      this.routeLayers.push(poly);

      route.stops.forEach(stop => {
        const marker = L.circleMarker([stop.lat, stop.lng], {
          radius: 4.5,
          fillColor: '#ffffff',
          color: '#0f172a',
          weight: 2,
          fillOpacity: 1
        }).addTo(this.map);
        marker.bindPopup(`<strong>${stop.name}</strong><br>${route.name}`);
        this.routeLayers.push(marker);
      });

      this.fetchRoadPath(route.stops).then(roadPath => {
        if (roadPath && roadPath.length > 0 && poly) {
          poly.setLatLngs(roadPath);
        }
      });
    }
  }

  updateBusMarker(bus, panTo = false) {
    if (!bus || !bus.currentLocation) return;
    const lat = parseFloat(bus.currentLocation.lat);
    const lng = parseFloat(bus.currentLocation.lng);

    if (isNaN(lat) || isNaN(lng)) return;

    const isDelayed = bus.status === 'DELAYED';
    const isDeviated = bus.status === 'ROUTE_DEVIATION';

    const pinHtml = `
      <div class="custom-bus-pin-container ${isDelayed ? 'delayed' : ''} ${isDeviated ? 'deviated' : ''}">
        <div class="pin-badge">Bus ${bus.busNumber}</div>
        <img src="/assets/bus_pin.svg" class="pin-icon-img" alt="Bus ${bus.busNumber}" />
      </div>
    `;

    const customIcon = L.divIcon({
      className: 'bus-pin-div-icon',
      html: pinHtml,
      iconSize: [64, 76],
      iconAnchor: [32, 64]
    });

    if (this.busMarkers[bus.busNumber]) {
      const existingMarker = this.busMarkers[bus.busNumber];
      existingMarker.setLatLng([lat, lng]);
      existingMarker.setIcon(customIcon);
    } else {
      const newMarker = L.marker([lat, lng], { icon: customIcon, zIndexOffset: 950 }).addTo(this.map);
      this.busMarkers[bus.busNumber] = newMarker;
    }

    this.busMarkers[bus.busNumber].bindPopup(`
      <div style="font-size: 13px; font-family: Inter, sans-serif; line-height: 1.5; padding: 2px;">
        <strong style="color: #0f172a; font-size: 14px;">Bus ${bus.busNumber}</strong><br>
        <span style="color: #64748b; font-size: 11px;">${bus.registrationNumber || ''}</span><br>
        Status: <strong style="color: ${isDelayed ? '#ea580c' : (isDeviated ? '#ef4444' : '#10b981')}">${bus.status || 'ON TIME'}</strong><br>
        ETA: <strong>${bus.etaMinutes || 10} min</strong><br>
        Next Stop: <strong>${bus.nextStop || 'En route'}</strong><br>
        Speed: <strong>${bus.speedKmph || 0} km/h</strong>
      </div>
    `);

    if (panTo) {
      this.map.panTo([lat, lng], { animate: true, duration: 1.2 });
    }
  }
}

