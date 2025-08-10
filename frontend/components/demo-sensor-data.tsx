// components/sensor-data.tsx (versi demo)
'use client';

import React, { useEffect, useState } from "react";
import { TemperatureGauge } from "@/components/gauge";
import { TurbidityGauge } from "@/components/turbidity";
import { GaugeCard } from "@/components/gauge-chart";
import { TDSGauge } from "@/components/gauge-tds";
import { PHGauge } from "@/components/ph-gauge";

// Data dummy untuk sensor
const dummySensorData = {
  temperature: 26.5,
  turbidity: 15,
  tds: 1200,
  ph: 7.2,
};

export function SensorDataCard() {
  const [sensor, setSensor] = useState(dummySensorData);

  // Simulasi perubahan data setiap 5 detik
  useEffect(() => {
    const interval = setInterval(() => {
      setSensor({
        temperature: Math.max(20, Math.min(30, sensor.temperature + (Math.random() - 0.5))),
        turbidity: Math.max(5, Math.min(50, sensor.turbidity + (Math.random() - 0.5) * 2)),
        tds: Math.max(800, Math.min(2000, sensor.tds + (Math.random() - 0.5) * 50)),
        ph: Math.max(6.5, Math.min(8.5, sensor.ph + (Math.random() - 0.5) * 0.1)),
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [sensor]);

  return (
    <div className="grid lg:grid-cols-2 gap-1">
      <GaugeCard title="Temperature">
        <TemperatureGauge
          value={sensor.temperature}
          globalMin={10}
          globalMax={30}
          apiMin={25}
          apiMax={27}
        />
      </GaugeCard>

      <GaugeCard title="Turbidity">
        <TurbidityGauge
          value={sensor.turbidity}
        />
      </GaugeCard>

      <GaugeCard title="TDS">
        <TDSGauge
          value={sensor.tds}
          maxValue={3000}
        />
      </GaugeCard>

      <GaugeCard title="pH">
        <PHGauge
          value={sensor.ph}
          minValue={0}
          maxValue={14}
        />
      </GaugeCard>
    </div>
  );
}