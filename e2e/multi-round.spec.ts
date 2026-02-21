import { test, expect } from "@playwright/test";
import { devices } from "@playwright/test";

test.describe("Multi-mode voting rounds", () => {
  test("two rounds with different modes show round tabs", async ({
    browser,
  }) => {
    test.setTimeout(180_000);

    const facilitatorCtx = await browser.newContext();
    const participantCtx = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const facilitatorPage = await facilitatorCtx.newPage();
    const participantPage = await participantCtx.newPage();

    try {
      const timestamp = Date.now();
      const email = `multi-${timestamp}@test.com`;
      const password = "TestPass123!";

      // Facilitator signup and create session
      await facilitatorPage.goto("/signup");
      await facilitatorPage.getByLabel("Name").fill("Multi Facilitator");
      await facilitatorPage.getByLabel("Email").fill(email);
      await facilitatorPage.getByLabel("Password").fill(password);
      await facilitatorPage
        .getByRole("button", { name: /create account/i })
        .click();
      await facilitatorPage.waitForURL("**/dashboard");

      await facilitatorPage
        .getByRole("link", { name: /new session/i })
        .click();
      await facilitatorPage.waitForURL("**/sessions/new");
      await facilitatorPage
        .getByLabel("Brainstorm Question")
        .fill("Multi-round test?");
      await facilitatorPage
        .getByRole("button", { name: /create session/i })
        .click();
      await facilitatorPage.waitForURL(/\/sessions\/(?!new)/);

      // Get short code
      await facilitatorPage
        .getByRole("button", { name: /share/i })
        .click();
      const codeEl = facilitatorPage.locator(".tracking-widest");
      await expect(codeEl).toBeVisible({ timeout: 5000 });
      const shortCode = (await codeEl.textContent())!.trim();
      await facilitatorPage
        .getByText("Join this session")
        .locator("..")
        .locator("button")
        .click();

      // Participant joins and submits multiple ideas
      await participantPage.goto(`/join/${shortCode}`);
      await expect(
        participantPage.getByText(/multi-round test/i)
      ).toBeVisible({ timeout: 10000 });

      await participantPage
        .getByPlaceholder("Type your answer...")
        .fill("Idea Alpha");
      await participantPage
        .getByRole("button", { name: "Submit" })
        .click();
      await participantPage.waitForTimeout(500);

      await participantPage
        .getByPlaceholder("Type your answer...")
        .fill("Idea Beta");
      await participantPage
        .getByRole("button", { name: "Submit" })
        .click();

      await expect(
        facilitatorPage.getByText("Idea Alpha")
      ).toBeVisible({ timeout: 10000 });

      // Advance to vote phase
      await facilitatorPage
        .getByRole("button", { name: "Organize" })
        .click();
      await expect(
        facilitatorPage.getByRole("button", { name: "Organize" })
      ).toHaveClass(/bg-teal-400/, { timeout: 5000 });

      await facilitatorPage.getByRole("button", { name: "Vote" }).click();
      await expect(
        facilitatorPage.getByRole("button", { name: "Vote" })
      ).toHaveClass(/bg-purple-400/, { timeout: 5000 });

      // === Round 1: Dot Voting ===
      await facilitatorPage
        .getByRole("button", { name: /start voting/i })
        .click();

      // Participant votes
      await expect(
        participantPage.getByText(/points remaining/i)
      ).toBeVisible({ timeout: 10000 });

      const votingItems = participantPage.locator(".postit-shadow");
      const firstPlusBtn = votingItems.first().locator("button").last();
      await firstPlusBtn.click();
      await firstPlusBtn.click();

      await participantPage
        .getByRole("button", { name: /submit votes/i })
        .click();
      await expect(
        participantPage.getByText(/votes submitted/i)
      ).toBeVisible({ timeout: 5000 });

      // Facilitator reveals Round 1
      await facilitatorPage
        .getByRole("button", { name: /reveal results/i })
        .click();

      // === Round 2: Stock Rank ===
      await expect(
        facilitatorPage.getByRole("button", {
          name: /start another round/i,
        })
      ).toBeVisible({ timeout: 5000 });
      await facilitatorPage
        .getByRole("button", { name: /start another round/i })
        .click();

      // Select Stock Rank mode in the new round setup
      await facilitatorPage.getByText("Stock Rank").click();

      // Start the new round
      await facilitatorPage
        .getByRole("button", { name: /start new round/i })
        .click();

      // Participant does stock rank voting
      await expect(
        participantPage.getByText(/rank your top/i)
      ).toBeVisible({ timeout: 10000 });

      // Click an unranked item to add to ranking
      await participantPage
        .getByRole("button", { name: /idea alpha/i })
        .click();

      // Submit rankings
      await participantPage
        .getByRole("button", { name: /submit rankings/i })
        .click();
      await expect(
        participantPage.getByText(/rankings submitted/i)
      ).toBeVisible({ timeout: 5000 });

      // Facilitator reveals Round 2
      await facilitatorPage
        .getByRole("button", { name: /reveal results/i })
        .click();

      // Go to results phase via PhaseStepper button
      await facilitatorPage
        .getByRole("button", { name: "Results", exact: true })
        .click();
      await expect(
        facilitatorPage.getByRole("button", { name: "Results", exact: true })
      ).toHaveClass(/bg-blue-400/, { timeout: 5000 });

      // Verify round tabs are visible
      await expect(
        facilitatorPage.getByText(/round 1/i)
      ).toBeVisible({ timeout: 5000 });
      await expect(
        facilitatorPage.getByText(/round 2/i)
      ).toBeVisible({ timeout: 5000 });

      // Click Round 1 tab
      await facilitatorPage.getByText(/round 1/i).click();
      await facilitatorPage.waitForTimeout(500);

      // Click Round 2 tab
      await facilitatorPage.getByText(/round 2/i).click();
      await facilitatorPage.waitForTimeout(500);
    } finally {
      await facilitatorPage.close();
      await participantPage.close();
      await facilitatorCtx.close();
      await participantCtx.close();
    }
  });
});
