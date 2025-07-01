// actions/get-sensor-settings.ts
import type { SensorSetting } from "@/types";
import { authorizedFetch } from "@/lib/get-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

export interface SensorSettingsResponse {
  deviceId: string;
  sensor: SensorSetting[];
}

export async function getSensorSettings(
  deviceId: string
): Promise<SensorSettingsResponse> {
  const url = `${API_BASE}/sensor/${deviceId}`;
  const res = await authorizedFetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getSensorSettings failed [${res.status}]: ${text}`);
  }

  return res.json();
}
