// components/TemperatureGauge.tsx
"use client"

import React from "react"
import dynamic from "next/dynamic"

// Non-SSR import dari react-gauge-component
const GaugeComponent = dynamic(
  () => import("react-gauge-component"),
  { ssr: false }
)

interface TemperatureGaugeProps {
  /** Nilai saat ini antara minValue dan maxValue */
  value: number
  minValue?: number
  maxValue?: number
  width?: number | string
  height?: number | string
}

export const TemperatureGauge: React.FC<TemperatureGaugeProps> = ({
  value,
  minValue = 10,
  maxValue = 35,
  width = "100%",
  height = 200,
}) => {
  return (
    <div style={{ width, height }}>
      <GaugeComponent
        type="semicircle"
        minValue={minValue}
        maxValue={maxValue}
        value={value}
        arc={{
          width: 0.2,
          padding: 0.005,
          cornerRadius: 1,
          subArcs: [
            {
              limit: 15,
              color: "#EA4228",
              showTick: true,
              tooltip: { text: "Too low temperature!" },
              onClick: () => console.log("Clicked: Too low"),
              onMouseMove: () => console.log("Hover: Too low"),
              onMouseLeave: () => console.log("Leave: Too low"),
            },
            {
              limit: 17,
              color: "#F5CD19",
              showTick: true,
              tooltip: { text: "Low temperature!" },
            },
            {
              limit: 28,
              color: "#5BE12C",
              showTick: true,
              tooltip: { text: "OK temperature!" },
            },
            {
              limit: 30,
              color: "#F5CD19",
              showTick: true,
              tooltip: { text: "High temperature!" },
            },
            {
              // last subArc covers up to maxValue
              color: "#EA4228",
              tooltip: { text: "Too high temperature!" },
            },
          ],
        }}
        pointer={{
          color: "#345243",
          length: 0.8,
          width: 15,
        }}
        labels={{
          valueLabel: {
            formatTextValue: (v: number) => v.toFixed(1) + "ºC",
          },
          tickLabels: {
            type: "outer",
            defaultTickValueConfig: {
              formatTextValue: (v: number) => v.toFixed(0) + "ºC",
              style: { fontSize: 10 },
            },
            ticks: [
              { value: minValue },
              { value: (minValue + maxValue) / 2 },
              { value: maxValue },
            ],
          },
        }}
      />
    </div>
  )
}
