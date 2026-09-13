import { auth } from "@/shared/config/firebaseClient"

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api"

function joinPath(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path
  }

  return `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(joinPath(path), init)

  const contentType = response.headers.get("content-type") || ""

  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null)

  if (!response.ok) {
    const details =
      typeof payload === "object" && payload && "details" in payload
        ? String((payload as { details?: unknown }).details || "")
        : ""

    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String(
            (payload as { error?: unknown }).error ||
              `Request failed (${response.status})`,
          )
        : `Request failed (${response.status})`

    throw new Error(details ? `${message}: ${details}` : message)
  }

  return payload as T
}

export async function getCurrentIdToken(forceRefresh = true): Promise<string> {
  const currentUser = auth.currentUser

  if (!currentUser) {
    throw new Error("No authenticated user")
  }

  return currentUser.getIdToken(forceRefresh)
}

export function apiUrl(path: string): string {
  return joinPath(path)
}
