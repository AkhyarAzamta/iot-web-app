// components/SensorData.tsx
"use client"

import React, { useEffect, useState } from "react"
import socket from "@/utils/socket"
import { TemperatureGauge } from "./gauge"
import { TurbidityGauge } from "./turbidity"
import { GaugeCard } from "./gauge-chart"
import { TDSGauge } from "./gauge-tds"
import { PHGauge } from "./ph-gauge"
import { useStoreDevice } from "@/hooks/use-store-modal"
import { SensorData } from "@/types"

export function SensorDataCard() {
  // Ambil activeDevice dari Zustand
  const activeDevice = useStoreDevice((state) => state.activeDevice)
  const deviceId = activeDevice?.id || ""

  // Simpan sensor data lokal
  const [sensor, setSensor] = useState<SensorData>({
    deviceId,
    temperature: 0,
    turbidity: 0,
    tds: 0,
    ph: 0,
  })

  useEffect(() => {
    if (!deviceId) return // tunggu hingga deviceId ada

    socket.connect()
    socket.on("sensor_data", (data: SensorData) => {
      if (data.deviceId === deviceId) {
        setSensor(data)
      }
    })

    return () => {
      socket.off("sensor_data")
      socket.disconnect()
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
