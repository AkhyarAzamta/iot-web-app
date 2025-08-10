// components/TurbidityGauge.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";

const GaugeComponent = dynamic(
  () => import("react-gauge-component"),
  { ssr: false }
);

interface TurbidityGaugeProps {
  value: number;
  width?: number | string;
  height?: number | string;
}

export const TurbidityGauge: React.FC<TurbidityGaugeProps> = ({
  value,
}) => {
  const minValue = 0;
  const maxValue = 100;
  
  // Pastikan value antara 0 dan 100
  const clamped = Math.min(Math.max(value, minValue), maxValue);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <GaugeComponent
        marginInPercent={0.07} // beri ruang di luar arc
        style={{ width: "100%", height: "100%" }}
        type="semicircle"
        minValue={minValue}
        maxValue={maxValue}
        value={clamped}
        arc={{
          nbSubArcs: 100,
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
              { value: 25 },
              { value: 50 },
              { value: 75 },
              { value: maxValue },
            ],
          },
        }}
      />
    </div>
  );
};