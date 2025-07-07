// app/page.tsx
"use client"
import { StoreModal } from "@/components/modals/device-modal"
import { SensorDataCard } from "@/components/sensor-data"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"

export default function Page() {

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-2">
        <SensorDataCard />
      </div>
      <StoreModal />
      <ChartAreaInteractive />
      <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
    </div>
  )
}