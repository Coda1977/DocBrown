import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi } from "vitest";
import { Canvas } from "./Canvas";
import type { PostItData } from "./PostItCard";
import type { Id } from "../../convex/_generated/dataModel";

// Mock PostItCard to avoid full rendering tree
vi.mock("./PostItCard", () => ({
  PostItCard: ({
    postIt,
    draggable,
  }: {
    postIt: PostItData;
    draggable?: boolean;
  }) => (
    <div data-testid={`postit-${postIt._id}`} data-draggable={draggable}>
      {postIt.text}
      {postIt.maxVotes !== undefined && (
        <span data-testid="maxVotes">{postIt.maxVotes}</span>
      )}
    </div>
  ),
}));

const defaultProps = {
  postIts: [] as PostItData[],
  clusters: [],
  editingPostIt: null,
  onStartEdit: vi.fn(),
  onSaveEdit: vi.fn(),
  onDelete: vi.fn(),
  onMove: vi.fn(),
};

function makePostIt(id: string, overrides: Partial<PostItData> = {}): PostItData {
  return {
    _id: id as Id<"postIts">,
    text: `Note ${id}`,
    positionX: 0,
    positionY: 0,
    color: "#fef9c3",
    ...overrides,
  };
}

function getZoomControls(container: HTMLElement) {
  // The zoom controls are in the last child div of the canvas
  const zoomBar = container.querySelector(
    ".absolute.bottom-4.right-4"
  ) as HTMLElement;
  const buttons = within(zoomBar).getAllByRole("button");
  const minusBtn = buttons[0]; // first button is "-"
  const plusBtn = buttons[1]; // second button is "+"
  const zoomDisplay = zoomBar.querySelector("span") as HTMLElement;
  return { minusBtn, plusBtn, zoomDisplay };
}

describe("Canvas", () => {
  test("zoom clamps between 0.3x and 3x", () => {
    const { container } = render(<Canvas {...defaultProps} />);
    const { minusBtn, plusBtn, zoomDisplay } = getZoomControls(container);

    // Use fireEvent for speed (90 clicks with userEvent is too slow)
    for (let i = 0; i < 30; i++) {
      fireEvent.click(minusBtn);
    }
    expect(zoomDisplay.textContent).toBe("30%");

    for (let i = 0; i < 60; i++) {
      fireEvent.click(plusBtn);
    }
    expect(zoomDisplay.textContent).toBe("300%");
  });

  test("zoom in button increases zoom level", async () => {
    const user = userEvent.setup();
    const { container } = render(<Canvas {...defaultProps} />);
    const { plusBtn, zoomDisplay } = getZoomControls(container);

    expect(zoomDisplay.textContent).toBe("100%");
    await user.click(plusBtn);
    const zoomValue = parseInt(zoomDisplay.textContent!.replace("%", ""));
    expect(zoomValue).toBeGreaterThan(100);
  });

  test("zoom out button decreases zoom level", async () => {
    const user = userEvent.setup();
    const { container } = render(<Canvas {...defaultProps} />);
    const { minusBtn, zoomDisplay } = getZoomControls(container);

    await user.click(minusBtn);
    const zoomValue = parseInt(zoomDisplay.textContent!.replace("%", ""));
    expect(zoomValue).toBeLessThan(100);
  });

  test("maxVotes computed from postIts vote data when activeRound present", () => {
    const postIts = [
      makePostIt("1", { voteCount: 3 }),
      makePostIt("2", { voteCount: 7 }),
      makePostIt("3", { voteCount: 1 }),
    ];
    render(
      <Canvas
        {...defaultProps}
        postIts={postIts}
        activeRound={{
          _id: "round-1" as Id<"votingRounds">,
          mode: "dot_voting",
          isRevealed: true,
        }}
      />
    );
    // maxVotes = max(3,7,1,1) = 7, all post-its should get maxVotes=7
    const maxVotesElements = screen.getAllByTestId("maxVotes");
    maxVotesElements.forEach((el) => {
      expect(el.textContent).toBe("7");
    });
  });

  test("readOnly passed through to PostItCard as draggable=false", () => {
    const postIts = [makePostIt("1")];
    render(<Canvas {...defaultProps} postIts={postIts} readOnly={true} />);
    const postItEl = screen.getByTestId("postit-1");
    expect(postItEl.getAttribute("data-draggable")).toBe("false");
  });
});
