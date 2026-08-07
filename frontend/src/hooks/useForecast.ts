import { useState, useEffect } from 'react';
import { getForecast, ForecastPoint } from '@/lib/api';

export type { ForecastPoint };

export function useForecast(region: string = 'national', horizon: string = '24h') {
  const [data, setData] = useState<ForecastPoint[]>([]);
  const [confidenceBand, setConfidenceBand] = useState<string>('±8%');
  const [modelVersion, setModelVersion] = useState<string>('v2');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    getForecast(region, horizon)
      .then((res) => {
        if (isMounted) {
          setData(res.points || []);
          setConfidenceBand(res.confidence_band || '±8%');
          setModelVersion(res.model_version || 'v2');
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Backend API call failed, using fallback forecast:', err);
          // Fallback realistic points
          const fallbackData: ForecastPoint[] = Array.from({ length: 24 }).map((_, i) => {
            const baseLoad = 150000 + Math.sin(i / 12 * Math.PI) * 30000;
            return {
              ts: new Date(Date.now() + i * 3600 * 1000).toISOString(),
              load_mw: Math.round(baseLoad),
              low: Math.round(baseLoad * 0.92),
              high: Math.round(baseLoad * 1.08),
            };
          });
          setData(fallbackData);
          setError(err instanceof Error ? err : new Error('Failed to fetch forecast'));
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [region, horizon]);

  return { data, confidenceBand, modelVersion, isLoading, error };
}
