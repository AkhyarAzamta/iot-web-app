// src/actions/get-devices.ts
import type { UsersDevice } from "@/types";

export async function getDevices(token: string): Promise<UsersDevice[]> {

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/device`,
    {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      }
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch devices: ${res.statusText}`);
  }
  const json = await res.json() as { data: Array<{ id: string; deviceName: string }> };
  return json.data.map(d => ({ id: d.id, deviceName: d.deviceName }));
}
