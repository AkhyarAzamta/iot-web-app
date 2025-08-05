"use server";

export async function signUp(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prevState: any, // Tambahkan parameter untuk previous state
  formData: FormData // Ubah menjadi FormData
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

    const response = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        fullname,
        password,
        telegramChatId: telegramChatId || null
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Signup failed');
    }

    return { success: true, message: "Signup successful!" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}