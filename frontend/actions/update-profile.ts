// /actions/update-profile.ts
"use server";

import { cookies } from 'next/headers';

interface UpdateProfileData {
  fullname: string;
  email: string;
  telegramChatId?: number;
}

interface ApiResponse {
  success: boolean;
  message: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL!;

export async function updateProfile(data: UpdateProfileData): Promise<ApiResponse> {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get('token')?.value;
    
    if (!token) {
      throw new Error("Not authenticated: token is missing");
    }

    const response = await fetch(`${API_BASE}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}` // Gunakan token dari cookie server
      },
      body: JSON.stringify({
        fullname: data.fullname,
        email: data.email,
        telegramChatId: data.telegramChatId,
      }),
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Unexpected response: ${text.slice(0, 100)}`);
    }

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || "Failed to update profile");
    }

    return { success: true, message: "Profile updated successfully" };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    return { success: false, message };
  }
}

export async function changePassword(
  currentPassword: string, 
  newPassword: string
): Promise<ApiResponse> {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get('token')?.value;
    if (!token) {
      throw new Error("No token found");
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      }),
    });

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Unexpected response: ${text.slice(0, 100)}`);
    }

    const result = await response.json();
    const message = result.message || result.error;
    const success = result.success !== undefined ? result.success : response.ok;
    return { success: success, message: message};
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to change password";
    return { success: false, message };
  }
}