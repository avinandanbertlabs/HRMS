import { test, expect } from "@playwright/test";

test("root redirects to login", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", {
      name: /sign in to your workspace/i,
    }),
  ).toBeVisible();
});

test("all workspace pages require an authenticated session", async ({ page }) => {
  for (const route of ["/dashboard", "/employees", "/people", "/profile", "/organization", "/leave", "/admin", "/guide", "/change-password"]) {
    await page.goto(route);
    await expect(page, `${route} should redirect anonymous visitors to sign-in`).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: /sign in to your workspace/i })).toBeVisible();
  }
});

test("account administration APIs require an authorized session", async ({ request }) => {
  expect((await request.get("/api/v1/admin/accounts")).status()).toBe(401);
  expect((await request.post("/api/account/password", { data: {} })).status()).toBe(401);
});

test("retired attendance page and APIs are unavailable", async ({ page, request }) => {
  const pageResponse = await page.goto("/attendance");
  expect(pageResponse?.status()).toBe(404);
  expect((await request.get("/api/v1/attendance")).status()).toBe(404);
  expect((await request.post("/api/v1/attendance/check-in")).status()).toBe(404);
});
