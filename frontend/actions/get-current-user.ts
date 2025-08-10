import { getCookie } from "@/lib/get-cookie";

// actions/get-current-user.ts
export interface Device {
  id: string;
  deviceName: string;
  userId: string;
}

export interface CurrentUser {
  id: string;
  fullname: string;
  email: string;
  created_at: string;
  devices: Device[];
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const token = getCookie("token");
  if (!token) {
    throw new Error("No token found");
  }

const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
  method: "GET",
  credentials: "include",
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});


  if (res.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch user: ${res.statusText}`);
  }

  return res.json();
}
