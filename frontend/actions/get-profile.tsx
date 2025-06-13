// lib/get-profile.ts
import { Users } from "@/types"

const URL = `${process.env.NEXT_PUBLIC_API_URL}/profile`

function getCookie(name: string): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`)
  )
  return match ? decodeURIComponent(match[1]) : null
}

export const getProfile = async (): Promise<Users> => {
  const token = getCookie("token")
  if (!token) {
    throw new Error("Token tidak ditemukan. Anda belum login.")
  }

  const res = await fetch(URL, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) throw new Error(`Fetch profile gagal: ${res.statusText}`)

  const json = await res.json()
  // Jika bentuknya array, kembalikan elemen pertama:
  if (Array.isArray(json)) {
    if (json.length === 0) throw new Error("Profile array kosong")
    return json[0]
  }
  // Kalau sudah object, langsung return
  return json
}
