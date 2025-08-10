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

// Tipe untuk data chart
interface ChartDataPoint {
  timestamp: string;
  value: number | null;
}

export function SensorCharts() {
  const [data, setData] = React.useState<ChartDataPoint[]>([])
  const [timeRange, setTimeRange] = React.useState("14d")
  const [selectedSensor, setSelectedSensor] = React.useState('temperature')
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  const activeDevice = useStoreDevice((state) => state.activeDevice)
  const deviceId = activeDevice?.id || ""

  // Fungsi untuk mengambil data dari API
  const fetchData = React.useCallback(async () => {
    if (!deviceId) {
      console.error("Device ID is not available. Skipping fetch.");
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Hitung rentang waktu berdasarkan pilihan
      let days = 7
      if (timeRange === "14d") days = 14
      else if (timeRange === "30d") days = 30
      
      const endDate = new Date()
      const startDate = subDays(endDate, days)
      
      const filters: SensorDataFilters = {
        device_id: deviceId,
        date_from: format(startDate, "yyyy-MM-dd"),
        date_to: format(endDate, "yyyy-MM-dd"),
        page_size: days * 24 // Ambil data per jam
      }
      
      console.log("Fetching sensor data with filters:", filters);
      const response = await getSensorData(filters)
      console.log("Received sensor data response:", response);
      
      // Pastikan response.data ada dan array
      if (!response || !response.data || !Array.isArray(response.data)) {
        throw new Error("Invalid data format from API");
      }
      
      // Kelompokkan data per tanggal dan hitung rata-rata
      const groupedData: Record<string, { sum: number; count: number }> = {}
      
      response.data.forEach(item => {
        // Pastikan item.createdAt ada
        if (!item.createdAt) {
          console.warn("Item missing createdAt:", item);
          return;
        }
        
        const date = new Date(item.createdAt)
        const dateKey = format(date, "yyyy-MM-dd") // Kelompokkan per tanggal
        
        if (!groupedData[dateKey]) {
          groupedData[dateKey] = { sum: 0, count: 0 }
        }
        
        // Ambil nilai sensor yang dipilih
        const value = item[selectedSensor as keyof SensorData];
        
        // Tambahkan pengecekan tipe data
        if (typeof value === 'number' && !isNaN(value)) {
          groupedData[dateKey].sum += value
          groupedData[dateKey].count += 1
        } else {
          console.warn(`Invalid value for ${selectedSensor}:`, value, "in item:", item);
        }
      })
      
      // Buat array untuk semua tanggal dalam rentang
      const totalDays = days + 1; // +1 untuk mengikutsertakan hari ini
      const allDates = Array.from({ length: totalDays }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - days + i);
        return format(date, "yyyy-MM-dd");
      });
      
      // Buat array data dengan nilai rata-rata
      const averagedData = allDates.map(date => {
        if (groupedData[date] && groupedData[date].count > 0) {
          return {
            timestamp: date,
            value: groupedData[date].sum / groupedData[date].count
          }
        } else {
          return {
            timestamp: date,
            value: null // Tidak ada data
          }
        }
      })
      
      setData(averagedData)
    } catch (err) {
      console.error("Failed to fetch sensor data", err)
      
      // Tangani error dengan aman
      let errorMessage = "Failed to load data. Please try again later."
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === "string") {
        errorMessage = err
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [deviceId, timeRange, selectedSensor])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  // Dapatkan sensor yang sedang dipilih
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
                    const date = new Date(value)
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
                  labelFormatter={(value) => new Date(value).toLocaleDateString("en-US", {
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