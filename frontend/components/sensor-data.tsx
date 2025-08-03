// components/SensorData.tsx
"use client"

import React, { useEffect, useState } from "react"
import { TemperatureGauge } from "./gauge"
import { TurbidityGauge } from "./turbidity"
import { GaugeCard } from "./gauge-chart"
import { TDSGauge } from "./gauge-tds"
import { PHGauge } from "./ph-gauge"
import { useStoreDevice } from "@/hooks/use-store-modal"
import { SensorData, SensorSetting } from "@/types"
import eventBus from "@/lib/eventBus"
import { getSensorSettings } from "@/actions/get-sensor-settings" // Import fungsi untuk mengambil pengaturan

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

  // State untuk menyimpan pengaturan sensor
  const [sensorSettings, setSensorSettings] = useState<Record<string, SensorSetting>>({})

  useEffect(() => {
    if (!deviceId) return

    // Handler untuk event sensor_data
    const handleSensorData = (data: SensorData) => {
      if (data.deviceId === deviceId) {
        setSensor(data)
      }
    }

    // Fungsi untuk mengambil pengaturan sensor
    const fetchSensorSettings = async () => {
      try {
        const response = await getSensorSettings(deviceId)
        // Konversi array ke object dengan type sebagai key
        const settingsMap = response.sensor.reduce((acc, setting) => {
          acc[setting.type] = setting
          return acc
        }, {} as Record<string, SensorSetting>)
        
        setSensorSettings(settingsMap)
      } catch (error) {
        console.error("Failed to fetch sensor settings", error)
      }
    }

    fetchSensorSettings()
    eventBus.on('sensor_data', handleSensorData)
    
    return () => {
      eventBus.off('sensor_data', handleSensorData)
    }
  }, [deviceId])
  return (
    <>
      <GaugeCard title="Temperature">
        <TemperatureGauge
          value={sensor.temperature}
          globalMin={10}
          globalMax={30}
          // Gunakan pengaturan dari API jika tersedia, fallback ke nilai default
          apiMin={sensorSettings.TEMPERATURE?.minValue ?? 25}
          apiMax={sensorSettings.TEMPERATURE?.maxValue ?? 27}
        />
      </GaugeCard>

      <GaugeCard title="Turbidity">
        <TurbidityGauge
          value={sensor.turbidity}
          // Gunakan pengaturan dari API jika tersedia
          // apiMin={sensorSettings.TURBIDITY?.minValue}
          // apiMax={sensorSettings.TURBIDITY?.maxValue}
        />
      </GaugeCard>

      <GaugeCard title="TDS">
        <TDSGauge
          value={sensor.tds}
          // Gunakan pengaturan dari API jika tersedia
          // maxValue={sensorSettings.TDS?.maxValue ?? 3000}
        />
      </GaugeCard>

      <GaugeCard title="pH">
        <PHGauge
          value={sensor.ph}
          // Gunakan pengaturan dari API jika tersedia
          minValue={sensorSettings.PH?.minValue ?? 0}
          maxValue={sensorSettings.PH?.maxValue ?? 14}
        />
      </GaugeCard>
    </>
  )
}