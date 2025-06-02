import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Konfigurasi lain jika ada...
  // Misal: reactStrictMode: true

  // Tambahkan matcher jika ingin membatasi akses menggunakan middleware
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb', // or any other valid SizeLimit value
      allowedOrigins: ['http://localhost:3000'], // or any other valid string[]
    },
  },
  // Note: Middleware matcher tidak diset di file ini, tapi di middleware.ts langsung.
};

export default nextConfig;
