// components/SensorData.tsx
"use client"

import React, { useEffect, useState } from "react"
import { TemperatureGauge } from "./gauge"
import { TurbidityGauge } from "./turbidity"
import { GaugeCard } from "./gauge-chart"
import { TDSGauge } from "./gauge-tds"
import { PHGauge } from "./ph-gauge"
import { useStoreDevice } from "@/hooks/use-store-modal"
import { SensorData } from "@/types"
import eventBus from "@/lib/eventBus" // Import event bus

export function SensorDataCard() {
  const activeDevice = useStoreDevice((state) => state.activeDevice)
  const deviceId = activeDevice?.id || ""

  const [sensor, setSensor] = useState<SensorData>({
    deviceId,
    temperature: 0,
    turbidity: 0,
    tds: 0,
    ph: 0,
  })

  useEffect(() => {
    if (!deviceId) return // tunggu hingga deviceId ada

    // Handler untuk event sensor_data
    const handleSensorData = (data: SensorData) => {
      if (data.deviceId === deviceId) {
        setSensor(data)
      }
    } 
    // Daftarkan listener ke event bus
    eventBus.on('sensor_data', handleSensorData)
    return () => {
      // Hapus listener saat komponen di-unmount
      eventBus.off('sensor_data', handleSensorData)
    }
  }, [deviceId])
  
  return (
    <>
      <GaugeCard title="Temperature">
        <TemperatureGauge
          value={sensor.temperature}
          minValue={10}
          maxValue={35}
          width={300}
          height={150}
        />
      </GaugeCard>

      <GaugeCard title="Turbidity">
        <TurbidityGauge
          value={sensor.turbidity}
          minValue={0}
          maxValue={100}
          width={300}
          height={150}
        />
      </GaugeCard>

      <GaugeCard title="TDS">
        <TDSGauge
          value={sensor.tds}
          maxValue={3000}
          width={300}
          height={150}
        />
      </GaugeCard>

      <GaugeCard title="pH">
        <PHGauge
          value={sensor.ph}
          minValue={0}
          maxValue={14}
          width={300}
          height={200}
        />
      </GaugeCard>
    </>
  )
}