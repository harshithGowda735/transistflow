# TransitPulse / Namma Raste (ನಮ್ಮ ರಸ್ತೆ)
### Zero-Hardware Real-Time Public Bus Tracking & Anomaly Detection Platform

> *"We don't install another GPS device. We turn the conductor's existing smartphone into the bus tracking device — and turn raw GPS into automatic service alerts."*

---

## 🚌 Key Features

1. **Zero Dedicated Hardware**: Uses existing conductor smartphones (`navigator.geolocation.watchPosition`) as live telemetry devices.
2. **Deterministic Two-Bus Demo**:
   - **Bus 23A (Majestic → Vijayanagar)**: Follows route on-time with real-time ETA calculation.
   - **Bus 17B (Bogadi → Mysuru)**: Slows down / pauses; backend detection engine automatically calculates expected vs actual progress and flags **DELAY DETECTED (+6 min)** without manual trigger buttons.
3. **Automated Anomaly & Compliance Engine**:
   - **Delay Detection**: Rule-based expected progress vs actual progress delta.
   - **Route Deviation**: Geo-distance check against corridor polyline.
4. **Smart Passenger Fallback**: Automatically presents alternative bus (Bus 23A) or subsidized last-mile partner rides when service fails.
5. **Real Interactive Leaflet & OpenStreetMap**: Full road path polylines, animated bus markers, and stop pins.
6. **GovTech Grade Design**: Bilingual interface (English & Kannada), clean status badges, and operator KPI counters.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
The application will be live at `http://localhost:3000`.

---

## 🎯 Demo Walkthrough for Hackathon Judges

1. **Open Operator / Admin Dashboard**:
   - Navigate to [`http://localhost:3000/admin.html`](http://localhost:3000/admin.html)
   - Observe fleet status counters and multi-bus map overview.
2. **Open Passenger Tracking View in another tab**:
   - Navigate to [`http://localhost:3000/`](http://localhost:3000/)
   - Select **Bus 17B**.
3. **Start Simulation**:
   - On the Admin Dashboard, click **▶ Start Simulation** (the only master button).
4. **Observe Autonomous Anomaly Detection**:
   - Bus 23A advances smoothly on time.
   - Bus 17B encounters congestion and falls behind expected schedule.
   - Backend automatically detects delay and broadcasts **DELAY DETECTED (+6 min)**.
   - Passenger view displays alert banner and **Smart Fallback Card** (Bus 23A / Partner Ride discount).
5. **Conductor Mode Demo (Zero-Hardware Stream)**:
   - Open [`http://localhost:3000/conductor.html`](http://localhost:3000/conductor.html)
   - Click **▶ START TRIP** to activate smartphone continuous GPS streaming.
