// components/demo-sensor-charts.tsx
'use client'

import React, { useEffect, useState, useMemo, memo } from "react"
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  ResponsiveContainer, 
  Tooltip
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

// Tipe data untuk setiap titik dalam chart
interface SensorDataPoint {
  timestamp: Date
  value: number
}

// Konfigurasi untuk setiap sensor
const sensorConfig = {
  temperature: {
    label: "Temperature",
    color: "#0ea5e9", // menggunakan warna cyan-500 dari tailwind
    unit: "°C",
    minValue: 10,
    maxValue: 35,
  },
  turbidity: {
    label: "Turbidity",
    color: "#f59e0b", // amber-500
    unit: "%",
    minValue: 0,
    maxValue: 100,
  },
  tds: {
    label: "TDS",
    color: "#3b82f6", // blue-500
    unit: "ppm",
    minValue: 0,
    maxValue: 3000,
  },
  ph: {
    label: "pH",
    color: "#10b981", // emerald-500
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
      <div className="bg-white p-3 border rounded-md shadow-lg dark:bg-slate-800 dark:border-slate-700">
        <p className="text-gray-500 dark:text-gray-400">
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
  const lastValue = data.length > 0 ? data[data.length - 1].value : 0
  
  // Format data untuk chart
  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      unit: config.unit
    }))
  }, [data, config.unit])

  return (
    <Card className="h-full">
      <CardHeader className="pb-2 px-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xs">{config.label}</CardTitle>
          <div className="text-xs font-bold" style={{ color: config.color }}>
            {lastValue.toFixed(1)}{config.unit}
          </div>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Live {config.label.toLowerCase()} readings
        </CardDescription>
      </CardHeader>
      <CardContent className="h-20 px-2">
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
              strokeOpacity={0.1}
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

// Komponen untuk menampilkan chart sensor dengan data dummy
export function DemoSensorCharts() {
  const maxDataPoints = 30
  const [sensorData, setSensorData] = useState<Record<SensorType, SensorDataPoint[]>>({
    temperature: [],
    turbidity: [],
    tds: [],
    ph: []
  })

  // Inisialisasi data dummy
  useEffect(() => {
    // Fungsi untuk generate data dummy awal
    const generateInitialData = (): Record<SensorType, SensorDataPoint[]> => {
      const now = new Date()
      const initialData: Record<SensorType, SensorDataPoint[]> = {
        temperature: [],
        turbidity: [],
        tds: [],
        ph: []
      }

      // Untuk setiap sensor, buat 30 data point dengan nilai acak dalam rentang normal
      Object.keys(sensorConfig).forEach((type) => {
        const sensorType = type as SensorType
        const config = sensorConfig[sensorType]
        for (let i = maxDataPoints; i > 0; i--) {
          const timestamp = new Date(now.getTime() - i * 2000) // setiap 2 detik
          const value = Math.random() * (config.maxValue - config.minValue) + config.minValue
          initialData[sensorType].push({ timestamp, value })
        }
      })

      return initialData
    }

    setSensorData(generateInitialData())

    // Update data setiap 2 detik
    const interval = setInterval(() => {
      setSensorData(prev => {
        const now = new Date()
        const newData = { ...prev }

        Object.keys(prev).forEach((type) => {
          const sensorType = type as SensorType
          const config = sensorConfig[sensorType]
          const lastValue = prev[sensorType][prev[sensorType].length - 1].value
          // Nilai baru: berubah sedikit dari nilai terakhir
          const change = (Math.random() - 0.5) * 2 // antara -1 dan 1
          const newValue = Math.min(
            config.maxValue, 
            Math.max(config.minValue, lastValue + change)
          )

          newData[sensorType] = [
            ...prev[sensorType].slice(1), 
            { timestamp: now, value: newValue }
          ]
        })

        return newData
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [maxDataPoints])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1">
      <SensorChart type="temperature" data={sensorData.temperature} />
      <SensorChart type="turbidity" data={sensorData.turbidity} />
      <SensorChart type="tds" data={sensorData.tds} />
      <SensorChart type="ph" data={sensorData.ph} />
    </div>
  )
}