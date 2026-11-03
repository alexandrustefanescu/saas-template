import { describe, expect, it, vi } from "vite-plus/test";
import {
  checkEmailAvailable,
  emailFormat,
  formatFieldErrors,
  minLength,
  passwordsMatch,
  required,
} from "./validators";

describe("required", () => {
  it("rejects empty strings and false values", () => {
    const validate = required("Required.");
    expect(validate({ value: "" })).toBe("Required.");
    expect(validate({ value: "   " })).toBe("Required.");
    expect(validate({ value: false })).toBe("Required.");
    expect(validate({ value: null })).toBe("Required.");
  });

  it("accepts non-empty values", () => {
    expect(required()({ value: "ok" })).toBeUndefined();
    expect(required()({ value: true })).toBeUndefined();
  });
});

describe("emailFormat", () => {
  it("skips empty values", () => {
    expect(emailFormat()({ value: "" })).toBeUndefined();
  });

  it("rejects invalid emails", () => {
    expect(emailFormat()({ value: "not-an-email" })).toBe("Enter a valid email address.");
  });

  it("accepts valid emails", () => {
    expect(emailFormat()({ value: "devon@example.com" })).toBeUndefined();
  });
});

describe("minLength", () => {
  it("enforces a minimum length", () => {
    expect(minLength(8)({ value: "short" })).toBe("Must be at least 8 characters.");
    expect(minLength(8)({ value: "longenough" })).toBeUndefined();
  });
});

describe("passwordsMatch", () => {
  it("requires matching passwords", () => {
    expect(passwordsMatch("secret")({ value: "other" })).toBe("Passwords do not match.");
    expect(passwordsMatch("secret")({ value: "secret" })).toBeUndefined();
  });
});

describe("checkEmailAvailable", () => {
  it("reports taken emails after the mock delay", async () => {
    vi.useFakeTimers();
    const promise = checkEmailAvailable({
      value: "taken@example.com",
      signal: new AbortController().signal,
    });
    await vi.advanceTimersByTimeAsync(450);
    await expect(promise).resolves.toBe("This email is already registered.");
    vi.useRealTimers();
  });

  it("returns undefined when aborted", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const promise = checkEmailAvailable({
      value: "taken@example.com",
      signal: controller.signal,
    });
    controller.abort();
    await expect(promise).resolves.toBeUndefined();
    vi.useRealTimers();
  });
});

describe("formatFieldErrors", () => {
  it("joins string and message-shaped errors", () => {
    expect(formatFieldErrors(["One", { message: "Two" }, { message: 3 }, null])).toBe("One, Two");
  });
});
