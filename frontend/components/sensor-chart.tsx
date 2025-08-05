"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
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

interface SensorChartProps {
  title: string;
  description?: string;
  sensorKey: keyof Pick<SensorData, 'temperature' | 'turbidity' | 'tds' | 'ph'>;
  color: string;
  unit?: string;
}

export const SensorChart = ({
  title,
  description,
  sensorKey,
  color,
  unit = "",
}: SensorChartProps) => {
  const [data, setData] = React.useState<{ timestamp: string; value: number | null }[]>([])
  const [timeRange, setTimeRange] = React.useState("14d") // Default ke "Last 2 weeks"
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  
  const activeDevice = useStoreDevice((state) => state.activeDevice)
  const deviceId = activeDevice?.id || ""

  // Fungsi untuk mengambil data dari API
  const fetchData = React.useCallback(async () => {
    if (!deviceId) return
    
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
      
      const response = await getSensorData(filters)
      // Kelompokkan data per tanggal dan hitung rata-rata
      const groupedData: Record<string, { sum: number; count: number }> = {}
      
      response.data.forEach(item => {
        const date = new Date(item.createdAt)
        const dateKey = format(date, "yyyy-MM-dd")
        
        if (!groupedData[dateKey]) {
          groupedData[dateKey] = { sum: 0, count: 0 }
        }
        
        // Pastikan nilai tidak null/undefined
        const value = item[sensorKey]
        if (value !== null && value !== undefined) {
          groupedData[dateKey].sum += value
          groupedData[dateKey].count += 1
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
  }, [deviceId, timeRange, sensorKey])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const id = React.useId()
  const fillId = `fill-${id}`

  const chartConfig = {
    value: {
      label: title,
      color,
    }
  } satisfies ChartConfig

  return (
    <Card className="pt-0">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select time range"
          >
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
            <SelectItem value="14d" className="rounded-lg">Last 2 weeks</SelectItem>
            <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
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
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <defs>
                  <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  vertical={false} 
                  strokeDasharray="3 3" 
                  stroke="#f0f0f0" 
                />
                <XAxis
                  dataKey="timestamp"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value)
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => `${value}${unit}`}
                  domain={['dataMin - 5', 'dataMax + 5']} // Pastikan selalu ada ruang untuk garis
                />
                <ChartTooltip
                  cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "3 3" }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      }}
                      formatter={(value) => {
                        if (value === null) {
                          return ["No data", title]
                        }
                        return [`${Number(value).toFixed(1)}${unit ? ` ${unit}` : ''}`, title]
                      }}
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey="value"
                  type="monotone"
                  fill={`url(#${fillId})`}
                  stroke={color}
                  strokeWidth={2}
                  connectNulls={false}
                  activeDot={{ r: 6, fill: color, stroke: "#fff", strokeWidth: 2 }}
                  dot={{ r: 2, fill: color }}
                />
                <ChartLegend content={<ChartLegendContent payload={[]} />} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  )
}