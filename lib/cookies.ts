export function setCookie(name: string, value: string, days = 7): void {
  if (typeof document === "undefined") {
    return;
  }

  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);

  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value,
  )}; expires=${date.toUTCString()}; path=/`;
}

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const target = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(";");

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(target)) {
      return decodeURIComponent(trimmed.slice(target.length));
    }
  }

  return null;
}

export function deleteCookie(name: string): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${encodeURIComponent(
    name,
  )}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
}
