import { test, expect } from "@playwright/test";
import { devices } from "@playwright/test";

test.describe("Phase revert with vote cleanup", () => {
  test("reverting from vote to organize clears votes", async ({ browser }) => {
    test.setTimeout(120_000);

    const facilitatorCtx = await browser.newContext();
    const participantCtx = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const facilitatorPage = await facilitatorCtx.newPage();
    const participantPage = await participantCtx.newPage();

    try {
      const timestamp = Date.now();
      const email = `revert-${timestamp}@test.com`;
      const password = "TestPass123!";

      // Facilitator signup and create session
      await facilitatorPage.goto("/signup");
      await facilitatorPage.getByLabel("Name").fill("Revert Facilitator");
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
        .fill("Revert test?");
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

      // Participant joins and submits
      await participantPage.goto(`/join/${shortCode}`);
      await expect(
        participantPage.getByText(/revert test/i)
      ).toBeVisible({ timeout: 10000 });

      await participantPage
        .getByPlaceholder("Type your answer...")
        .fill("Test idea for voting");
      await participantPage
        .getByRole("button", { name: "Submit" })
        .click();

      await expect(
        facilitatorPage.getByText("Test idea for voting")
      ).toBeVisible({ timeout: 10000 });

      // Step 1: Advance to organize, then vote
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

      // Step 2: Start a voting round
      await facilitatorPage
        .getByRole("button", { name: /start voting/i })
        .click();

      // Step 3: Participant submits votes
      await expect(
        participantPage.getByText(/points remaining/i)
      ).toBeVisible({ timeout: 10000 });

      const votingItems = participantPage.locator(".postit-shadow");
      await votingItems.first().locator("button").last().click();

      await participantPage
        .getByRole("button", { name: /submit votes/i })
        .click();
      await expect(
        participantPage.getByText(/votes submitted/i)
      ).toBeVisible({ timeout: 5000 });

      // Step 4: Facilitator clicks "Organize" in phase stepper to revert
      await facilitatorPage
        .getByRole("button", { name: "Organize" })
        .click();

      // Step 5: Confirmation dialog appears
      await expect(
        facilitatorPage.getByText(/go back to organize/i)
      ).toBeVisible({ timeout: 3000 });

      // Click "Go Back" to confirm revert
      await facilitatorPage
        .getByRole("button", { name: /go back/i })
        .click();

      // Step 6: Phase should now be organize
      await expect(
        facilitatorPage.getByRole("button", { name: "Organize" })
      ).toHaveClass(/bg-teal-400/, { timeout: 5000 });

      // Step 7: Advance to vote again - should have fresh state
      await facilitatorPage.getByRole("button", { name: "Vote" }).click();
      await expect(
        facilitatorPage.getByRole("button", { name: "Vote" })
      ).toHaveClass(/bg-purple-400/, { timeout: 5000 });

      // Voting Setup should appear (not "Voting in Progress")
      await expect(
        facilitatorPage.getByText("Voting Setup")
      ).toBeVisible({ timeout: 5000 });
    } finally {
      await facilitatorPage.close();
      await participantPage.close();
      await facilitatorCtx.close();
      await participantCtx.close();
    }
  });
});
