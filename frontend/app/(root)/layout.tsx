// app/(setup)/layout.tsx
import { getCookie } from "@/lib/get-cookie";
import { redirect } from "next/navigation";

export default async function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Baca JWT token dari cookie
  const token = getCookie("token");
  if (!token) {
    redirect("/login");
  }

  // 2. Panggil backend untuk cek all devices milik user
  const res = await fetch("http://localhost:3000/device", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  // 3. Kalau unauthorized, kirim balik ke login
  if (res.status === 401) {
    redirect("/login");
  }

  // 4. Ambil data device (anggapnya backend return array)
  const devices: { id: string; deviceName?: string }[] = await res.json();

  // 5. Kalau sudah punya minimal satu device, redirect ke halaman device pertama
  if (devices.length > 0) {
    const firstId = devices[0].id;
    redirect(`/device/${firstId}`);
  }

  // 6. Kalau belum punya device, render children (form buat device baru)
  return <>{children}</>;
}
