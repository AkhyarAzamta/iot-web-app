// Hapus: import { revalidatePath } from "next/cache"

interface CreateDeviceParams {
  token: string
  deviceName: string
}

export async function createDevice({ token, deviceName }: CreateDeviceParams): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/device`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ deviceName }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to create device: ${res.status} - ${errorText}`)
  }

  // Hapus: revalidatePath("/devices")
}
