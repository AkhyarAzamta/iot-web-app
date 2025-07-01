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
      const token = getCookie("token") ; // Replace with your actual token
  const res = await fetch("http://localhost:3000/profile", {
    method: "GET",
    credentials: "include",
            headers: {
      'Authorization': `Bearer ${token}`, // Add the Authorization header
    },
  });

  if (!res.ok) {
    throw new Error("Unauthorized");
  }

  return res.json();
}
