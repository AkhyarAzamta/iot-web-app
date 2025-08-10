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
  /** nilai pH biasanya antara minValue–maxValue */
  value: number;
  minValue?: number;
  maxValue?: number;
  width?: number | string;
  height?: number | string;
}

export const PHGauge: React.FC<PHGaugeProps> = ({
  value,
  minValue = 0,
  maxValue = 14,
}) => {
  // clamp value sesuai range
  const clamped = Math.min(Math.max(value, minValue), maxValue);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <GaugeComponent
        marginInPercent={0.07} // beri ruang di luar arc
        style={{ width: "100%", height: "100%" }}
        type="radial"
        minValue={minValue}
        maxValue={maxValue}
        value={clamped}
        labels={{
          tickLabels: {
            type: "inner",
            defaultTickValueConfig: {
              formatTextValue: (v: number) => v.toFixed(1),
              style: { fontSize: 12 },
            },
            // contoh ticks: 2-point increments
            ticks: [
              { value: minValue },
              { value: minValue + (maxValue - minValue) * 0.25 },
              { value: minValue + (maxValue - minValue) * 0.5 },
              { value: minValue + (maxValue - minValue) * 0.75 },
              { value: maxValue },
            ],
          },
        }}
        arc={{
          colorArray: ["#5BE12C", "#EA4228"],
          subArcs: [
            { limit: minValue + (maxValue - minValue) * 0.1 },
            { limit: minValue + (maxValue - minValue) * 0.3 },
            {},
            {},
            {},
          ],
          padding: 0.02,
          width: 0.3,
        }}
        pointer={{
          elastic: true,
          animationDelay: 0,
        }}
      />
    </div>
  );
};
