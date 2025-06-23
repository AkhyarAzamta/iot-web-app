"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = () => {
    // 1. Hapus cookie 'token' dengan cara set expiry di masa lalu
    document.cookie = [
      `token=`,
      `Path=/`,
      `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      // kalau kamu pakai Secure/SameSite saat set sebelumnya, ulangi juga:
      `Secure`,
      `SameSite=Lax`,
    ].join("; ")

    // 2. Redirect ke halaman login
    router.push("/login")
  }

  return (
    <Button variant="outline" onClick={handleLogout}>
      Logout
    </Button>
  )
}
