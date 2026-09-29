# AI Energy Monitoring Dashboard — Hackathon MVP

A professional software-only energy intelligence dashboard built for hackathons, demos, and portfolio use.

## What it demonstrates

- Energy consumption monitoring from simulated meter readings
- One-click **Update data** action connected to the FastAPI backend
- 30-day consumption trend
- Hourly load profile
- Electricity bill calculator
- 7-day Linear Regression forecast
- Statistical anomaly detection
- Rule-based energy-saving recommendations
- Responsive, modern dashboard UI
- No hardware required

## Architecture

```text
React + Vite + Recharts
        │
        │ HTTP / JSON
        ▼
FastAPI + Python
        │
        ├── Pandas / NumPy
        └── scikit-learn
```

## Run locally — Windows

### Terminal 1: Backend

From the project root:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

Keep this terminal running.

### Terminal 2: Frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL, normally:

```text
http://localhost:5173
```

## Important for this project

The dashboard uses **simulated electricity data**. It does not read a physical electricity meter.

The Update button calls:

```text
POST /api/refresh
```

which regenerates the simulated readings and then reloads:

```text
GET /api/summary
GET /api/forecast
GET /api/anomalies
GET /api/recommendations
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend status |
| POST | `/api/refresh` | Regenerate simulated readings |
| GET | `/api/summary` | KPI and chart data |
| POST | `/api/bill` | Bill calculation |
| GET | `/api/anomalies` | Unusual-use detection |
| GET | `/api/forecast` | 7-day forecast |
| GET | `/api/recommendations` | Energy-saving insights |

## Hackathon positioning

### Problem
Electricity usage is often difficult to understand at a glance. Users may notice a high bill only after the consumption has already happened.

### Solution
AI Energy Monitor turns electricity readings into an easy-to-understand intelligence layer: monitor usage, estimate cost, identify unusual patterns, forecast near-term demand, and surface energy-saving opportunities.

### Differentiator
The MVP is **software-only** and can be demonstrated without buying or installing hardware. A future version can replace the simulated data layer with smart-meter, IoT, or utility API data.

## Limitations

- Readings are synthetic.
- Bill estimates use a flat ₹/kWh rate.
- Real utility bills can include slabs, fixed charges, taxes, subsidies, and other rules.
- Forecasting is a demonstration model and is not validated for real-world utility prediction.

## Next production upgrades

1. Replace `make_data()` with real smart-meter/IoT ingestion.
2. Add user authentication and household profiles.
3. Store time-series readings in PostgreSQL/TimescaleDB or another time-series database.
4. Add appliance-level disaggregation.
5. Replace the rule engine with a validated recommendation model.
6. Add model monitoring and forecast accuracy metrics.
7. Deploy frontend and backend separately with HTTPS and environment variables.

## Submission checklist

- [ ] Test backend health endpoint
- [ ] Test Update data button
- [ ] Test bill calculator
- [ ] Test charts and forecast
- [ ] Capture 3–5 clean screenshots
- [ ] Add project description to GitHub
- [ ] Add demo URL after deployment
- [ ] Add architecture diagram to presentation
- [ ] Clearly label synthetic/simulated data in the demo
