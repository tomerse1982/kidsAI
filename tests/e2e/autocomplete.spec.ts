import { expect, test } from "@playwright/test";

test.describe("question autocomplete — Hebrew", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: "kidsai_lang", value: "he", url: baseURL! }]);
  });

  test("suggests bank questions from 2 characters, RTL, with the match highlighted", async ({ page }) => {
    await page.goto("/");
    const field = page.getByTestId("home-question");
    const list = page.getByTestId("question-suggestions");
    await field.fill("כ");
    await page.waitForTimeout(400);
    await expect(list).toBeHidden();

    await field.fill("כפית");
    await expect(list).toBeVisible();
    await expect(field).toHaveAttribute("role", "combobox");
    await expect(field).toHaveAttribute("aria-expanded", "true");
    await expect(list).toHaveAttribute("role", "listbox");
    const options = list.getByRole("option");
    expect(await options.count()).toBeGreaterThan(0);
    expect(await options.count()).toBeLessThanOrEqual(8);
    for (const mark of await list.locator("mark").allTextContents()) expect(mark).toBe("כפית");
    expect(await list.evaluate((el) => getComputedStyle(el).direction)).toBe("rtl");
  });

  test("arrow keys + Enter pick a suggestion, fill the field and ask it", async ({ page }) => {
    await page.goto("/");
    const field = page.getByTestId("home-question");
    await field.fill("לאכול לבד עם כפית");
    const first = page.getByTestId("question-suggestion").first();
    await expect(first).toBeVisible();
    const text = await first.textContent();
    await field.press("ArrowDown");
    await expect(first).toHaveAttribute("aria-selected", "true");
    await expect(field).toHaveAttribute("aria-activedescendant", (await first.getAttribute("id"))!);
    await field.press("ArrowUp"); // wraps to the last option
    await field.press("ArrowDown"); // back to the first
    await field.press("Enter");
    await expect(page).toHaveURL(/\/chat\?q=/);
    await expect(page.getByTestId("user-message")).toHaveText(text!);
    await expect(page.getByTestId("answer")).toHaveAttribute("data-milestone", "6.4", { timeout: 90_000 });
  });

  test("Esc closes the list and Enter then asks the typed text (free search unchanged)", async ({ page }) => {
    await page.goto("/");
    const field = page.getByTestId("home-question");
    await field.fill("כפית");
    await expect(page.getByTestId("question-suggestions")).toBeVisible();
    await field.press("Escape");
    await expect(page.getByTestId("question-suggestions")).toBeHidden();
    await expect(field).toHaveAttribute("aria-expanded", "false");
    await field.press("Enter");
    await expect(page).toHaveURL(/\/chat\?q=%D7%9B%D7%A4%D7%99%D7%AA$/);
  });

  test("no list when nothing matches; free search still answers", async ({ page }) => {
    await page.goto("/");
    const field = page.getByTestId("home-question");
    await field.fill("מה המתכון לעוגת שוקולד?");
    await page.waitForTimeout(400);
    await expect(page.getByTestId("question-suggestions")).toBeHidden();
    await field.press("Enter");
    await expect(page.getByTestId("answer")).toHaveAttribute("data-status", "not_covered", { timeout: 90_000 });
  });

  test("chat input: suggestions open above the field and a click asks immediately", async ({ page }) => {
    await page.goto("/chat");
    const field = page.getByTestId("chat-input");
    await field.fill("זוחל");
    const list = page.getByTestId("question-suggestions");
    await expect(list).toBeVisible();
    const [l, f] = [await list.boundingBox(), await field.boundingBox()];
    expect(l!.y + l!.height).toBeLessThanOrEqual(f!.y + 1);
    const option = page.getByTestId("question-suggestion").first();
    const text = await option.textContent();
    await option.click();
    await expect(page.getByTestId("user-message")).toHaveText(text!);
    await expect(field).toHaveValue("");
    await expect(list).toBeHidden();
  });
});

test.describe("question autocomplete — Arabic", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: "kidsai_lang", value: "ar", url: baseURL! }]);
  });

  test("matches without hamza / harakat / taa marbuta and suggests Arabic questions only", async ({ page }) => {
    await page.goto("/");
    const field = page.getByTestId("home-question");
    await field.fill("اشجع الطفل علي الاكل بالملعقه");
    const option = page.getByTestId("question-suggestion").first();
    await expect(option).toHaveText("كيف أشجّع الطفل على الأكل بالملعقة؟");
    await expect(option.locator("mark")).toHaveText("أشجّع الطفل على الأكل بالملعقة");
    await expect(page.getByTestId("question-suggestions")).toHaveAttribute("lang", "ar");
    await field.press("ArrowDown");
    await field.press("Enter");
    const answer = page.getByTestId("answer");
    await expect(answer).toHaveAttribute("lang", "ar", { timeout: 90_000 });
    await expect(answer).toHaveAttribute("data-milestone", "6.4");
  });

  test("Hebrew text gives no suggestions in Arabic", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("home-question").fill("כפית");
    await page.waitForTimeout(400);
    await expect(page.getByTestId("question-suggestions")).toBeHidden();
  });
});
