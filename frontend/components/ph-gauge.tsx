// components/PHGauge.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";

// import gauge tanpa SSR
const GaugeComponent = dynamic(
  () => import("react-gauge-component"),
  { ssr: false }
);

interface PHGaugeProps {
  value: number
  globalMin?: number
  globalMax?: number
  apiMin: number
  apiMax: number
  width?: number | string
  height?: number | string
}

export const PHGauge: React.FC<PHGaugeProps> = ({
  value,
  globalMin = 0,
  globalMax = 14,
  apiMin,
  apiMax,
}) => {
  // Fungsi untuk memformat angka dengan 1 desimal - HARUS DITARUH DI ATAS
  const formatTemp = (temp: number) => `${temp.toFixed(1)}`

  const clamp = (val: number) => Math.max(globalMin, Math.min(globalMax, val))

const safeOffset = Math.min(1, (apiMax - apiMin) / 3)
const bLow = clamp(apiMin - safeOffset)
const bOKStart = clamp(apiMin)
const bOKEnd = clamp(apiMax)
const bHigh = clamp(apiMax + safeOffset)

const limits = [globalMin, bLow, bOKStart, bOKEnd, bHigh, globalMax]

const subArcs = []

for (let i = 1; i < limits.length; i++) {
  const prev = limits[i - 1]
  const current = limits[i]

  let color = ""
  if (current <= bLow) color = "#EA4228" // Too low
  else if (prev >= bLow && current <= bOKStart) color = "#F5CD19" // Low
  else if (prev >= bOKStart && current <= bOKEnd) color = "#5BE12C" // OK
  else if (prev >= bOKEnd && current <= bHigh) color = "#F5CD19" // High
  else color = "#EA4228" // Too high

  subArcs.push({
    limit: current,
    color,
    showTick: true,
    tooltip: {
      text: getTooltipText(prev, current)
    }
  })
}
function getTooltipText(prev: number, current: number) {
  if (current <= bLow) return `Too low (<${formatTemp(apiMin)})`
  if (prev >= bLow && current <= bOKStart) return `Low (${formatTemp(bLow)}–${formatTemp(bOKStart)})`
  if (prev >= bOKStart && current <= bOKEnd) return `OK (${formatTemp(bOKStart)}–${formatTemp(bOKEnd)})`
  if (prev >= bOKEnd && current <= bHigh) return `High (${formatTemp(bOKEnd)}–${formatTemp(bHigh)})`
  return `Too high (> ${formatTemp(apiMax)})`
}
  return (
    <div className="flex items-center justify-center">
      <GaugeComponent
        marginInPercent={0.07} // beri ruang di luar arc
        type="semicircle"
        minValue={globalMin}
        maxValue={globalMax}
        value={value}
        arc={{ 
          width: 0.2, 
          padding: 0.005, 
          cornerRadius: 1, 
          subArcs 
        }}
        pointer={{ 
          color: "#345243", 
          length: 0.8, 
          width: 15 
        }}
        labels={{
          valueLabel: { 
            formatTextValue: (v) => formatTemp(v)
          },
          tickLabels: {
            type: "outer",
            defaultTickValueConfig: {
              formatTextValue: (v) => `${v.toFixed(1)}`, 
              style: { fontSize: 12 }
            },
            ticks: [
              { value: globalMin },
              { value: globalMax }
            ]
          }
        }}
      />
    </div>
  );
};
