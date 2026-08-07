"""Test Date Lookup Endpoint"""
import httpx
import json

BASE = "http://localhost:8000/api/v1/date-lookup"
BASE_DIRECT = "http://localhost:8000/api/date-lookup"

def test_date(date_str, label, region="national"):
    print(f"\n{'='*60}")
    print(f"TEST: {label} (date={date_str}, region={region})")
    print(f"{'='*60}")
    try:
        r = httpx.get(f"{BASE_DIRECT}?date={date_str}&region={region}", timeout=10)
        print(f"HTTP Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Source: {data.get('source')}")
            print(f"Badge: {data.get('badge')}")
            print(f"Confidence: {data.get('confidence')}")
            print(f"Metrics: {json.dumps(data.get('metrics'))}")
            print(f"Weather: {json.dumps(data.get('weather'))}")
            print(f"Sample Hour 0: {json.dumps(data.get('points')[0])}")
            print(f"Sample Hour 12: {json.dumps(data.get('points')[12])}")
        else:
            print(f"Error Response: {r.text}")
    except Exception as e:
        print(f"Error: {e}")

# 1. Past date (1 August 2024)
test_date("2024-08-01", "Past Date (1 August 2024)")

# 2. Past date SLDC Delhi
test_date("2024-08-01", "Past Date SLDC Delhi", region="sldc_delhi")

# 3. Today's date (2026-08-06)
test_date("2026-08-06", "Today's Date (Current)")

# 4. Near-future date (2026-08-10)
test_date("2026-08-10", "Near-Future Date (4 days out)")

# 5. Far-future date (2026-08-25)
test_date("2026-08-25", "Far-Future Date (19 days out)")

# 6. Out of bounds past date (2022-12-31)
test_date("2022-12-31", "Out-of-Bounds Past Date (Before 2023)")
