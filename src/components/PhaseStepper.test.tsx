import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi } from "vitest";
import { PhaseStepper } from "./PhaseStepper";

describe("PhaseStepper", () => {
  test("renders all 4 phase labels", () => {
    render(<PhaseStepper currentPhase="collect" />);
    expect(screen.getByText("Collect")).toBeInTheDocument();
    expect(screen.getByText("Organize")).toBeInTheDocument();
    expect(screen.getByText("Vote")).toBeInTheDocument();
    expect(screen.getByText("Results")).toBeInTheDocument();
  });

  test("active phase has highlighted styling", () => {
    render(<PhaseStepper currentPhase="organize" />);
    const organizeBtn = screen.getByText("Organize");
    // Active phase gets bg-teal-400 + text-white
    expect(organizeBtn.className).toContain("bg-teal-400");
    expect(organizeBtn.className).toContain("text-white");
  });

  test("past phases are clickable, trigger onRevert", async () => {
    const user = userEvent.setup();
    const onRevert = vi.fn();
    render(
      <PhaseStepper
        currentPhase="vote"
        onRevert={onRevert}
        onAdvance={vi.fn()}
      />
    );
    // Collect and Organize are past phases
    await user.click(screen.getByText("Collect"));
    expect(onRevert).toHaveBeenCalledWith("collect");
    await user.click(screen.getByText("Organize"));
    expect(onRevert).toHaveBeenCalledWith("organize");
  });

  test("far-future phases are disabled", () => {
    render(<PhaseStepper currentPhase="collect" />);
    // Vote and Results are far-future (not next)
    const voteBtn = screen.getByText("Vote");
    expect(voteBtn).toBeDisabled();
    const resultsBtn = screen.getByText("Results");
    expect(resultsBtn).toBeDisabled();
  });

  test("next phase button triggers onAdvance", async () => {
    const user = userEvent.setup();
    const onAdvance = vi.fn();
    render(
      <PhaseStepper
        currentPhase="collect"
        onAdvance={onAdvance}
        onRevert={vi.fn()}
      />
    );
    // Organize is the next phase
    await user.click(screen.getByText("Organize"));
    expect(onAdvance).toHaveBeenCalled();
  });
});
