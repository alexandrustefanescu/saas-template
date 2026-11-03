const configuredBaseUrl = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${configuredBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = response.statusText || "Request failed.";
    try {
      const body = (await response.json()) as { message?: unknown; error?: unknown };
      if (typeof body.error === "string" && body.error.trim()) {
        message = body.error;
      } else if (typeof body.message === "string" && body.message.trim()) {
        message = body.message;
      }
    } catch {
      // The API sometimes returns an empty error body.
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
