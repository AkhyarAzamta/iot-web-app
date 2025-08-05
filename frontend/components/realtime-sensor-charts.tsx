// components/realtime-sensor-charts.tsx
"use client"

import { SensorChart } from "@/components/sensor-chart"

export function SensorCharts() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <SensorChart
        title="Temperature"
        description="Temperature over time"
        sensorKey="temperature"
        color="#FF6384" // Merah
        unit="°C"
      />
      
      <SensorChart
        title="Turbidity"
        description="Turbidity levels over time"
        sensorKey="turbidity"
        color="#36A2EB" // Biru
        unit="%"
      />
      
      <SensorChart
        title="TDS"
        description="Total Dissolved Solids over time"
        sensorKey="tds"
        color="#4BC0C0" // Cyan
        unit="ppm"
      />
      
      <SensorChart
        title="pH"
        description="pH levels over time"
        sensorKey="ph"
        color="#FFCE56" // Kuning
      />
    </div>
  )
}