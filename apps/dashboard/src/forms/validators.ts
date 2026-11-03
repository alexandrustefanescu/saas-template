const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mock taken emails for debounced async availability checks. */
const TAKEN_EMAILS = new Set(["taken@example.com", "admin@example.com"]);

export function required(message = "This field is required.") {
  return ({ value }: { value: unknown }) => {
    if (typeof value === "string" && value.trim().length === 0) return message;
    if (value == null || value === false) return message;
    return undefined;
  };
}

export function emailFormat(message = "Enter a valid email address.") {
  return ({ value }: { value: string }) => {
    if (!value) return undefined;
    return EMAIL_PATTERN.test(value) ? undefined : message;
  };
}

export function minLength(min: number, message?: string) {
  return ({ value }: { value: string }) => {
    if (!value) return undefined;
    return value.length >= min ? undefined : (message ?? `Must be at least ${min} characters.`);
  };
}

export function passwordsMatch(password: string, message = "Passwords do not match.") {
  return ({ value }: { value: string }) => (value === password ? undefined : message);
}

export async function checkEmailAvailable({
  value,
  signal,
}: {
  value: string;
  signal: AbortSignal;
}) {
  if (!value || !EMAIL_PATTERN.test(value)) return undefined;

  const aborted = await new Promise<boolean>((resolve) => {
    if (signal.aborted) {
      resolve(true);
      return;
    }
    const timeout = setTimeout(() => resolve(false), 450);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve(true);
      },
      { once: true },
    );
  });

  if (aborted) return undefined;

  return TAKEN_EMAILS.has(value.toLowerCase()) ? "This email is already registered." : undefined;
}

export function formatFieldErrors(errors: unknown[]): string {
  return errors
    .map((error) => {
      if (typeof error === "string") return error;
      if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
      ) {
        return error.message;
      }
      return null;
    })
    .filter((message): message is string => Boolean(message))
    .join(", ");
}
