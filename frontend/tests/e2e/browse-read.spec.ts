import { test, expect } from "@playwright/test";
import { makeFixtureSpecs, cleanupFixture, seedProject } from "./helpers";

// US1 (T022): browse → read → search.
test.describe("Browse and read specs (US1)", () => {
  let fixture: string;
  let projectName: string;

  test.beforeAll(async ({ request }) => {
    fixture = makeFixtureSpecs();
    projectName = `Browse ${Date.now()}`;
    await seedProject(request, projectName, fixture);
  });

  test.afterAll(() => cleanupFixture(fixture));

  test("select project, list specs, read an artifact, and search", async ({ page }) => {
    await page.goto("/");

    // Select the project.
    await page.getByRole("button", { name: new RegExp(projectName) }).click();

    // Spec list shows the sample spec with a lifecycle status.
    const specButton = page.getByRole("button", { name: /Sample Feature/ });
    await expect(specButton).toBeVisible();
    await expect(page.getByText("001-sample-feature")).toBeVisible();

    // Open it and confirm rendered content + artifact tabs.
    await specButton.click();
    await expect(
      page.getByRole("heading", { name: "Feature Specification: Sample Feature" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "spec.md" })).toBeVisible();
    await expect(page.getByRole("button", { name: "plan.md" })).toBeVisible();

    // Search narrows the list; a non-match clears it.
    await page.getByRole("textbox", { name: "Search specs" }).fill("nonexistent-xyz");
    await expect(page.getByText("No specs found")).toBeVisible();
    await page.getByRole("textbox", { name: "Search specs" }).fill("sample");
    await expect(page.getByRole("button", { name: /Sample Feature/ })).toBeVisible();
  });
});
