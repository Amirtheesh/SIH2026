import { useState, useEffect } from 'react';
import { Alert } from '@/components/alerts/AlertCard';
import { wsClient } from '@/lib/ws';

// Initial seed data
const initialAlerts: Alert[] = [
  {
    id: 'alert-1',
    type: 'CRITICAL',
    region: 'Northern Grid',
    message: 'Demand exceeding 98% of predicted peak capacity. Potential load shedding imminent if trend continues.',
    triggered_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'ACTIVE'
  },
  {
    id: 'alert-2',
    type: 'WARNING',
    region: 'Western Grid',
    message: 'Solar generation dropped by 15% due to unexpected cloud cover. Ramping up thermal reserve.',
    triggered_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    status: 'ACKNOWLEDGED'
  },
  {
    id: 'alert-3',
    type: 'INFO',
    region: 'National',
    message: 'Daily forecasting model successfully retrained with latest 24h data. RMSE improved by 0.02.',
    triggered_at: new Date(Date.now() - 1000 * 3600 * 2).toISOString(),
    status: 'RESOLVED'
  }
];

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);

  useEffect(() => {
    wsClient.connect();
    
    wsClient.onMessage((event) => {
      if (event.type === 'NEW_ALERT') {
        setAlerts((prev) => [event.payload, ...prev]);
      }
    });

    return () => {
      wsClient.disconnect();
    };
  }, []);

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) => 
      prev.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a)
    );
    // In a real app, this would be a PUT request to /api/v1/alerts/{id}/resolve
  };

  const resolveAlert = (id: string) => {
    setAlerts((prev) => 
      prev.map(a => a.id === id ? { ...a, status: 'RESOLVED' } : a)
    );
  };

  return { alerts, acknowledgeAlert, resolveAlert };
}
