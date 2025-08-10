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
  
  // Pastikan value antara 0 dan 100

  return (
    <div className="w-full h-full flex items-center justify-center">
<GaugeComponent
  type="semicircle"
  arc={{
    colorArray: ['#00FF15', '#FF2121'],
    padding: 0.02,
    subArcs:
      [
        { limit: 40 },
        { limit: 60 },
        { limit: 70 },
      ]
  }}
  pointer={{type: "blob", animationDelay: 0 }}
  value={value}
/>
    </div>
  );
};