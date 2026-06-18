import { test, expect } from "@playwright/test";
import { makeFixtureSpecs, cleanupFixture, seedProject } from "./helpers";

// US2 (T034): run a command, stream output, answer a clarification — via the mock session.
test.describe("Iterate via the remote session (US2)", () => {
  let fixture: string;
  let projectName: string;

  test.beforeAll(async ({ request }) => {
    fixture = makeFixtureSpecs();
    projectName = `Iterate ${Date.now()}`;
    await seedProject(request, projectName, fixture);
  });

  test.afterAll(() => cleanupFixture(fixture));

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: new RegExp(projectName) }).click();
    await page.getByRole("button", { name: /Sample Feature/ }).click();
    await expect(page.getByRole("status", { name: "Session status" })).toContainText("idle");
  });

  test("runs a command and streams output to completion", async ({ page }) => {
    await page.getByRole("button", { name: "/speckit-plan" }).click();
    await expect(page.getByText("▶ /speckit-plan")).toBeVisible();
    await expect(page.getByText("completed")).toBeVisible();
    await expect(page.getByText(/Running \/speckit-plan/)).toBeVisible();
  });

  test("chat that asks a question shows a clarification and resumes after answering", async ({
    page,
  }) => {
    await page.getByRole("textbox", { name: "Chat message" }).fill("Please ASK me");
    await page.getByRole("button", { name: "Send" }).click();

    const clarify = page.getByRole("dialog", { name: "Clarification needed" });
    await expect(clarify).toBeVisible();
    await expect(page.getByRole("status", { name: "Session status" })).toContainText(
      "waiting on you",
    );
    await clarify.getByRole("button", { name: "A", exact: true }).click();

    await expect(page.getByText(/Using answer: A/)).toBeVisible();
    await expect(page.getByRole("status", { name: "Session status" })).toContainText("idle");
  });
});
