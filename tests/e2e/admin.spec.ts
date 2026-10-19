import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { expect, test } from "@playwright/test";

test.describe("admin dashboard", () => {
  test.skip(!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD, "admin credentials not configured");

  test("rejects unauthenticated API access", async ({ request }) => {
    expect((await request.get("/api/admin/overview")).status()).toBe(401);
    expect((await request.get("/api/admin/mappings?code=1.1")).status()).toBe(401);
  });

  test("logs in, reviews milestone 1.1 and stages a future Hebrew workbook with a column mapping", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.getByTestId("admin-email").fill(process.env.ADMIN_EMAIL!);
    await page.getByTestId("admin-password").fill(process.env.ADMIN_PASSWORD!);
    await page.getByTestId("admin-login").click();
    await expect(page.getByTestId("admin-panel")).toBeVisible();
    expect(await page.getByTestId("stat").count()).toBeGreaterThanOrEqual(12);

    // mapping manager: 1.1 has six sub-milestones; 1.1.3 shows its Arabic video and source row
    await page.goto("/admin/mappings");
    const row = page.locator('[data-testid="mapping-row"][data-code="1.1.3"]');
    await expect(row).toBeVisible();
    await expect(page.getByTestId("mapping-row")).toHaveCount(6);
    await expect(row.locator('[data-testid="admin-mapping"][data-video-id="e4RsJQ4yJMo"]')).toBeVisible();
    await expect(row).toContainText("שורה");

    // review queue: the flagged handbook texts and the derived links waiting for an editor
    await page.goto("/admin/review");
    await expect(page.getByTestId("review-page")).toBeVisible();
    await expect(page.getByTestId("review-translations").locator("li")).toHaveCount(5);
    await expect(page.getByTestId("review-translations")).toContainText("2.1");
    expect(await page.getByTestId("review-links").locator("li").count()).toBeGreaterThan(0);

    // upload a workbook with an unknown (future Hebrew) layout -> column mapping -> staged preview
    const dir = mkdtempSync(path.join(tmpdir(), "e2e-he-"));
    const file = path.join(dir, "hebrew-e2e.xlsx");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("עברית");
    ws.addRow(["תת אבן דרך", "קישור לסרטון", "תת אבן דרך (עברית)"]);
    ws.addRow(["1.1.4", "https://youtu.be/E2Etest1140", "הנעת חפצים"]);
    await wb.xlsx.writeFile(file);

    await page.goto("/admin/imports");
    await page.getByTestId("import-kind").selectOption("video_workbook");
    await page.getByTestId("import-language").selectOption("he");
    await page.getByTestId("import-file").setInputFiles(file);
    await page.getByTestId("import-submit").click();
    await expect(page.getByTestId("column-mapper")).toBeVisible();
    await expect(page.getByTestId("col-subMilestone")).toHaveValue("A");
    await expect(page.getByTestId("col-video")).toHaveValue("B");
    await page.getByTestId("confirm-mapping").click();
    await expect(page.getByTestId("import-job")).toHaveAttribute("data-status", "staged");
    await expect(page.getByTestId("count-insert")).toContainText("1");
    // publishing requires an explicit confirmation
    await expect(page.getByTestId("publish")).toBeDisabled();
  });
});
