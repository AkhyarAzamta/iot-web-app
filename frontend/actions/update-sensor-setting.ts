// src/actions/update-sensor-setting.ts
import { authorizedFetch } from "@/lib/get-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

// payload berisi { id, type, deviceId, minValue, maxValue, enabled }
export async function updateSensorSetting(payload: {
  id: number;
  type: string;
  deviceId: string;
  minValue: number;
  maxValue: number;
  enabled: boolean;
}): Promise<void> {
  const { type, deviceId, minValue, maxValue, enabled } = payload;
  const url = `${API_BASE}/sensor/${type}`;
  const res = await authorizedFetch(url, {
    method: "PATCH",
    body: JSON.stringify({ deviceId, minValue, maxValue, enabled }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update failed: ${res.status} – ${text}`);
  }
}
