import type { User } from "./types";

const TOKEN_KEY = "gensanpos_token";
const USER_KEY = "gensanpos_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function hasRole(user: User | null, ...roles: string[]) {
  if (!user) return false;
  const r = user.role?.trim() ?? "";
  return roles.some((role) => role.localeCompare(r, undefined, { sensitivity: "accent" }) === 0);
}
