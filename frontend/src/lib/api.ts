/**
 * Central API Client for GridForecaster Backend
 * Connects Next.js Frontend directly to FastAPI Backend at http://localhost:8000/api/v1
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error ${res.status}: ${errorText}`);
  }

  return res.json();
}

// 1. Multi-Horizon Forecast
export interface ForecastPoint {
  ts: string;
  load_mw: number;
  low: number;
  high: number;
}

export interface ForecastResponse {
  region: string;
  horizon: string;
  model_version: string;
  confidence_band: string;
  points: ForecastPoint[];
}

export async function getForecast(region = 'national', horizon = '24h'): Promise<ForecastResponse> {
  return fetchJson<ForecastResponse>(`/forecast/${region.toLowerCase()}?horizon=${horizon}`);
}

// 2. Peak Demand Prediction
export interface PeakResponse {
  region: string;
  peak_time: string;
  peak_hour: number;
  peak_load_mw: number;
  grid_capacity_mw: number;
  utilization_pct: number;
  reserve_margin_mw: number;
  severity: 'NORMAL' | 'ELEVATED' | 'CRITICAL' | 'EMERGENCY';
}

export async function getPeakPrediction(region = 'national'): Promise<PeakResponse> {
  return fetchJson<PeakResponse>(`/forecast/${region.toLowerCase()}/peak`);
}

// 3. SHAP Explanation & Weather Impact
export interface ShapFeature {
  feature: string;
  shap_value?: number;
  importance?: number;
  impact: string;
  direction: string;
}

export interface ExplainResponse {
  region: string;
  horizon: string;
  predicted_load: number;
  explanation_method: string;
  shap_top_features: ShapFeature[];
  narration: string;
}

export async function getExplainForecast(region = 'national', horizon = '24h'): Promise<ExplainResponse> {
  return fetchJson<ExplainResponse>(`/forecast/${region.toLowerCase()}/explain?horizon=${horizon}`);
}

// 4. Peak Risk Assessment
export interface PeakRiskTimelinePoint {
  ts: string;
  load_mw: number;
  high_estimate_mw: number;
  capacity_mw: number;
  utilization_pct: number;
  risk_level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  reserve_margin_mw: number;
}

export interface Recommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  action: string;
  detail: string;
  confidence: number;
}

export interface PeakRiskResponse {
  region: string;
  horizon_hours: number;
  grid_capacity_mw: number;
  current_risk_level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  peak_risk: {
    level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
    utilization: number;
    hour: string;
    load_mw: number;
  };
  time_to_critical_hours: number | null;
  risk_distribution: Record<string, number>;
  recommendations: Recommendation[];
  timeline: PeakRiskTimelinePoint[];
}

export async function getPeakRisk(region = 'national', horizonHours = 48): Promise<PeakRiskResponse> {
  return fetchJson<PeakRiskResponse>(`/forecast/${region.toLowerCase()}/risk?horizon=${horizonHours}`);
}

// 5. Scenario What-If Analysis
export interface WhatIfRequestPayload {
  scenario_name?: string;
  temperature_offset?: number;
  humidity_offset?: number;
  wind_speed?: number;
  rainfall?: number;
  is_holiday?: boolean;
  is_festival?: boolean;
  is_sports_event?: boolean;
  duration_hours?: number;
}

export interface WhatIfComparisonPoint {
  ts: string;
  baseline_mw: number;
  scenario_mw: number;
  delta_mw: number;
}

export interface WhatIfResponsePayload {
  scenario_name: string;
  region: string;
  duration_hours: number;
  original_peak_mw: number;
  new_peak_mw: number;
  delta_mw: number;
  delta_percentage: number;
  avg_baseline_mw: number;
  avg_scenario_mw: number;
  comparison: WhatIfComparisonPoint[];
}

export async function runWhatIfSimulation(
  region = 'national',
  payload: WhatIfRequestPayload
): Promise<WhatIfResponsePayload> {
  return fetchJson<WhatIfResponsePayload>(`/forecast/${region.toLowerCase()}/what-if`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// 6. AI Anomaly Detection
export interface AnomalyItem {
  index: number;
  value_mw: number;
  anomaly_type: 'spike' | 'drop' | 'gradual_drift' | 'oscillation';
  severity: 'low' | 'medium' | 'high';
  anomaly_score: number;
  z_score: number;
  explanation: string;
  timestamp?: string;
}

export interface AnomalyResponse {
  region: string;
  total_points: number;
  anomalies_detected: number;
  anomaly_rate: number;
  overall_anomaly_score: number;
  status: 'clean' | 'warning' | 'alert' | 'error';
  anomalies: AnomalyItem[];
  summary: string;
}

export async function getAnomalies(region = 'national', horizon = '24h'): Promise<AnomalyResponse> {
  return fetchJson<AnomalyResponse>(`/anomaly/${region.toLowerCase()}?horizon=${horizon}`);
}

// 7. Decision Support System
export interface ResourceAllocation {
  spinning_reserve_mw: number;
  standby_units: number;
  demand_response_needed: boolean;
  demand_response_target_mw?: number;
  inter_regional_import_mw?: number;
  load_shedding_mw?: number;
  staffing_level: string;
}

export interface DecisionPackage {
  region: string;
  generated_at: string;
  executive_summary: string;
  risk_level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  peak_forecast: {
    peak_load_mw: number;
    peak_time: string;
    severity: string;
    utilization_pct: number;
  };
  anomaly_status: string;
  anomaly_count: number;
  recommendations: Recommendation[];
  resource_allocation: ResourceAllocation;
  model_confidence: {
    forecast_model: string;
    confidence_band: string;
  };
}

export async function getDecisionSupport(region = 'national'): Promise<DecisionPackage> {
  return fetchJson<DecisionPackage>(`/decisions/${region.toLowerCase()}`);
}

// 8. Analytics Dashboard Data
export interface FeatureImportanceItem {
  rank: number;
  feature: string;
  importance: number;
  importance_pct: number;
  category: 'weather' | 'temporal' | 'events' | 'historical_load' | 'other';
}

export interface FeatureImportanceResponse {
  region: string;
  model: string;
  total_features: number;
  features: FeatureImportanceItem[];
  top_5: FeatureImportanceItem[];
  category_summary: Record<string, number>;
}

export async function getFeatureImportance(region = 'national'): Promise<FeatureImportanceResponse> {
  return fetchJson<FeatureImportanceResponse>(`/analytics/${region.toLowerCase()}/feature-importance`);
}

export interface ModelAccuracyResponse {
  region: string;
  model_version: string;
  trained_at: string;
  short_term: { mae: number; rmse: number; mape: number };
  long_term: { mae: number; rmse: number; mape: number };
  interpretation: string;
}

export async function getModelAccuracy(region = 'national'): Promise<ModelAccuracyResponse> {
  return fetchJson<ModelAccuracyResponse>(`/analytics/${region.toLowerCase()}/accuracy`);
}

export interface LoadDistributionResponse {
  region: string;
  period: string;
  statistics: {
    mean_mw: number;
    median_mw: number;
    std_mw: number;
    min_mw: number;
    max_mw: number;
    range_mw: number;
  };
  hourly_profile: { hour: number; avg_load_mw: number; min_mw: number; max_mw: number }[];
  daily_profile: { day: string; avg_load_mw: number }[];
}

export async function getLoadDistribution(region = 'national'): Promise<LoadDistributionResponse> {
  return fetchJson<LoadDistributionResponse>(`/analytics/${region.toLowerCase()}/distribution`);
}

// 9. Weather
export interface WeatherResponse {
  temperature: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
  solar_radiation: number;
  aqi: number;
}

export async function getWeather(region = 'national'): Promise<WeatherResponse> {
  return fetchJson<WeatherResponse>(`/weather/${region.toLowerCase()}`);
}

// 10. Date Lookup (Historical vs Predicted)
export interface DateLookupPoint extends ForecastPoint {
  source?: 'historical' | 'predicted';
}

export interface DateLookupMetrics {
  avg_demand_mw: number;
  peak_demand_mw: number;
  peak_time: string;
  min_demand_mw: number;
  reserve_margin_mw: number;
  utilization_pct: number;
  risk_level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  severity: 'NORMAL' | 'ELEVATED' | 'CRITICAL' | 'EMERGENCY';
}

export interface DateLookupWeather {
  temperature: number;
  humidity: number;
  rainfall: number;
  wind_speed: number;
  heatwave: boolean;
  condition: string;
}

export interface DateLookupResponse {
  date: string;
  region: string;
  data_mode: 'historical' | 'predicted';
  source: 'historical' | 'predicted';
  confidence: 'high' | 'low';
  badge: string;
  metrics: DateLookupMetrics;
  weather: DateLookupWeather;
  ai_insights: string;
  recommendations: Recommendation[];
  points: DateLookupPoint[];
}

export async function lookupDate(dateStr: string, region = 'national'): Promise<DateLookupResponse> {
  const formattedRegion = region.toLowerCase().replace('-', '_');
  return fetchJson<DateLookupResponse>(`/date-lookup?date=${dateStr}&region=${formattedRegion}`);
}


