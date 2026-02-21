import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock qrcode.react
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <div data-testid="qr-code" data-value={value}>
      QR
    </div>
  ),
}));

// Mock lucide-react icons used by this component
vi.mock("lucide-react", () => ({
  X: () => <span>CloseIcon</span>,
  Copy: () => <span>CopyIcon</span>,
}));

// Must import after mocks
import { QRCodeOverlay } from "./QRCodeOverlay";

describe("QRCodeOverlay", () => {
  beforeEach(() => {
    // Mock window.location
    Object.defineProperty(window, "location", {
      value: {
        hostname: "localhost",
        host: "localhost:3000",
        origin: "http://localhost:3000",
        protocol: "http:",
      },
      writable: true,
      configurable: true,
    });

    // Mock clipboard (navigator.clipboard is read-only in jsdom)
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });

    // Reset env
    delete process.env.NEXT_PUBLIC_LOCAL_IP;
  });

  test("join URL contains /join/{code}", () => {
    const { container } = render(
      <QRCodeOverlay shortCode="ABC123" onClose={vi.fn()} />
    );
    // Find the code element containing the join URL
    const codeElements = container.querySelectorAll("code");
    const joinCode = Array.from(codeElements).find((el) =>
      el.textContent?.includes("/join/ABC123")
    );
    expect(joinCode).toBeTruthy();
  });

  test("present URL contains /present/{code}", () => {
    const { container } = render(
      <QRCodeOverlay shortCode="ABC123" onClose={vi.fn()} />
    );
    const codeElements = container.querySelectorAll("code");
    const presentCode = Array.from(codeElements).find((el) =>
      el.textContent?.includes("/present/ABC123")
    );
    expect(presentCode).toBeTruthy();
  });

  test("replaces localhost with NEXT_PUBLIC_LOCAL_IP when set", () => {
    process.env.NEXT_PUBLIC_LOCAL_IP = "192.168.1.50:3000";

    const { container } = render(
      <QRCodeOverlay shortCode="XYZ789" onClose={vi.fn()} />
    );
    const codeElements = container.querySelectorAll("code");
    const joinCode = Array.from(codeElements).find((el) =>
      el.textContent?.includes("/join/XYZ789")
    );
    expect(joinCode?.textContent).toContain("192.168.1.50:3000");
  });

  test("copy buttons exist for both URLs", () => {
    render(<QRCodeOverlay shortCode="ABC123" onClose={vi.fn()} />);
    const copyIcons = screen.getAllByText("CopyIcon");
    expect(copyIcons.length).toBeGreaterThanOrEqual(2);
  });

  test("close button calls onClose callback", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<QRCodeOverlay shortCode="ABC123" onClose={onClose} />);

    // Find the close button - it's the one containing the CloseIcon
    const closeIcon = screen.getByText("CloseIcon");
    const closeBtn = closeIcon.closest("button")!;
    expect(closeBtn).not.toBeNull();
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  test("renders QR code component", () => {
    render(<QRCodeOverlay shortCode="ABC123" onClose={vi.fn()} />);
    expect(screen.getByTestId("qr-code")).toBeInTheDocument();
  });
});
