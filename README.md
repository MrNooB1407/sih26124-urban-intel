# 🚌 City Scout
AI-Powered Mobile City Scoutligence Platform

**SIH 2026 — Problem Statement SIH26124**  
*Sponsor: Bharat Electronics Limited*

## 1. Overview
Cameras mounted on public transit buses can serve as continuous, mobile sensing units traversing city infrastructure. City Scout leverages this concept by processing visual and video data at the edge to detect road hazards, accidents, and traffic conditions. Detected incidents are immediately geotagged, filtered, and dispatched to a central backend. A real-time, interactive dashboard empowers both city authorities and citizens with actionable, role-based insights.

## 2. Problem Statement
Urban infrastructure maintenance and road safety monitoring typically rely on manual reporting or stationary CCTV cameras, which provide limited coverage and slow response times. Potholes go unaddressed, hit-and-run accidents lack immediate actionable intelligence, and traffic congestion data is often delayed. There is a need for a dynamic, city-wide monitoring system capable of proactively detecting and reporting these issues.

## 3. Proposed Solution
City Scout transforms standard city buses into an intelligent IoT fleet. A lightweight AI edge pipeline (Deck-AI) processes dashboard camera feeds to identify road damage, estimate vehicle density, and capture driver violations like overspeeding or erratic lane changes. The central cloud architecture receives these anomalies in real-time, persists them to a database, and broadcasts them via WebSockets to a responsive React-Leaflet GIS dashboard, facilitating instant emergency response and long-term infrastructural analytics.

## 4. Key Features

### Road & Infrastructure Monitoring
- **Potholes:** Edge detection algorithms identify and geotag severe road degradation.
- **Road damage:** Cracks, missing manholes, and degraded infrastructure are logged for maintenance planning.

### Traffic & Driver Monitoring
- **Traffic density/congestion:** Segment-based vehicle counting determines Normal, Moderate, or High traffic zones.
- **Overspeeding:** Telemetry tracking automatically flags transit vehicles exceeding segment speed limits.
- **Lane violations:** Erratic or illegal lane changes are visually identified and reported.

### Emergency & Incident Detection
- **Accident detection:** Immediate flagging of collisions on the route.
- **Hit-and-run workflow:** Integrated mock OCR scans license plates of involved vehicles, pulling owner contact information from a mocked registry.
- **Emergency alerts:** High-priority visual alert banners prompt immediate operator action.

### Real-Time Monitoring
- **Live incident feed:** A scrolling, filterable feed synced seamlessly with the map view.
- **WebSocket updates:** Sub-second latency for new incidents and vehicle telemetry.
- **Live bus positions:** Authority users can track the exact coordinates and speed of the transit fleet.
- **Traffic zone updates:** Dynamic routing segments shift colors based on live congestion algorithms.

### GIS Visualization
- **Interactive map:** A responsive 4:3 fixed-aspect-ratio Leaflet implementation embedded in a command-center interface.
- **Incident markers:** Color-coded circular markers sized dynamically by severity.
- **Route visualization:** Live rendering of predefined Hyderabad transit corridors.
- **Traffic-density visualization:** Map segments overlay real-time color-coded congestion data.
- **Incident selection to map navigation:** Clicking an incident in the feed smoothly pans (flyTo) the map and natively opens an unclippable, scrolling detail popup.

### Role-Based Dashboard
- **Citizen:** Restricted view focusing on public safety. Citizens can see potholes, generalized accidents, and traffic zones to optimize their commute.
- **Authority:** Full operational view. Authorities have exclusive access to bus telemetry, live vehicle IDs, driver violations (overspeeding/lane shifts), and sensitive OCR-extracted emergency contact details.

