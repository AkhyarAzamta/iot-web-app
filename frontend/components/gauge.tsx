// components/gauge.tsx
import React from "react"
import dynamic from "next/dynamic"

const GaugeComponent = dynamic(
  () => import("react-gauge-component"),
  { ssr: false }
)

interface TemperatureGaugeProps {
  value: number
  globalMin?: number
  globalMax?: number
  apiMin: number
  apiMax: number
  width?: number | string
  height?: number | string
}

export const TemperatureGauge: React.FC<TemperatureGaugeProps> = ({
  value,
  globalMin = 15,
  globalMax = 35,
  apiMin,
  apiMax,
}) => {
  // Fungsi untuk memformat angka dengan 1 desimal - HARUS DITARUH DI ATAS
  const formatTemp = (temp: number) => `${temp.toFixed(1)}ºC`

  const clamp = (val: number) => Math.max(globalMin, Math.min(globalMax, val))

  const safeOffset = Math.min(1, (apiMax - apiMin) / 3)
  
  const b0 = globalMin
  const b1 = clamp(apiMin)
  const b2 = clamp(apiMin + safeOffset)
  const b3 = clamp(apiMax - safeOffset)
  const b4 = clamp(apiMax)
  const b5 = globalMax

  const uniqueLimits = Array.from(
    new Set([b0, b1, b2, b3, b4, b5])
  ).sort((a, b) => a - b)

  const colors = [
    "#EA4228",
    "#F5CD19",
    "#5BE12C",
    "#F5CD19",
    "#EA4228"
  ]

  const subArcs = []
  for (let i = 1; i < uniqueLimits.length; i++) {
    const prev = uniqueLimits[i - 1]
    const current = uniqueLimits[i]
    
    let colorIdx = 0
    if (current <= b1) colorIdx = 0
    else if (current <= b2) colorIdx = 1
    else if (current <= b3) colorIdx = 2
    else if (current <= b4) colorIdx = 3
    else colorIdx = 4

    subArcs.push({
      limit: current,
      color: colors[colorIdx],
      showTick: true,
      tooltip: {
        text: getTooltipText(prev, current)
      }
    })
  }

  function getTooltipText(prev: number, current: number) {
    if (current <= b1) return `Too low (<${formatTemp(b1)})`
    if (prev === b1 && current === b2) return `Low (${formatTemp(b1)}-${formatTemp(b2)})`
    if (prev === b2 && current === b3) return `OK (${formatTemp(b2)}-${formatTemp(b3)})`
    if (prev === b3 && current === b4) return `High (${formatTemp(b3)}-${formatTemp(b4)})`
    if (prev === b4) return `Too high (>${formatTemp(b4)})`
    return `${formatTemp(prev)}-${formatTemp(current)}`
  }

  return (
    <div >
      <GaugeComponent
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
              formatTextValue: (v) => `${v.toFixed(0)}ºC`, 
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
  )
}