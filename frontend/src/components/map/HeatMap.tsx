"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon issue with Next.js/Webpack
import L from "leaflet";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface RegionData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demand_intensity: number; // 0 to 1
  current_load: number;
}

const mockRegions: RegionData[] = [
  { id: "1", name: "Northern Grid (Delhi NCR)", lat: 28.6139, lng: 77.2090, demand_intensity: 0.9, current_load: 42000 },
  { id: "2", name: "Western Grid (Mumbai)", lat: 19.0760, lng: 72.8777, demand_intensity: 0.85, current_load: 38000 },
  { id: "3", name: "Southern Grid (Bangalore)", lat: 12.9716, lng: 77.5946, demand_intensity: 0.7, current_load: 28000 },
  { id: "4", name: "Eastern Grid (Kolkata)", lat: 22.5726, lng: 88.3639, demand_intensity: 0.5, current_load: 18000 },
  { id: "5", name: "Central Grid (Nagpur)", lat: 21.1458, lng: 79.0882, demand_intensity: 0.4, current_load: 14000 },
  { id: "6", name: "Gujarat Industrial", lat: 23.0225, lng: 72.5714, demand_intensity: 0.95, current_load: 31000 },
];

export default function HeatMap() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-full w-full bg-muted/20 animate-pulse rounded-lg flex items-center justify-center">Loading map...</div>;
  }

  const getIntensityColor = (intensity: number) => {
    if (intensity > 0.8) return "#ef4444"; // Red for high
    if (intensity > 0.6) return "#f59e0b"; // Amber for medium
    return "#3b82f6"; // Blue for normal
  };

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={[20.5937, 78.9629]} // Center of India
        zoom={5}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: "#0f172a" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {mockRegions.map((region) => (
          <CircleMarker
            key={region.id}
            center={[region.lat, region.lng]}
            pathOptions={{
              fillColor: getIntensityColor(region.demand_intensity),
              fillOpacity: 0.6,
              color: getIntensityColor(region.demand_intensity),
              weight: 2,
            }}
            radius={Math.max(10, region.demand_intensity * 30)}
          >
            <Tooltip
              className="bg-card text-card-foreground border-border"
              direction="top"
              opacity={1}
            >
              <div className="text-sm font-semibold">{region.name}</div>
              <div className="text-xs text-muted-foreground">
                Load: {region.current_load.toLocaleString("en-US")} MW
              </div>
              <div className="text-xs text-muted-foreground">
                Intensity: {(region.demand_intensity * 100).toFixed(0)}%
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