### Analytics
- **Incident overview:** High-level counts of active anomalies.
- **Severity distribution:** Breakdown of Low, Medium, High, and Critical alerts.
- **Incident trends:** Categorical charting using Recharts to visualize anomaly distributions.
- **Infrastructure vs driver violations:** Separate KPI tracking for road defects versus fleet operator behavior.
- **Traffic zone intelligence:** Intelligent aggregation showing monitored zones and actively congested segments.
- **Vehicle counts:** Live tracking of the active transit fleet.

### Vehicle Monitoring
- **Live bus speed:** Real-time kilometers per hour (km/h).
- **Route:** The assigned transit corridor.
- **GPS position:** Exact latitude and longitude.
- **Violations:** Cumulative count of detected lane and speed infractions for driver accountability.
- **Speed-limit information when available:** Dynamic limits calculated against current telemetry.
- **Incident association:** Intelligent timeline tracking merging recent incidents with the specific bus that reported them.
- **Last-update information:** Live pulse indicators and robust timestamp validation to ensure telemetry freshness.

## 5. System Architecture

\\\mermaid
graph TD
    subgraph Edge_Bus_Simulator
        A[Bus Simulator] -->|Frames & GPS| B[Deck-AI Pipeline]
        B -->|Hazards| C[Pothole / Damage Model]
        B -->|Counts| D[Traffic Estimator]
        B -->|Collisions| E[Plate Recognizer & Registry]
        B -->|Telemetry| F[Driver Violation Engine]
    end
    
    subgraph Cloud_Backend_FastAPI
        G[REST API]
        H[(SQLite)]
        I[WebSocket Hub]
    end
    
    subgraph Web_Client_React
        J[Auth Context]
        K[GIS MapView]
        L[Analytics & Vehicles]
    end
    
    C -->|POST /incidents| G
    D -->|POST /traffic/zones| G
    E -->|POST /incidents| G
    F -->|POST /incidents| G
    A -->|POST /buses/position| G
    
    G --> H
    G --> I
    I -->|Live Broadcast| J
    J --> K
    J --> L
    K -->|Syncs Selection| L
\\\

## 6. Real-Time Data Flow
1. **Simulation:** The Python simulator drives virtual buses along actual Hyderabad coordinates, emitting mock frames and telemetry.
2. **Edge Processing:** The Deck-AI module ingests frames, assessing them for hazards, vehicles, and accidents based on configurable probabilistic thresholds.
3. **Ingestion:** Validated incidents and telemetry are posted to the FastAPI backend via REST endpoints.
4. **Persistence:** The backend sanitizes the payloads, applies server-side timestamps, and stores the records in SQLite.
5. **Broadcasting:** The WebSocket Manager catches the database commits and instantly broadcasts JSON payloads to all connected clients.
6. **Dashboard Hydration:** The React frontend receives the WebSocket events, intelligently merging them into state without mutating existing arrays.
7. **Interactive UX:** The UI re-renders instantly: updating KPI charts, shifting traffic segment colors, moving bus icons, and spawning incident markers on the interactive Leaflet map.

## 7. Citizen vs Authority
City Scout enforces strict role-based data presentation.
- **Citizen:** Access is limited to public awareness. Citizens can view road hazards, general accident locations, and overall traffic density to plan safe travel. The UI inherently suppresses sensitive fleet markers, bus IDs, plate numbers, and driver infractions.
- **Authority:** Unrestricted access intended for municipal administrators or transit managers. Includes total fleet visibility, live vehicle tracking, specific driver accountability metrics (lane/speed violations), and actionable emergency data like OCR-scraped license plates and driver contact numbers.

*(Note: Authentication is currently implemented via a mocked token toggle for demonstration purposes.)*

## 8. Analytics & Intelligence
The Analytics page provides a comprehensive operational overview without relying on hardcoded dummy graphs. Built using Recharts, the graphs and KPIs are entirely derived from the real-time application state: aggregating the live incident array and traffic zone density dictionaries into interactive visual distributions.

## 9. Hyderabad Simulation Routes
The Python simulator actively drives coordinates across three distinct Hyderabad corridors:
- **Secunderabad -> HITEC City**
- **Mehdipatnam -> JNTU**
- **Secunderabad -> Charminar**

