import { useState, useEffect } from 'react';

export interface ForecastPoint {
  ts: string;
  load_mw: number;
  low: number;
  high: number;
}

export function useForecast(region: string = 'National', horizon: string = '24h') {
  const [data, setData] = useState<ForecastPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    
    // Simulate API call to /api/v1/forecast/{region}?horizon={horizon}
    setTimeout(() => {
      try {
        const mockData: ForecastPoint[] = Array.from({ length: 24 }).map((_, i) => {
          const baseLoad = 150000 + Math.sin(i / 12 * Math.PI) * 30000;
          return {
            ts: new Date(Date.now() + i * 3600 * 1000).toISOString(),
            load_mw: Math.round(baseLoad),
            low: Math.round(baseLoad * 0.95),
            high: Math.round(baseLoad * 1.05),
          };
        });
        
        setData(mockData);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch forecast'));
        setIsLoading(false);
      }
    }, 800);
  }, [region, horizon]);

  return { data, isLoading, error };
}
