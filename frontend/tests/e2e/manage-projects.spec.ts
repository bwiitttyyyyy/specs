import { test, expect } from "@playwright/test";
import { makeFixtureSpecs, cleanupFixture, seedProject } from "./helpers";

// US4 (T054): switch between projects and create a new spec.
test.describe("Manage projects (US4)", () => {
  let fixtureA: string;
  let fixtureB: string;
  let nameA: string;
  let nameB: string;

  test.beforeAll(async ({ request }) => {
    fixtureA = makeFixtureSpecs();
    fixtureB = makeFixtureSpecs({ withSample: false }); // empty project
    const stamp = Date.now();
    nameA = `Proj A ${stamp}`;
    nameB = `Proj B ${stamp}`;
    await seedProject(request, nameA, fixtureA);
    await seedProject(request, nameB, fixtureB);
  });

  test.afterAll(() => {
    cleanupFixture(fixtureA);
    cleanupFixture(fixtureB);
  });

  test("switches active project and creates a new spec in the empty one", async ({ page }) => {
    await page.goto("/");

    // Enter project A.
    await page.getByRole("button", { name: new RegExp(nameA) }).click();
    await expect(page.getByRole("button", { name: /Sample Feature/ })).toBeVisible();

    // Switch to empty project B via the header switcher.
    await page.getByRole("button", { name: new RegExp(nameA) }).click(); // open dropdown
    await page.getByRole("option", { name: new RegExp(nameB) }).click();
    await expect(page.getByText("No specs found")).toBeVisible();

    // Create a new spec in B.
    await page.getByRole("button", { name: "+ New spec" }).click();
    await page.getByRole("textbox", { name: "Feature name" }).fill("Brand New Feature");
    await page.getByRole("textbox", { name: "Description" }).fill("does something useful");
    await page.getByRole("button", { name: "Create spec" }).click();

    // It appears in the list and opens.
    await expect(
      page.getByRole("heading", { name: "Feature Specification: Brand New Feature" }),
    ).toBeVisible();
    await expect(page.getByText(/\d{3}-brand-new-feature/).first()).toBeVisible();
  });
});
