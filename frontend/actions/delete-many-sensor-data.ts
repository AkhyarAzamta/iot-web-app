// actions/delete-many-sensor-data.ts
import { authorizedFetch } from "@/lib/get-cookie";

export async function deleteManySensorData(ids: number[]): Promise<{ message: string }> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL!;
  const URL = `${API_BASE}/sensordata`;

  const res = await authorizedFetch(URL, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`deleteManySensorData failed [${res.status}]: ${body}`);
  }

  return res.json();
}