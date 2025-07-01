// app/page.tsx
"use client"
import React from "react"
import { ChartLineDotsCustom } from "@/components/chart"
import { StoreModal } from "@/components/modals/device-modal"
import { SensorDataCard } from "@/components/sensor-data"

export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-2">
        <SensorDataCard />
      </div>
      <StoreModal />
      <ChartLineDotsCustom />
      <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
    </div>
  )
}