// components/TurbidityGauge.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";

// Non-SSR import dari react-gauge-component
const GaugeComponent = dynamic(
  () => import("react-gauge-component"),
  { ssr: false }
);

interface TurbidityGaugeProps {
  /** Nilai saat ini antara minValue–maxValue */
  value: number;
  /** Nilai minimal gauge */
  minValue?: number;
  /** Nilai maksimal gauge */
  maxValue?: number;
  /** Lebar dalam px atau % */
  width?: number | string;
  /** Tinggi dalam px atau % */
  height?: number | string;
}

export const TurbidityGauge: React.FC<TurbidityGaugeProps> = ({
  value,
  minValue = 0,
  maxValue = 100,
  width = "100%",
  height = 150,
}) => {
  // Pastikan value antara minValue dan maxValue
  const clamped = Math.min(Math.max(value, minValue), maxValue);

  return (
    <div style={{ width, height }}>
      <GaugeComponent
        type="semicircle"
        minValue={minValue}
        maxValue={maxValue}
        value={clamped}
        arc={{
          // Banyak subArcs untuk gradient halus
          nbSubArcs: 100,
          // Gradient dari hijau (#5BE12C) ke merah (#EA4228)
          colorArray: ["#5BE12C", "#EA4228"],
          width: 0.2,
          padding: 0.005,
          cornerRadius: 1,
        }}
        pointer={{
          color: "#345243",
          length: 0.8,
          width: 8,
        }}
        labels={{
          valueLabel: {
            formatTextValue: (v: number) => v.toFixed(1) + " %",
          },
          tickLabels: {
            type: "outer",
            defaultTickValueConfig: {
              formatTextValue: (v: number) => v.toFixed(0) + " %",
              style: { fontSize: 10 },
            },
            ticks: [
              { value: minValue },
              { value: (minValue + maxValue) / 4 },
              { value: (minValue + maxValue) / 2 },
              { value: (minValue + maxValue) * 3 / 4 },
              { value: maxValue },
            ],
          },
        }}
      />
    </div>
  );
};
