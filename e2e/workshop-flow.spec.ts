import { test, expect } from "@playwright/test";
import { devices } from "@playwright/test";

test.describe("Full workshop flow", () => {
  test("end-to-end workshop: signup -> collect -> vote -> results", async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    const facilitatorCtx = await browser.newContext();
    const participantCtx = await browser.newContext({
      ...devices["iPhone 13"],
    });
    const facilitatorPage = await facilitatorCtx.newPage();
    const participantPage = await participantCtx.newPage();

    try {
      const timestamp = Date.now();
      const email = `facilitator-${timestamp}@test.com`;
      const password = "TestPass123!";

      // Step 1: Facilitator signs up
      await facilitatorPage.goto("/signup");
      await facilitatorPage.getByLabel("Name").fill("Test Facilitator");
      await facilitatorPage.getByLabel("Email").fill(email);
      await facilitatorPage.getByLabel("Password").fill(password);
      await facilitatorPage
        .getByRole("button", { name: /create account/i })
        .click();
      await facilitatorPage.waitForURL("**/dashboard");

      // Step 2: Create a new session
      await facilitatorPage
        .getByRole("link", { name: /new session/i })
        .click();
      await facilitatorPage.waitForURL("**/sessions/new");
      await facilitatorPage
        .getByLabel("Brainstorm Question")
        .fill("What should we focus on?");
      await facilitatorPage
        .getByRole("button", { name: /create session/i })
        .click();
      await facilitatorPage.waitForURL(/\/sessions\/(?!new)/);

      // Step 3: Get short code from Share overlay
      await facilitatorPage
        .getByRole("button", { name: /share/i })
        .click();
      const codeEl = facilitatorPage.locator(".tracking-widest");
      await expect(codeEl).toBeVisible({ timeout: 5000 });
      const shortCode = (await codeEl.textContent())!.trim();
      expect(shortCode).toHaveLength(6);
      // Close overlay
      await facilitatorPage
        .getByText("Join this session")
        .locator("..")
        .locator("button")
        .click();

      // Step 4: Participant joins via short code
      await participantPage.goto(`/join/${shortCode}`);
      await expect(
        participantPage.getByText(/what should we focus on/i)
      ).toBeVisible({ timeout: 10000 });

      // Step 5: Participant submits an answer
      await participantPage
        .getByPlaceholder("Type your answer...")
        .fill("Improve onboarding");
      await participantPage
        .getByRole("button", { name: "Submit" })
        .click();

      // PostIt should appear on facilitator canvas
      await expect(
        facilitatorPage.getByText("Improve onboarding")
      ).toBeVisible({ timeout: 10000 });

      // Step 6: Advance to Organize phase
      await facilitatorPage
        .getByRole("button", { name: "Organize" })
        .click();
      await expect(
        facilitatorPage.getByRole("button", { name: "Organize" })
      ).toHaveClass(/bg-teal-400/, { timeout: 5000 });

      // Step 7: Advance to Vote phase
      await facilitatorPage.getByRole("button", { name: "Vote" }).click();
      await expect(
        facilitatorPage.getByRole("button", { name: "Vote" })
      ).toHaveClass(/bg-purple-400/, { timeout: 5000 });

      // Step 8: Start dot voting (dot_voting is pre-selected by default)
      await facilitatorPage
        .getByRole("button", { name: /start voting/i })
        .click();

      // Step 9: Participant completes dot voting
      // Wait for voting UI to appear via Convex real-time update
      await expect(
        participantPage.getByText(/points remaining/i)
      ).toBeVisible({ timeout: 10000 });

      // Click + button on the first voting item (last button in item = plus)
      const votingItems = participantPage.locator(".postit-shadow");
      const firstPlusBtn = votingItems.first().locator("button").last();
      await firstPlusBtn.click();
      await firstPlusBtn.click();
      await firstPlusBtn.click();

      // Submit votes
      await participantPage
        .getByRole("button", { name: /submit votes/i })
        .click();
      await expect(
        participantPage.getByText(/votes submitted/i)
      ).toBeVisible({ timeout: 5000 });

      // Step 10: Facilitator reveals results
      await facilitatorPage
        .getByRole("button", { name: /reveal results/i })
        .click();

      // Step 11: Advance to Results phase
      await facilitatorPage
        .getByRole("button", { name: /go to results phase/i })
        .click();
      await expect(
        facilitatorPage.getByRole("button", { name: "Results", exact: true })
      ).toHaveClass(/bg-blue-400/, { timeout: 5000 });

      // Results panel heading should be visible
      await expect(
        facilitatorPage.locator("h3", { hasText: "Results" })
      ).toBeVisible({ timeout: 5000 });
    } finally {
      await facilitatorPage.close();
      await participantPage.close();
      await facilitatorCtx.close();
      await participantCtx.close();
    }
  });
});
