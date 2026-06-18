import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
import { makeFixtureSpecs, cleanupFixture, seedProject } from "./helpers";

// US3 (T048): edit-and-save, then a conflict surfaced (no silent overwrite).
test.describe("Direct edit and conflict (US3)", () => {
  let fixture: string;
  let projectName: string;

  test.beforeEach(async ({ request, page }) => {
    fixture = makeFixtureSpecs();
    projectName = `Edit ${Date.now()}-${Math.floor(performance.now())}`;
    await seedProject(request, projectName, fixture);
    await page.goto("/");
    await page.getByRole("button", { name: new RegExp(projectName) }).click();
    await page.getByRole("button", { name: /Sample Feature/ }).click();
    await expect(page.getByRole("button", { name: "✎ Edit" })).toBeVisible();
  });

  test.afterEach(() => cleanupFixture(fixture));

  test("edits and saves an artifact", async ({ page }) => {
    await page.getByRole("button", { name: "✎ Edit" }).click();
    await page.getByRole("textbox", { name: /Edit spec.md/ }).fill("# Edited Heading\n");
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "Edited Heading", level: 1 })).toBeVisible();
  });

  test("surfaces a conflict when the file changed underneath, never silently overwriting", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "✎ Edit" }).click();
    await page.getByRole("textbox", { name: /Edit spec.md/ }).fill("my local change\n");

    // Simulate the session / external process editing the same file on disk.
    writeFileSync(join(fixture, "001-sample-feature", "spec.md"), "changed by someone else\n");

    await page.getByRole("button", { name: "Save" }).click();

    const dialog = page.getByRole("dialog", { name: "Save conflict" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("my local change")).toBeVisible();
    await expect(dialog.getByText("changed by someone else")).toBeVisible();
  });
});
