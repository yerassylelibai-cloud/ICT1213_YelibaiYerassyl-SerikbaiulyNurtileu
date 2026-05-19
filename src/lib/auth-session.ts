export type AuthUser = {
  id: string;
  username: string;
};

const AUTH_STORAGE_KEY = "ka_auth_user";

export function loadAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.id || !parsed.username) return null;
    return { id: parsed.id, username: parsed.username };
  } catch {
    return null;
  }
}

export function saveAuthUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function clearAuthUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
