"use client"

import React, { useEffect, useState, useMemo, memo } from "react"
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip
} from "recharts"
import { useStoreDevice } from "@/hooks/use-store-modal"
import eventBus from "@/lib/eventBus"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SensorData } from "@/types"

// Tipe data untuk setiap titik dalam chart
interface SensorDataPoint {
  timestamp: Date
  value: number
}

// Konfigurasi untuk setiap sensor
const sensorConfig = {
  temperature: {
    label: "Temperature",
    color: "#8884d8",
    unit: "°C",
    minValue: 10,
    maxValue: 35,
  },
  turbidity: {
    label: "Turbidity",
    color: "#82ca9d",
    unit: "%",
    minValue: 0,
    maxValue: 100,
  },
  tds: {
    label: "TDS",
    color: "#ffc658",
    unit: "ppm",
    minValue: 0,
    maxValue: 3000,
  },
  ph: {
    label: "pH",
    color: "#ff8042",
    unit: "",
    minValue: 0,
    maxValue: 14,
  },
} as const

type SensorType = keyof typeof sensorConfig

// Define type for tooltip payload item
interface CustomTooltipPayloadItem {
  payload: {
    timestamp: Date
    value: number
    unit: string
  }
  value: number
  color: string
}

// Fixed tooltip component with proper typing
const SingleSensorTooltip = (props: {
  active?: boolean
  payload?: CustomTooltipPayloadItem[]
}) => {
  const { active, payload } = props
  
  if (active && payload && payload.length) {
    const dataItem = payload[0]
    
    // Format waktu menjadi HH:MM:SS
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })
    }

    return (
      <div className="bg-white p-3 border rounded-md shadow-lg">
        <p className="text-gray-500">
          {formatTime(dataItem.payload.timestamp)}
        </p>
        <p className="font-bold" style={{ color: dataItem.color }}>
          {dataItem.value.toFixed(1)} {dataItem.payload.unit}
        </p>
      </div>
    )
  }
  return null
}

// Sensor chart component with display name
interface SensorChartProps {
  type: SensorType
  data: SensorDataPoint[]
}

const SensorChart = memo(({ 
  type,
  data
}: SensorChartProps) => {
  const config = sensorConfig[type]
const lastValue = data.length > 0 ? data[data.length - 1].value : null
  
  // Format data untuk chart
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      unit: config.unit
    }))
  }, [data, config.unit])

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{config.label}</CardTitle>
<div className="text-2xl font-bold" style={{ color: config.color }}>
  {typeof lastValue === "number" && !isNaN(lastValue) 
    ? lastValue.toFixed(2) 
    : "--"}{config.unit}
</div>

        </div>
        <CardDescription>
          Live {config.label.toLowerCase()} readings
        </CardDescription>
      </CardHeader>
      <CardContent className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={`${type}-gradient`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={config.color} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="#f5f5f5" 
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#${type}-gradient)`}
              fillOpacity={0.3}
              isAnimationActive={false}
              activeDot={{ 
                r: 6, 
                stroke: config.color,
                strokeWidth: 2,
                fill: "#fff" 
              }}
            />
            <Tooltip
              content={<SingleSensorTooltip />}
              cursor={{ 
                stroke: '#ddd', 
                strokeWidth: 1, 
                strokeDasharray: '3 3' 
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
})
SensorChart.displayName = "SensorChart"

export function RealtimeSensorCharts() {
  const activeDevice = useStoreDevice((state) => state.activeDevice)
  const deviceId = activeDevice?.id || ""
  const maxDataPoints = 30

  // State untuk menyimpan semua data sensor
  const [sensorData, setSensorData] = useState<Record<SensorType, SensorDataPoint[]>>({
    temperature: [],
    turbidity: [],
    tds: [],
    ph: []
  })

  // Handler untuk data sensor baru
  useEffect(() => {
    if (!deviceId) return
    
    const handleSensorData = (data: SensorData) => {
      if (data.deviceId === deviceId) {
        const timestamp = new Date()
        
        setSensorData(prev => ({
          temperature: [
            ...prev.temperature.slice(-(maxDataPoints - 1)), 
            { timestamp, value: data.temperature }
          ],
          turbidity: [
            ...prev.turbidity.slice(-(maxDataPoints - 1)), 
            { timestamp, value: data.turbidity }
          ],
          tds: [
            ...prev.tds.slice(-(maxDataPoints - 1)), 
            { timestamp, value: data.tds }
          ],
          ph: [
            ...prev.ph.slice(-(maxDataPoints - 1)), 
            { timestamp, value: data.ph }
          ]
        }))
      }
    }

    eventBus.on('sensor_data', handleSensorData)
    return () => {
      eventBus.off('sensor_data', handleSensorData)
    }
  }, [deviceId, maxDataPoints])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SensorChart type="temperature" data={sensorData.temperature} />
      <SensorChart type="turbidity" data={sensorData.turbidity} />
      <SensorChart type="tds" data={sensorData.tds} />
      <SensorChart type="ph" data={sensorData.ph} />
    </div>
  )
}