// components/data-sensor-charts.tsx
"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getSensorData, SensorData, SensorDataFilters } from "@/actions/get-sensor-data"
import { format, subDays } from "date-fns"
import { useStoreDevice } from "@/hooks/use-store-modal"

// Definisikan opsi sensor yang tersedia
const SENSOR_OPTIONS = [
  { key: 'temperature', label: 'Temperature', color: '#FF6384', unit: '°C' },
  { key: 'turbidity', label: 'Turbidity', color: '#36A2EB', unit: '%' },
  { key: 'tds', label: 'TDS', color: '#4BC0C0', unit: 'ppm' },
  { key: 'ph', label: 'pH', color: '#FFCE56', unit: '' },
]

interface ChartDataPoint {
  timestamp: string; // yyyy-MM-dd
  value: number | null;
}

// Raw item bisa berisi field SensorData dan/atau field tambahan (created_at, timestamp, dll)
type RawItem = Partial<SensorData> & Record<string, unknown>

export function SensorCharts() {
  const [data, setData] = React.useState<ChartDataPoint[]>([])
  const [timeRange, setTimeRange] = React.useState("14d")
  const [selectedSensor, setSelectedSensor] = React.useState('temperature')
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  const activeDevice = useStoreDevice((state) => state.activeDevice)
  const deviceId = activeDevice?.id || ""

  // Helper: extrak timestamp dari berbagai kemungkinan field
  const extractCreatedAt = (item: RawItem): string | null => {
    if (!item) return null

    const maybe = (k: string) => {
      const v = (item as Record<string, unknown>)[k]
      if (typeof v === 'string') return v
      // beberapa API mengemas tanggal sebagai object, contoh { $date: "2025-08-11T..." }
      if (typeof v === 'object' && v !== null) {
        const o = v as Record<string, unknown>
        if (typeof o.$date === 'string') return o.$date
        if (typeof o.date === 'string') return o.date
      }
      return null
    }

    // Cek beberapa nama properti umum
    return maybe('createdAt') ?? maybe('created_at') ?? maybe('timestamp') ?? maybe('time') ?? null
  }

  const fetchData = React.useCallback(async () => {
    if (!deviceId) {
      console.warn("Device ID is not available. Skipping fetch.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true)
    setError(null)

    try {
      let days = 7
      if (timeRange === "14d") days = 14
      else if (timeRange === "30d") days = 30
      
      const endDate = new Date()
      const startDate = subDays(endDate, days)

      const filters: SensorDataFilters = {
        device_id: deviceId,
        date_from: format(startDate, "yyyy-MM-dd"),
        date_to: format(endDate, "yyyy-MM-dd"),
        page_size: days * 24
      }

      const response = await getSensorData(filters)

      // Pastikan struktur response sesuai
      if (!response || !('data' in response) || !Array.isArray((response as unknown as { data: unknown[] }).data)) {
        throw new Error("Invalid data format from API")
      }

      // Cast aman ke RawItem[]
      const items = (response as unknown as { data: RawItem[] }).data

      const groupedData: Record<string, { sum: number; count: number }> = {}

      items.forEach((item: RawItem) => {
        const rawCreated = extractCreatedAt(item)
        if (!rawCreated) {
          // skip jika tidak ada timestamp yang dikenali
          return
        }

        const dateObj = new Date(rawCreated)
        if (isNaN(dateObj.getTime())) return

        const dateKey = format(dateObj, "yyyy-MM-dd")

        if (!groupedData[dateKey]) groupedData[dateKey] = { sum: 0, count: 0 }

        // Ambil nilai sensor: bisa berada langsung di property SensorData
        const valueCandidate = (item as Partial<Record<string, unknown>>)[selectedSensor]

        let numericValue: number | null = null

        if (valueCandidate === null || valueCandidate === undefined) {
          numericValue = null
        } else if (typeof valueCandidate === 'number') {
          numericValue = Number.isFinite(valueCandidate) ? valueCandidate : null
        } else if (typeof valueCandidate === 'string') {
          const parsed = parseFloat(valueCandidate)
          numericValue = Number.isFinite(parsed) ? parsed : null
        } else if (typeof valueCandidate === 'object') {
          // coba ekstrak properti umum seperti { value: "..." } atau { val: ... }
          const obj = valueCandidate as Record<string, unknown>
          const candidate = ('value' in obj ? obj.value : ('val' in obj ? obj.val : undefined)) as unknown
          if (typeof candidate === 'number') numericValue = Number.isFinite(candidate) ? candidate : null
          else if (typeof candidate === 'string') {
            const p = parseFloat(candidate)
            numericValue = Number.isFinite(p) ? p : null
          } else {
            numericValue = null
          }
        } else {
          numericValue = null
        }

        if (numericValue !== null && Number.isFinite(numericValue)) {
          groupedData[dateKey].sum += numericValue
          groupedData[dateKey].count += 1
        }
      })

      // Buat list semua tanggal di range
      const totalDays = days + 1
      const allDates: string[] = []
      for (let i = 0; i < totalDays; i++) {
        const d = new Date()
        d.setDate(d.getDate() - days + i)
        allDates.push(format(d, "yyyy-MM-dd"))
      }

      const averagedData: ChartDataPoint[] = allDates.map(dateKey => {
        const g = groupedData[dateKey]
        if (g && g.count > 0) {
          return { timestamp: dateKey, value: g.sum / g.count }
        } else {
          return { timestamp: dateKey, value: null }
        }
      })

      averagedData.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1))

      setData(averagedData)
    } catch (err) {
      console.error("Failed to fetch sensor data", err)
      let errorMessage = "Failed to load data. Please try again later."
      if (err instanceof Error) errorMessage = err.message
      else if (typeof err === "string") errorMessage = err
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [deviceId, timeRange, selectedSensor])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const currentSensor = SENSOR_OPTIONS.find(s => s.key === selectedSensor) || SENSOR_OPTIONS[0]

  return (
    <Card className="pt-0">
      <CardHeader className="flex flex-col gap-4 border-b py-5 md:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Sensor Data</CardTitle>
          <CardDescription>Average value of sensor data</CardDescription>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 text-sm font-medium">Time Range</div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[160px] rounded-lg">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
                <SelectItem value="14d" className="rounded-lg">Last 2 weeks</SelectItem>
                <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <div className="mb-2 text-sm font-medium">Sensor</div>
            <Select value={selectedSensor} onValueChange={setSelectedSensor}>
              <SelectTrigger className="w-[160px] rounded-lg">
                <SelectValue placeholder="Select sensor" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {SENSOR_OPTIONS.map(sensor => (
                  <SelectItem 
                    key={sensor.key} 
                    value={sensor.key}
                    className="rounded-lg"
                  >
                    {sensor.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="aspect-auto h-[400px] w-full">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">Loading data...</p>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={currentSensor.color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={currentSensor.color} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(String(value))
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => `${value}${currentSensor.unit ? ` ${currentSensor.unit}` : ''}`}
                />
                <Tooltip 
                  formatter={(value) => {
                    if (value === null) {
                      return ["No data", currentSensor.label]
                    }
                    return [`${Number(value).toFixed(1)}${currentSensor.unit ? ` ${currentSensor.unit}` : ''}`, currentSensor.label]
                  }}
                  labelFormatter={(value) => new Date(String(value)).toLocaleDateString("en-US", {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name={currentSensor.label}
                  stroke={currentSensor.color}
                  fill="url(#colorValue)"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  activeDot={{ r: 6, stroke: currentSensor.color, fill: "#fff", strokeWidth: 2 }}
                  dot={{ r: 2, fill: currentSensor.color }}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
