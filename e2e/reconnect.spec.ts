import { test, expect } from "@playwright/test";
import { devices } from "@playwright/test";

test.describe("Participant reconnection", () => {
  test("participant reconnects via cookie after navigating away", async ({
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
      const email = `recon-${timestamp}@test.com`;
      const password = "TestPass123!";

      // Facilitator signup and create session
      await facilitatorPage.goto("/signup");
      await facilitatorPage.getByLabel("Name").fill("Recon Facilitator");
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
        .fill("Reconnection test?");
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

      // Step 1: Participant joins and submits
      await participantPage.goto(`/join/${shortCode}`);
      await expect(
        participantPage.getByText(/reconnection test/i)
      ).toBeVisible({ timeout: 10000 });

      await participantPage
        .getByPlaceholder("Type your answer...")
        .fill("My first idea");
      await participantPage
        .getByRole("button", { name: "Submit" })
        .click();

      // Verify the answer appears on facilitator canvas
      await expect(
        facilitatorPage.getByText("My first idea")
      ).toBeVisible({ timeout: 10000 });

      // Step 2: Navigate away
      await participantPage.goto("about:blank");
      await participantPage.waitForTimeout(1000);

      // Step 3: Return to join URL
      await participantPage.goto(`/join/${shortCode}`);

      // Step 4: Should be recognized via cookie - sees the session question
      await expect(
        participantPage.getByText(/reconnection test/i)
      ).toBeVisible({ timeout: 10000 });

      // Step 5: Can submit another answer
      await participantPage
        .getByPlaceholder("Type your answer...")
        .fill("My second idea");
      await participantPage
        .getByRole("button", { name: "Submit" })
        .click();

      await expect(
        facilitatorPage.getByText("My second idea")
      ).toBeVisible({ timeout: 10000 });
    } finally {
      await facilitatorPage.close();
      await participantPage.close();
      await facilitatorCtx.close();
      await participantCtx.close();
    }
  });
});
