from datetime import date, timedelta
from typing import List
import time
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="AI Energy Monitoring API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SEED = int(time.time()) % 1_000_000
DATA = None

def make_data(days: int = 30, seed: int | None = None):
    """Generate realistic-looking simulated hourly readings for the MVP."""
    rng = np.random.default_rng(seed if seed is not None else 42)
    start = date.today() - timedelta(days=days - 1)
    rows = []

    for d in range(days):
        day = start + timedelta(days=d)
        for hour in range(24):
            base = 0.28
            morning = 0.75 if 6 <= hour <= 9 else 0
            evening = 1.25 if 18 <= hour <= 22 else 0
            weekend = 0.18 if day.weekday() >= 5 else 0
            noise = float(rng.normal(0, 0.12))
            kwh = max(0.08, base + morning + evening + weekend + noise)

            # Demonstration anomaly.
            if d == days - 6 and hour == 20:
                kwh *= 2.7

            rows.append({
                "date": day.isoformat(),
                "hour": hour,
                "kwh": round(kwh, 3),
                "temperature_c": round(
                    25 + 5 * np.sin(hour / 24 * 2 * np.pi), 1
                ),
                "day_type": "Weekend" if day.weekday() >= 5 else "Weekday",
            })

    return pd.DataFrame(rows)

def refresh_data():
    global DATA, SEED
    SEED = int(time.time_ns() % 1_000_000_000)
    DATA = make_data(seed=SEED)

refresh_data()

class BillRequest(BaseModel):
    kwh: float
    rate_per_kwh: float = 7.0

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "data_mode": "simulated",
        "version": app.version,
        "seed": SEED,
    }

@app.post("/api/refresh")
def refresh():
    refresh_data()
    return {"status": "ok", "message": "Simulated energy data refreshed.", "seed": SEED}

@app.get("/api/summary")
def summary():
    daily = DATA.groupby("date", as_index=False)["kwh"].sum()
    today = daily.iloc[-1]
    yesterday = daily.iloc[-2]
    total = float(daily["kwh"].sum())
    return {
        "today_kwh": round(float(today["kwh"]), 2),
        "yesterday_kwh": round(float(yesterday["kwh"]), 2),
        "month_kwh": round(total, 2),
        "estimated_bill": round(total * 7.0, 2),
        "daily": [
            {"date": r.date, "kwh": round(float(r.kwh), 2)}
            for r in daily.itertuples()
        ],
        "hourly_today": [
            {"hour": int(r.hour), "kwh": round(float(r.kwh), 2)}
            for r in DATA[DATA["date"] == str(today["date"])].itertuples()
        ],
    }

@app.post("/api/bill")
def bill(req: BillRequest):
    if req.kwh < 0 or req.rate_per_kwh < 0:
        return {"error": "kWh and rate must be non-negative"}
    return {
        "kwh": req.kwh,
        "rate_per_kwh": req.rate_per_kwh,
        "estimated_bill": round(req.kwh * req.rate_per_kwh, 2),
        "note": "Illustrative estimate; excludes fixed charges, taxes, and tariff slabs.",
    }

@app.get("/api/anomalies")
def anomalies():
    daily = DATA.groupby("date", as_index=False)["kwh"].sum()
    mean = float(daily["kwh"].mean())
    std = float(daily["kwh"].std(ddof=0))
    threshold = mean + 2 * std
    flagged = daily[daily["kwh"] > threshold]
    return {
        "baseline_daily_kwh": round(mean, 2),
        "threshold_kwh": round(threshold, 2),
        "items": [
            {
                "date": r.date,
                "kwh": round(float(r.kwh), 2),
                "message": "Daily usage is unusually high compared with this simulated baseline.",
            }
            for r in flagged.itertuples()
        ],
    }

@app.get("/api/forecast")
def forecast():
    daily = DATA.groupby("date", as_index=False)["kwh"].sum().reset_index()
    X = daily[["index"]].to_numpy()
    y = daily["kwh"].to_numpy()

    try:
        from sklearn.linear_model import LinearRegression
        model = LinearRegression().fit(X, y)
        next_x = np.arange(len(daily), len(daily) + 7).reshape(-1, 1)
        values = np.maximum(0, model.predict(next_x))
        method = "Linear Regression · 30-day simulated history"
    except Exception:
        values = np.repeat(float(np.mean(y)), 7)
        method = "7-day mean fallback"

    return {
        "method": method,
        "forecast": [
            {"day": f"Day +{i + 1}", "kwh": round(float(v), 2)}
            for i, v in enumerate(values)
        ],
        "warning": "Demonstration forecast on synthetic data; not a validated utility prediction.",
    }

@app.get("/api/recommendations")
def recommendations():
    hourly = DATA.groupby("hour")["kwh"].mean()
    daily = DATA.groupby("date")["kwh"].sum()
    items = []

    evening = float(hourly.loc[18:22].mean())
    overnight = float(hourly.loc[0:5].mean())

    if evening > overnight * 2:
        items.append({
            "title": "Reduce evening peak",
            "text": "Evening demand is substantially higher than overnight use. Review non-essential appliances between 6 PM and 10 PM.",
            "impact": "High",
        })

    if overnight > 0.5:
        items.append({
            "title": "Check standby loads",
            "text": "Overnight usage is elevated. Check devices, chargers, and appliances that may remain powered while idle.",
            "impact": "Medium",
        })

    if len(daily) >= 7 and daily.tail(7).mean() > daily.head(7).mean() * 1.05:
        items.append({
            "title": "Usage trend is rising",
            "text": "Recent daily usage is trending upward. Compare appliance use and occupancy with earlier weeks.",
            "impact": "Medium",
        })

    if not items:
        items.append({
            "title": "Maintain current pattern",
            "text": "Keep tracking daily usage and compare similar weekdays to identify further saving opportunities.",
            "impact": "Low",
        })

    return {"items": items, "basis": "Rule-based insights from simulated readings."}
