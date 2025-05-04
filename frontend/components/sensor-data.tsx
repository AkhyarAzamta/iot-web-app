"use client"
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"

import {
  Card,
  CardContent
} from "@/components/ui/card"
import { ChartConfig, ChartContainer } from "@/components/ui/chart"
import { useEffect, useState } from "react"
// const chartData = [
//   { browser: "safari", visitors: 200, fill: "var(--color-safari)" },
// ]
import socket from "@/utils/socket";

type Sensor = { distance_cm: number; distance_inch: number };

const chartConfig = {
  visitors: {
    label: "PPH",
  },
  safari: {
    label: "Safari",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

interface ChartDataItem {
  visitors: number;
}

export function SensorData() {
    const [sensor, setSensor] = useState<Sensor>({ distance_cm: 0, distance_inch: 0 });
    const [chartData, setChartData] = useState<ChartDataItem[]>([]);

    useEffect(() => {
      socket.connect();
  
      socket.on("connect", () => {
        console.log("✅ Socket connected:", socket.id);
      });
  
      socket.on("connect_error", (err) => {
        console.error("❌ Socket error:", err);
      });
  
      socket.on("sensor_data", (data: Sensor) => {
        console.log("🌡️ sensor_data →", data);
        setSensor(data);
        setChartData([{visitors: data.distance_cm}])
      });
  
      return () => {
        socket.off("sensor_data");
        socket.disconnect();
      };
    }, []);
  return (
    <Card className="flex flex-col">
      <CardContent className="flex-2 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadialBarChart
            data={chartData}
            startAngle={0}
            endAngle={sensor.distance_cm}
            innerRadius={80}
            outerRadius={110}
          >
            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[86, 74]}
            />
            <RadialBar dataKey="visitors" background cornerRadius={10} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-4xl font-bold"
                        >
{chartData.length > 0 ? chartData[0].visitors : 0}
</tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          PPH
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
