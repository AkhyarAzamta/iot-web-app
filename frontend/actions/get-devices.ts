// src/actions/get-devices.ts
import type { UsersDevice } from "@/types";
import { authorizedFetch } from "@/lib/get-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;
const URL = `${API_BASE}/device`;

export async function getDevices(): Promise<UsersDevice[]> {
  const res = await authorizedFetch(URL);

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`getDevices failed [${res.status}]: ${body}`);
  }

  const payload = (await res.json()) as {
    data: Array<{ id: string; deviceName: string }>;
  };

  return payload.data.map(d => ({
    id: d.id,
    deviceName: d.deviceName,
  }));
}
