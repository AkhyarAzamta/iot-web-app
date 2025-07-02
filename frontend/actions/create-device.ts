// src/actions/create-device.ts
import { authorizedFetch } from "@/lib/get-cookie";

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;
const URL = `${API_BASE}/device`;

// Ubah di sini:
export async function createDevice(deviceName: string): Promise<{ id: string; deviceName: string }> {
  const res = await authorizedFetch(URL, {
    method: "POST",
    body: JSON.stringify({ deviceName }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create device: ${res.status} - ${errorText}`);
  }

  return await res.json(); // ini sekarang cocok dengan return type
}
