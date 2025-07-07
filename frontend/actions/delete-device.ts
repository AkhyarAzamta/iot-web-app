
// actions/update-device.ts
import { authorizedFetch } from "@/lib/get-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

export async function deleteDevice(deviceId: string): Promise<boolean> {
  const url = `${API_BASE}/device/${deviceId}`;
  const res = await authorizedFetch(url, {
    method: "DELETE",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`deleteDevice failed [${res.status}]: ${text}`);
  }

  return true;
}