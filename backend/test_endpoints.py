"""Quick test script for all AI endpoints."""
import httpx
import json

BASE = "http://localhost:8000/api/v1"

def test(name, url, method="GET", body=None):
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"{'='*60}")
    try:
        if method == "POST":
            r = httpx.post(url, json=body, timeout=30)
        else:
            r = httpx.get(url, timeout=30)
        data = r.json()
        print(json.dumps(data, indent=2)[:800])
        if len(json.dumps(data)) > 800:
            print("... (truncated)")
        print(f"STATUS: {r.status_code} OK" if r.status_code == 200 else f"STATUS: {r.status_code} FAIL")
    except Exception as e:
        print(f"ERROR: {e}")

# Feature 1: Multi-Horizon Forecasting
test("Multi-Horizon Forecast (6h)", f"{BASE}/forecast/national?horizon=6h")

# Feature 2: Peak Demand Prediction
test("Peak Demand Prediction", f"{BASE}/forecast/national/peak")

# Feature 3: Weather-Aware (shown via explain)
test("SHAP/Feature Explanation", f"{BASE}/forecast/national/explain?horizon=24h")

# Feature 5: Anomaly Detection
test("Anomaly Detection", f"{BASE}/anomaly/national?horizon=24h")

# Feature 6: Peak Risk Alert
test("Peak Risk Assessment", f"{BASE}/forecast/national/risk?horizon=24")

# Feature 7: Scenario What-If
test("Scenario: Heatwave", f"{BASE}/forecast/national/what-if", "POST", 
     {"scenario_name": "heatwave", "duration_hours": 24})

# Feature 8: Decision Support
test("Decision Support Summary", f"{BASE}/decisions/national/summary")

# Feature 9: Analytics - Feature Importance
test("Feature Importance", f"{BASE}/analytics/national/feature-importance")

# Feature 9: Analytics - Accuracy
test("Model Accuracy", f"{BASE}/analytics/national/accuracy")

print(f"\n{'='*60}")
print("ALL TESTS COMPLETE")
print(f"{'='*60}")
