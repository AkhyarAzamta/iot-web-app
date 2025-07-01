// lib/authorized-fetch.ts

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`
    )
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export async function authorizedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const jwt = getCookie("token");

  if (!jwt) {
    throw new Error("Not authenticated: token is missing");
  }

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${jwt}`);
  headers.set("Content-Type", "application/json");

  return fetch(input, {
    ...init,
    headers,
  });
}
