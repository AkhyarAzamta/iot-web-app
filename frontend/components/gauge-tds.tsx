// components/TDSGauge.tsx
"use client"

import React from "react"
import dynamic from "next/dynamic"

// Non-SSR import dari react-gauge-component
const GaugeComponent = dynamic(
  () => import("react-gauge-component"),
  { ssr: false }
)

/** Formatter simples: 0–3000 → "xxx ppm" */
function formatPpm(value: number): string {
  return value.toFixed(0) + " ppm"
}

interface TDSGaugeProps {
  /** Nilai current TDS (ppm) */
  value: number
  /** Nilai max, default 3000 ppm */
  maxValue?: number
  /** Lebar canvas */
  width?: number | string
  /** Tinggi canvas */
  height?: number | string
}

export const TDSGauge: React.FC<TDSGaugeProps> = ({
  value,
  maxValue = 3000,
}) => {
  return (
    <div className="flex items-center justify-center">
      <GaugeComponent
        style={{ width: "100%", height: "100%" }}
        marginInPercent={0.07} // beri ruang di luar arc
        type="semicircle"
        value={value}
        minValue={0}
        maxValue={maxValue}
        arc={{
          nbSubArcs: 150,
          colorArray: ["#5BE12C", "#F5CD19", "#EA4228"],
          width: 0.3,
          padding: 0.003,
        }}
        labels={{
          // label tengah
          valueLabel: {
            style: { fontSize: 26 },
            formatTextValue: formatPpm,
          },
          // tick di luar
          tickLabels: {
            type: "outer",
            ticks: [
              { value: 0 },
              { value: 500 },
              { value: 1000 },
              { value: 1500 },
              { value: 2000 },
              { value: 2500 },
              { value: 3000 },
            ],
            defaultTickValueConfig: {
              style: { fontSize: 11 },
              formatTextValue: formatPpm,
            },
          },
        }}
      />
    </div>
  )
}
