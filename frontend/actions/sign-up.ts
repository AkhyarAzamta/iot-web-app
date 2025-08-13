/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

export async function signUp(
  prevState: any,
  formData: FormData
) {
  try {
    // Ekstrak data dari FormData
    const email = formData.get("email") as string;
    const fullname = formData.get("fullname") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const telegramChatId = formData.get("telegramChatId") as string | null;

    // Validasi konfirmasi password
    if (password !== confirmPassword) {
      return { success: false, message: "Passwords do not match" };
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        fullname,
        password,
        telegramChatId: telegramChatId || null
      }),
    });

    // Tangani response non-JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      return { 
        success: false, 
        message: text || `Error ${response.status}: ${response.statusText}` 
      };
    }

    const data = await response.json();
    
    if (!response.ok) {
      // Prioritaskan pesan error dari properti 'error'
      return { 
        success: false, 
        message: data.error || data.message || `Signup failed (${response.status})` 
      };
    }

    return { success: true, message: "Signup successful!" };
  } catch (error: any) {
    return { 
      success: false, 
      message: error.message || "An unexpected error occurred" 
    };
  }
}