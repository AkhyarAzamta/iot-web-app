// actions/update-device.ts
import { authorizedFetch } from "@/lib/get-cookie";
import type { UsersDevice } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

export interface UpdateDeviceParams {
  deviceId: string;
  deviceName: string;
}

export async function updateDevice({ deviceId, deviceName }: UpdateDeviceParams): Promise<UsersDevice> {
  const url = `${API_BASE}/device/${deviceId}`;
  const res = await authorizedFetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ deviceName }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`updateDevice failed [${res.status}]: ${text}`);
  }

  return res.json();
}
