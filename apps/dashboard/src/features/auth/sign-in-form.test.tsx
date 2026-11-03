import { describe, expect, it, vi } from "vite-plus/test";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "#/test/render";
import { SignInForm } from "./sign-in-form";

describe("SignInForm", () => {
  it("renders accessible fields by label and role", () => {
    renderWithProviders(<SignInForm />);

    expect(screen.getByRole("textbox", { name: "Email address" })).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Remember me" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Google" })).toBeInTheDocument();
  });

  it("shows validation errors for empty submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText("Email is required.")).toBeInTheDocument();
    });
    expect(screen.getByText("Password is required.")).toBeInTheDocument();
  });

  it("submits valid credentials via user interactions", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(<SignInForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole("textbox", { name: "Email address" }), "devon@example.com");
    await user.type(screen.getByLabelText("Password"), "Pas$w0rd");
    await user.click(screen.getByRole("checkbox", { name: "Remember me" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    });

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: "devon@example.com",
        password: "Pas$w0rd",
        rememberMe: true,
      });
    });
  });

  it("can be queried by test ids when labels collide", () => {
    renderWithProviders(<SignInForm />);

    expect(screen.getByTestId("sign-in-email")).toBeInTheDocument();
    expect(screen.getByTestId("sign-in-password")).toBeInTheDocument();
    expect(screen.getByTestId("sign-in-remember-me")).toBeInTheDocument();
  });
});
