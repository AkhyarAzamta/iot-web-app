// "use server";

// import { getCookie } from "@/lib/get-cookie";

// interface UserProfile {
//   id: string;
//   fullname: string;
//   email: string;
//   telegramChatId?: string | null;
// }

// export async function getUserProfile(): Promise<UserProfile | null> {
//   try {
//     const token = getCookie("token");
//     if (!token) {
//       throw new Error("No token found");
//     }

//     const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
//       method: "GET",
//       credentials: "include",
//       headers: {
//         'Authorization': `Bearer ${token}`,
//       },
//     });

//     if (!response.ok) {
//       throw new Error(`Failed to fetch profile: ${response.statusText}`);
//     }

//     const userData = await response.json();
    
//     return {
//       ...userData,
//       telegramChatId: userData.telegramChatId?.toString() || null,
//     };
//   } catch (error) {
//     console.error("Failed to fetch user profile:", error);
//     return null;
//   }
// }