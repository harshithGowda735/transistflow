class TripSimulator {
  constructor(options = {}) {
    this.onUpdate = options.onUpdate || null;
    this.intervalMs = options.intervalMs || 1200;
    this.timer = null;
    this.isActive = false;
    this.currentIndex = 0;
    this.path = [];
  }

  async loadRoutePath(routeId) {
    try {
      const res = await fetch('/api/routes');
      const data = await res.json();
      if (data.success && data.routes && data.routes[routeId]) {
        const route = data.routes[routeId];
        if (route.stops && route.stops.length > 1) {
          const coords = route.stops.map(s => `${s.lng},${s.lat}`).join(';');
          try {
            const osrmRes = await fetch(`/api/route/osrm?coords=${encodeURIComponent(coords)}`);
            const osrmData = await osrmRes.json();
            if (osrmData.success && osrmData.path && osrmData.path.length > 0) {
              return osrmData.path;
            }
          } catch (e) {}
        }
        if (route.path && route.path.length > 0) {
          return route.path;
        }
        if (route.stops) {
          return route.stops.map(s => [s.lat, s.lng]);
        }
      }
    } catch (e) {}

    return [
      [12.9774, 77.5708],
      [12.9730, 77.5720],
      [12.9680, 77.5738],
      [12.9634, 77.5755],
      [12.9610, 77.5670],
      [12.9592, 77.5562],
      [12.9630, 77.5460],
      [12.9670, 77.5400],
      [12.9698, 77.5358],
      [12.9650, 77.5300],
      [12.9610, 77.5255]
    ];
  }

  interpolatePath(originalPath, stepDistanceFactor = 8) {
    if (!originalPath || originalPath.length < 2) return originalPath || [];
    const densePath = [];
    for (let i = 0; i < originalPath.length - 1; i++) {
      const p1 = originalPath[i];
      const p2 = originalPath[i + 1];
      for (let s = 0; s < stepDistanceFactor; s++) {
        const t = s / stepDistanceFactor;
        densePath.push([
          p1[0] + (p2[0] - p1[0]) * t,
          p1[1] + (p2[1] - p1[1]) * t
        ]);
      }
    }
    densePath.push(originalPath[originalPath.length - 1]);
    return densePath;
  }

  async start(routeId) {
    this.stop();
    const rawPath = await this.loadRoutePath(routeId);
    this.path = this.interpolatePath(rawPath, 8);
    this.currentIndex = 0;
    this.isActive = true;

    this.timer = setInterval(() => {
      if (!this.isActive || this.path.length === 0) return;

      const currentPoint = this.path[this.currentIndex];
      const realisticSpeed = 26 + Math.floor(Math.sin(this.currentIndex * 0.15) * 6);

      if (this.onUpdate && currentPoint) {
        this.onUpdate(currentPoint[0], currentPoint[1], realisticSpeed);
      }

      this.currentIndex = (this.currentIndex + 1) % this.path.length;
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isActive = false;
  }
}

if (typeof window !== 'undefined') {
  window.TripSimulator = TripSimulator;
}
