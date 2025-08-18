// lib/get-profile.ts
"use server";
import { cookies } from 'next/headers';
import { Users } from "@/types";

const URL = `${process.env.NEXT_PUBLIC_API_URL}/profile`;

export const getProfile = async (): Promise<Users> => {
  // Baca token dari cookies pada server-side
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) {
    throw new Error("Token tidak ditemukan. Anda belum login.");
  }

  const res = await fetch(URL, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Fetch profile gagal: ${res.statusText}`);
  }

  const json = await res.json();
  // Jika respon array, ambil elemen pertama
  if (Array.isArray(json)) {
    if (json.length === 0) {
      throw new Error("Profile array kosong");
    }
    return json[0];
  }
  return json;
};
  