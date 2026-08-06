// Mock WebSocket implementation for the dashboard

type WsCallback = (data: any) => void;

class MockWebSocket {
  private callbacks: WsCallback[] = [];
  private interval: NodeJS.Timeout | null = null;

  connect() {
    // Simulate initial connection delay
    setTimeout(() => {
      this.startEmitting();
    }, 1000);
  }

  onMessage(callback: WsCallback) {
    this.callbacks.push(callback);
  }

  disconnect() {
    if (this.interval) clearInterval(this.interval);
    this.callbacks = [];
  }

  private startEmitting() {
    // Emit a mock alert every 30-45 seconds
    this.interval = setInterval(() => {
      const types = ["WARNING", "CRITICAL", "INFO"];
      const regions = ["Northern Grid", "Western Grid", "Southern Grid", "Eastern Grid"];
      
      const type = types[Math.floor(Math.random() * types.length)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      
      let message = "";
      if (type === "CRITICAL") message = `Unexpected load spike of 8% detected in ${region}.`;
      else if (type === "WARNING") message = `Frequency deviation approaching lower bound (49.9Hz).`;
      else message = `Scheduled maintenance completed for Substation Alpha.`;

      const mockEvent = {
        type: "NEW_ALERT",
        payload: {
          id: `alert-${Date.now()}`,
          type,
          region,
          message,
          triggered_at: new Date().toISOString(),
          status: "ACTIVE"
        }
      };

      this.callbacks.forEach(cb => cb(mockEvent));
    }, Math.random() * 15000 + 30000); 
  }
}

export const wsClient = new MockWebSocket();
