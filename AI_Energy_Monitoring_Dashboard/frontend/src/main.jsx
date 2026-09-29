import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import "./style.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [summary, setSummary] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [rate, setRate] = useState(7);
  const [billKwh, setBillKwh] = useState(100);
  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(async (refresh = false) => {
    setLoading(true);
    setError("");

    try {
      if (refresh) {
        const refreshResponse = await fetch(`${API}/api/refresh`, { method: "POST" });
        if (!refreshResponse.ok) throw new Error("Refresh failed");
      }

      const [s, f, a, r] = await Promise.all([
        fetch(`${API}/api/summary`).then((res) => res.json()),
        fetch(`${API}/api/forecast`).then((res) => res.json()),
        fetch(`${API}/api/anomalies`).then((res) => res.json()),
        fetch(`${API}/api/recommendations`).then((res) => res.json()),
      ]);

      setSummary(s);
      setForecast(f);
      setAnomalies(a.items || []);
      setRecommendations(r.items || []);
      setLastUpdated(new Date());
    } catch {
      setError("Could not connect to the API. Start FastAPI on port 8000.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function calculateBill(e) {
    e.preventDefault();
    try {
      const response = await fetch(`${API}/api/bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kwh: Number(billKwh),
          rate_per_kwh: Number(rate),
        }),
      });
      setBill(await response.json());
    } catch {
      setError("Bill calculator could not reach the backend.");
    }
  }

  const refreshLabel = loading ? "Updating…" : "Update data";

  return (
    <main className="shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="hero">
        <div>
          <div className="eyebrow">ENERGY INTELLIGENCE · MVP</div>
          <h1>AI Energy Monitor</h1>
          <p className="sub">
            Understand usage. Estimate costs. Forecast demand. Find opportunities to save.
          </p>
          <div className="hero-meta">
            <span className="status-dot" /> Simulated data
            {lastUpdated && (
              <span className="updated">
                Last updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        <button className="refresh-btn" onClick={() => loadDashboard(true)} disabled={loading}>
          <span className={loading ? "spin" : ""}>↻</span>
          {refreshLabel}
        </button>
      </header>

      {error && <div className="alert error-alert">{error}</div>}

      {summary && (
        <>
          <section className="cards">
            <article className="metric metric-primary">
              <span>Today's usage</span>
              <strong>{summary.today_kwh} <small>kWh</small></strong>
              <em>Daily total</em>
              <div className="metric-accent" />
            </article>

            <article className="metric">
              <span>Last 30 days</span>
              <strong>{summary.month_kwh} <small>kWh</small></strong>
              <em>Simulated readings</em>
            </article>

            <article className="metric">
              <span>Estimated bill</span>
              <strong>₹{summary.estimated_bill.toLocaleString("en-IN")}</strong>
              <em>At ₹7/kWh</em>
            </article>

            <article className="metric">
              <span>Yesterday</span>
              <strong>{summary.yesterday_kwh} <small>kWh</small></strong>
              <em>Daily total</em>
            </article>
          </section>

          <section className="panel chart-panel">
            <div className="section-head">
              <div>
                <div className="section-kicker">30-DAY ANALYTICS</div>
                <h2>Consumption trend</h2>
                <p>Daily electricity use across the simulated monitoring period.</p>
              </div>
              <div className="mini-badge">LIVE MODEL</div>
            </div>
            <div className="chart chart-main">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.daily}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={false} />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="kwh"
                    name="kWh"
                    stroke="#0f9f73"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="two">
            <div className="panel">
              <div className="section-kicker">LOAD PROFILE</div>
              <h2>Today's hourly usage</h2>
              <p>Identify morning and evening demand peaks.</p>
              <div className="chart small">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.hourly_today}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="kwh" name="kWh" fill="#4a86e8" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel calculator">
              <div className="section-kicker">COST MODEL</div>
              <h2>Bill calculator</h2>
              <p>Test consumption and tariff assumptions instantly.</p>
              <form onSubmit={calculateBill} className="form">
                <label>
                  Consumption (kWh)
                  <input
                    type="number"
                    min="0"
                    value={billKwh}
                    onChange={(e) => setBillKwh(e.target.value)}
                  />
                </label>
                <label>
                  Rate (₹/kWh)
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                  />
                </label>
                <button>Calculate estimate</button>
              </form>
              {bill && (
                <div className="result">
                  <span>Estimated bill</span>
                  <b>₹{Number(bill.estimated_bill).toLocaleString("en-IN")}</b>
                  <small>{bill.note}</small>
                </div>
              )}
            </div>
          </section>

          <section className="two">
            <div className="panel">
              <div className="section-kicker">PREDICTIVE ANALYTICS</div>
              <h2>7-day forecast</h2>
              <p>{forecast?.method || "Loading model…"}</p>
              {forecast && (
                <>
                  <div className="chart small">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={forecast.forecast}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="kwh" name="Predicted kWh" fill="#8067d9" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="fine">{forecast.warning}</p>
                </>
              )}
            </div>

            <div className="panel">
              <div className="section-kicker">AI INSIGHTS</div>
              <h2>Energy-saving insights</h2>
              <p>Actionable recommendations generated from usage patterns.</p>
              <div className="insights">
                {recommendations.map((item, i) => (
                  <div className="insight" key={i}>
                    <div className="insight-icon">✦</div>
                    <div>
                      <div className="insight-top">
                        <b>{item.title || "Energy opportunity"}</b>
                        {item.impact && <span>{item.impact}</span>}
                      </div>
                      <p>{item.text || item}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-kicker">ANOMALY DETECTION</div>
            <h2>Unusual usage alerts</h2>
            <p>Daily totals compared with a statistical baseline.</p>

            {anomalies.length ? (
              anomalies.map((a, i) => (
                <div className="alert" key={i}>
                  <b>{a.date} · {a.kwh} kWh</b>
                  <br />
                  {a.message}
                </div>
              ))
            ) : (
              <div className="empty-state">✓ No anomalies found in this sample.</div>
            )}
          </section>

          <footer>
            AI Energy Monitor · Software-only prototype · Synthetic readings · Illustrative analytics
          </footer>
        </>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
