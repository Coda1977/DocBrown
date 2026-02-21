import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi } from "vitest";
import { PostItCard, type PostItData } from "./PostItCard";
import type { Id } from "../../convex/_generated/dataModel";

function makePostIt(overrides: Partial<PostItData> = {}): PostItData {
  return {
    _id: "test-id" as Id<"postIts">,
    text: "Hello world",
    positionX: 0,
    positionY: 0,
    color: "#fef9c3",
    ...overrides,
  };
}

describe("PostItCard", () => {
  test("renders text content", () => {
    render(<PostItCard postIt={makePostIt({ text: "My note" })} />);
    expect(screen.getByText("My note")).toBeInTheDocument();
  });

  test("heatmap glow opacity: 0 when maxVotes=0", () => {
    const { container } = render(
      <PostItCard postIt={makePostIt({ voteCount: 3, maxVotes: 0 })} />
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.boxShadow).toBe("");
  });

  test("heatmap glow proportional when votes > 0", () => {
    const { container } = render(
      <PostItCard postIt={makePostIt({ voteCount: 5, maxVotes: 10 })} />
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.boxShadow).not.toBe("");
    expect(card.style.boxShadow).toContain("rgba(20, 168, 138");
  });

  test("shows vote badge when votes > 0", () => {
    render(<PostItCard postIt={makePostIt({ voteCount: 7 })} />);
    expect(screen.getByText("7 pts")).toBeInTheDocument();
  });

  test("double-click calls onStartEdit", () => {
    const onStartEdit = vi.fn();
    const { container } = render(
      <PostItCard
        postIt={makePostIt()}
        onStartEdit={onStartEdit}
        onSaveEdit={vi.fn()}
      />
    );
    // fireEvent.doubleClick on the card div (which has onDoubleClick)
    fireEvent.doubleClick(container.firstElementChild!);
    expect(onStartEdit).toHaveBeenCalled();
  });

  test("Enter key saves edited text and exits edit mode", async () => {
    const user = userEvent.setup();
    const onSaveEdit = vi.fn();
    render(
      <PostItCard
        postIt={makePostIt({ text: "Original" })}
        isEditing={true}
        onSaveEdit={onSaveEdit}
      />
    );
    const textarea = screen.getByRole("textbox");
    await user.clear(textarea);
    await user.type(textarea, "Updated{Enter}");
    expect(onSaveEdit).toHaveBeenCalledWith("Updated");
  });

  test("Escape key cancels edit and restores original text", () => {
    const onSaveEdit = vi.fn();
    render(
      <PostItCard
        postIt={makePostIt({ text: "Original" })}
        isEditing={true}
        onSaveEdit={onSaveEdit}
      />
    );
    const textarea = screen.getByRole("textbox");
    // Simulate typing then Escape
    fireEvent.change(textarea, { target: { value: "Changed" } });
    fireEvent.keyDown(textarea, { key: "Escape" });
    // On Escape, it restores original and calls onSaveEdit with original
    expect(onSaveEdit).toHaveBeenCalledWith("Original");
  });

  test("Delete button calls onDelete callback", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <PostItCard
        postIt={makePostIt()}
        isEditing={true}
        onDelete={onDelete}
        onSaveEdit={vi.fn()}
      />
    );
    await user.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalled();
  });

  test("readOnly: no textarea on dblclick, no delete button", () => {
    // readOnly = no handlers provided
    const { container } = render(<PostItCard postIt={makePostIt()} />);
    fireEvent.doubleClick(container.firstElementChild!);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });
});
