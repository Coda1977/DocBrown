import { render, screen, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { TimerDisplay } from "./TimerDisplay";

describe("TimerDisplay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("displays time in MM:SS format", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    render(
      <TimerDisplay timerSeconds={150} timerStartedAt={now} />
    );
    expect(screen.getByText("2:30")).toBeInTheDocument();
  });

  test("seconds are zero-padded", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    render(
      <TimerDisplay timerSeconds={65} timerStartedAt={now} />
    );
    expect(screen.getByText("1:05")).toBeInTheDocument();
  });

  test("adds pulse animation class when remaining <= 10 seconds", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const { container } = render(
      <TimerDisplay timerSeconds={8} timerStartedAt={now} />
    );
    const timerEl = container.firstElementChild as HTMLElement;
    expect(timerEl.className).toContain("animate-pulse");
  });

  test("shows Time's up! when timer reaches 0", () => {
    const now = Date.now();
    // Started 60s ago with 60s timer = expired
    vi.setSystemTime(now);
    render(
      <TimerDisplay timerSeconds={60} timerStartedAt={now - 60000} />
    );
    expect(screen.getByText("Time's up!")).toBeInTheDocument();
  });

  test("calls onExpire callback when timer reaches 0", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const onExpire = vi.fn();

    render(
      <TimerDisplay timerSeconds={1} timerStartedAt={now} onExpire={onExpire} />
    );

    // Advance time past the timer
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(onExpire).toHaveBeenCalled();
  });

  test("color shifts from teal to coral as time decreases", () => {
    const now = Date.now();
    vi.setSystemTime(now);

    // Plenty of time: teal
    const { container, unmount } = render(
      <TimerDisplay timerSeconds={120} timerStartedAt={now} />
    );
    const timerEl = container.firstElementChild as HTMLElement;
    expect(timerEl.className).toContain("text-teal-700");
    unmount();

    // Low time: coral/red
    const { container: container2 } = render(
      <TimerDisplay timerSeconds={5} timerStartedAt={now} />
    );
    const timerEl2 = container2.firstElementChild as HTMLElement;
    expect(timerEl2.className).toContain("text-red-600");
  });
});
