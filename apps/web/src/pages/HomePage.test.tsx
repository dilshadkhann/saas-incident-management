import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import HomePage from "./HomePage";

describe("HomePage", () => {
  it("renders the main hero heading", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { name: /incidents happen/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/stay in control/i)).toBeInTheDocument();
  });

  it("provides working sign-in and registration links", () => {
    render(<HomePage />);
    const registerLinks = screen.getAllByRole("link", {
      name: /get started|create your workspace|create your workspace/i,
    });
    expect(registerLinks.length).toBeGreaterThan(0);
    expect(registerLinks.every((link) => link.getAttribute("href") === "/register")).toBe(true);

    const signInLinks = screen.getAllByRole("link", { name: /sign in/i });
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signInLinks.every((link) => link.getAttribute("href") === "/login")).toBe(true);
  });

  it("renders the platform feature sections", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /incident management/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /service health/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /audit history/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /team collaboration/i })).toBeInTheDocument();
  });

  it("renders the incident workflow and security sections", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /from first signal to resolution/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /structure your workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/role-based permissions/i)).toBeInTheDocument();
  });

  it("labels the dashboard preview as illustrative", () => {
    render(<HomePage />);
    expect(screen.getByText(/sample data, not live system information/i)).toBeInTheDocument();
  });

  it("allows switching the dashboard preview tabs", async () => {
    render(<HomePage />);
    const preview = screen.getByText("Workspace activity").closest(".home-preview-panel");
    expect(preview).not.toBeNull();
    const scoped = within(preview as HTMLElement);
    fireEvent.click(scoped.getByRole("button", { name: "Services" }));
    fireEvent.click(scoped.getByRole("button", { name: "Incidents" }));
    expect(scoped.getByText("Payment latency")).toBeInTheDocument();
  });
});