## 10. Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend API** | FastAPI | High-performance async REST endpoints and business logic |
| **Database** | SQLite + SQLAlchemy | Relational persistence of telemetry, zones, and incidents |
| **Real-time** | WebSockets | Push-based updates from server to client |
| **Frontend** | React + Vite | Fast, component-based user interface |
| **Mapping** | Leaflet + React-Leaflet | Hardware-accelerated GIS visualizations |
| **Charts** | Recharts | Dynamic SVG-based analytics rendering |
| **Edge Mock** | Python + OpenCV | Simulates physical camera capture and edge inference |

## 11. Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### Setup

\\\ash
# 1. Clone the repository
cd SIH260124

# 2. Setup Python Virtual Environment (Windows)
python -m venv .venv
.venv\Scripts\activate

# 3. Install Backend Dependencies
pip install -r requirements.txt

# 4. Install Frontend Dependencies
cd frontend
npm install
cd ..

# 5. Launch Full Stack
python start_all.py --buses 3 --speed 10
\\\

This master script concurrently boots the FastAPI backend (:8000), the Vite frontend (:3000), seeds the SQLite database, and engages the Python simulator.

## 12. API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/seed | Drops tables and seeds environment with foundational demo data. |
| POST | /api/auth/login | Returns a mocked JWT-style token based on requested role. |
| GET | /api/incidents | Fetches active incidents (filtered automatically if role=citizen). |
| POST | /api/incidents/ | Ingests new anomaly payloads from the edge pipeline. |
| GET | /api/buses | Fetches latest telemetry for the active transit fleet. |
| POST | /api/buses/position | Updates backend with live edge GPS telemetry. |
| GET | /api/traffic/zones | Fetches active density states for route segments. |
| POST | /api/traffic/zones | Updates segment density from traffic estimation modules. |
| WS | /ws | Establishes the real-time bidirectional JSON data stream. |

## 13. Configuration
The edge simulator behavior can be tuned in deck-ai/config.py:
- CONFIDENCE_THRESHOLD: Minimum confidence score required to post an incident to the backend.
- SPEED_LIMIT: Baseline speed limit used to calculate telemetry violations.
- ACCIDENT_PROBABILITY / POTHOLE_PROBABILITY: Probabilistic tuning for how often the mock pipeline generates specific anomalies per frame.

## 14. Project Structure

\\\	ext
SIH260124/
├── start_all.py                 # Multi-process orchestration script
├── requirements.txt             # Python dependencies
├── backend/                     # FastAPI Application
│   ├── main.py                  # API orchestration and middleware
│   ├── database.py              # SQLite engine and SQLAlchemy ORM
│   ├── schemas.py               # Pydantic validation contracts
│   ├── websocket_manager.py     # Async broadcast hub
│   ├── seed.py                  # Initial data generator
│   └── routes/                  # API Routers
│       ├── auth.py
│       ├── incidents.py
│       ├── buses.py
│       └── traffic.py
├── frontend/                    # React SPA
│   ├── index.html
│   └── src/
│       ├── App.jsx              # Core layout and state management
│       ├── components/
│       │   ├── MapView.jsx      # GIS map and Leaflet popup synchronization
│       │   ├── DashboardComponents.jsx # Analytics, Vehicles, and KPIs
│       │   ├── IncidentFeed.jsx
│       │   ├── IncidentDetail.jsx
│       │   └── LoginToggle.jsx
│       ├── context/
│       │   └── AuthContext.jsx  # Role-based restriction provider
│       └── hooks/
│           └── useWebSocket.js  # Socket lifecycle and message parsing
├── simulator/                   # Route orchestration
│   ├── bus_simulator.py         # Moving coordinate generation
│   └── routes_data.py           # Hyderabad lat/lng arrays
└── deck-ai/                     # Edge AI Pipeline
    ├── detector.py              # Master evaluation loop
    ├── pothole_model.py
    ├── traffic_estimator.py
    ├── plate_recognizer.py
    └── config.py
