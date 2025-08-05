"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { getSensorData, SensorData } from "@/actions/get-sensor-data" // Pastikan path sesuai
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
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
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "An interactive sensor data chart"

// Konfigurasi grafik untuk data sensor
const chartConfig = {
  temperature: {
    label: "Temperature",
    color: "var(--primary)",
  },
  turbidity: {
    label: "Turbidity",
    color: "var(--secondary)",
  },
  tds: {
    label: "TDS",
    color: "var(--accent)",
  },
  ph: {
    label: "pH",
    color: "var(--warning)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("7d")
  const [sensorData, setSensorData] = React.useState<SensorData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Fungsi untuk memetakan data sensor ke format yang digunakan grafik
  const mapSensorDataToChartData = (data: SensorData[]) => {
    return data.map(item => ({
      date: item.createdAt, // Gunakan timestamp langsung
      temperature: item.temperature,
      turbidity: item.turbidity,
      tds: item.tds,
      ph: item.ph,
    }))
  }

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Konversi timeRange ke format yang dimengerti backend
        let timeFilter: string;
        switch (timeRange) {
          case "90d":
            timeFilter = "3m";
            break;
          case "30d":
            timeFilter = "30d";
            break;
          case "7d":
          default:
            timeFilter = "7d";
        }

        const result = await getSensorData({
          time_filter: timeFilter,
          // Tambahkan parameter lain jika diperlukan, misal device_id
        })
        setSensorData(result.data)
} catch (err) {
  console.error("Failed to fetch sensor data", err)
  
  let errorMessage = "Failed to load data. Please try again later."
  if (err instanceof Error) {
    errorMessage = err.message
  } else if (typeof err === "string") {
    errorMessage = err
  }
  
  setError(errorMessage)
} finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [timeRange])

  const chartData = mapSensorDataToChartData(sensorData)

  // Jika loading, tampilkan loading state
  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Sensor Data</CardTitle>
          <CardDescription>Loading data...</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading sensor data...</div>
        </CardContent>
      </Card>
    )
  }

  // Jika error, tampilkan pesan error
  if (error) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle>Sensor Data</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <div className="text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Sensor Data</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Real-time sensor measurements
          </span>
          <span className="@[540px]/card:hidden">Sensor readings</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select time range"
            >
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillTemperature" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-temperature)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-temperature)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillTurbidity" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-turbidity)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-turbidity)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillTds" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-tds)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-tds)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillPh" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-ph)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-ph)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
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
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : 10}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="temperature"
              type="natural"
              fill="url(#fillTemperature)"
              stroke="var(--color-temperature)"
              stackId="a"
            />
            <Area
              dataKey="turbidity"
              type="natural"
              fill="url(#fillTurbidity)"
              stroke="var(--color-turbidity)"
              stackId="a"
            />
            <Area
              dataKey="tds"
              type="natural"
              fill="url(#fillTds)"
              stroke="var(--color-tds)"
              stackId="a"
            />
            <Area
              dataKey="ph"
              type="natural"
              fill="url(#fillPh)"
              stroke="var(--color-ph)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}