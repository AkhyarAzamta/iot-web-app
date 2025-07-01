// app/(dashboard)/[userId]/[deviceId]/sensor-settings/page.tsx
"use client";

import React from "react";
import SensorSettingsTable from "@/components/sensor-settings-table";
import { useStoreDevice } from "@/hooks/use-store-modal";

export default function SensorSettingsPage() {
  const activeDevice = useStoreDevice((s) => s.activeDevice);

  // Kalau belum ada device terpilih
  if (!activeDevice) {
    return <div>Please select a device to view its settings.</div>;
  }

  return <SensorSettingsTable />;
}