\\\

## 15. Prototype / AI Implementation Status

> **Important Technical Note:** This repository is currently configured as a **demonstration prototype**. It is designed to prove the viability of the end-to-end architecture, dashboard UX, and real-time backend synchronization. 

To guarantee cross-platform compatibility out of the box (without requiring GPUs or heavy PyTorch/Ultralytics installations), the edge AI modules are currently operating in a **simulated/probabilistic** mode. 

| Capability | Current Status | Notes |
|---|---|---|
| **GIS Dashboard** | Fully Implemented | Production-ready React-Leaflet integration with dynamic popup scrolling. |
| **WebSocket Hub** | Fully Implemented | True real-time broadcast and frontend state synchronization. |
| **GPS Telemetry** | Fully Implemented | Vehicles update map locations and trigger dynamic speed calculation. |
| **Pothole/Damage** | Simulated | pothole_model.py generates deterministic reports based on configurable probabilities rather than actual pixel analysis. |
| **Hit-and-run OCR** | Mocked | plate_recognizer.py fetches plates from a local JSON registry instead of using EasyOCR/Tesseract. |
| **Lane/Speed Violations** | Simulated | Derived heuristically from mock telemetry inside detector.py. |
| **YOLO Integration** | Pluggable | Designed to accept standard Ultralytics YOLOv8 wrappers effortlessly. |

## 16. Model Integration / Future AI Upgrade
The deck-ai module utilizes standard Python class interfaces designed explicitly for drop-in model replacements. To upgrade the system to true AI inference:
1. Install ultralytics and opencv-python.
2. Modify deck-ai/pothole_model.py to instantiate a YOLO('trained_model.pt') object.
3. Pass actual camera arrays (cv2.VideoCapture) into the detect() method instead of relying on the simulator's random frame seeds.

## 17. Performance & Reliability
The current architecture implements several performance safeguards:
- **WebSocket Deduplication:** The React client utilizes Set-based ID tracking to prevent duplicate incidents from rendering during edge-case race conditions.
- **Cooldown Timers:** The Python edge pipeline uses timestamp cooldowns (e.g., 300-frame delays) to ensure that a single pothole or overspeeding event isn't spammed to the backend thousands of times a minute.
- **Responsive Layout Safety:** The map utilizes a strict 4:3 responsive aspect ratio coupled with Leaflet's ResizeObserver, guaranteeing that dynamic dashboard reflows never corrupt the tile canvas or cause vertical component clipping.

## 18. Future Enhancements
- **True Edge ML Deployment:** Integrating real YOLOv8 models for anomaly detection and EasyOCR for physical plate reading.
- **Physical Camera Feeds:** Switching the simulator to ingest RTSP streams from municipal hardware.
- **PostGIS Migration:** Upgrading the SQLite database to PostgreSQL with PostGIS for advanced spatial queries and bounding-box optimizations.
- **Secure Authentication:** Replacing the mocked role toggle with industry-standard OAuth2 / JWT authentication.
- **Historical Analysis:** Adding time-series databases to query infrastructural decay across months/years.

## 19. SIH Relevance / Impact
City Scout provides immense, low-cost value to multiple municipal tiers:
- **Municipal Authorities:** Can dispatch automated road-repair crews precisely where structural decay is actively detected.
- **Traffic Police:** Receive immediate geolocation alerts for accidents and hit-and-runs, vastly reducing emergency response times.
- **Transit Corporations:** Can hold operators accountable by auditing real-time telemetry for reckless driving (overspeeding/lane jumping).
- **Citizens:** Can view live hazard and congestion maps to make significantly safer and faster commute decisions.

## 20. License
Built exclusively for the **Smart India Hackathon 2026**. Educational and prototype use only.
