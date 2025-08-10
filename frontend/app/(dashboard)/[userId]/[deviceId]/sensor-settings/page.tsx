"use client";

import React from "react";
import SensorSettingsTable from "@/components/sensor-settings-table";
import { SensorSettingModal } from "@/components/modals/sensor-setting-modal";

export default function SensorSettingsPage() {
  const [refreshCounter, setRefreshCounter] = React.useState(0);

  // cukup ini, tanpa setModalOpen
  const handleSaved = () => {
    setRefreshCounter((c) => c + 1);
  };

  return (
    <>
      <SensorSettingsTable refreshCounter={refreshCounter} />
      <SensorSettingModal onSaved={handleSaved} />
    </>
  );
}
