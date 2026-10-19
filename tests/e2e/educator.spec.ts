import { expect, test, type Page } from "@playwright/test";

async function setLang(page: Page, lang: "he" | "ar") {
  await page.context().addCookies([{ name: "kidsai_lang", value: lang, url: page.url().startsWith("http") ? page.url() : "http://localhost:3100" }]);
}

test.describe("educator — Hebrew", () => {
  test.beforeEach(async ({ context, baseURL }) => {
    await context.addCookies([{ name: "kidsai_lang", value: "he", url: baseURL! }]);
  });

  test("home screen is RTL Hebrew with suggestions and age shortcuts", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1, name: "מטפסים בסולם" })).toBeVisible();
    await expect(page.getByTestId("suggestion")).toHaveCount(3);
    await expect(page.getByTestId("age-shortcut")).toHaveCount(8);
    // nothing scrolls horizontally on a phone
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("asks with the mobile keyboard (Enter) and receives a grounded structured answer", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("home-question").fill("צעצועים בולטים ומושכי עין לתינוק");
    await page.getByTestId("home-question").press("Enter");
    const answer = page.getByTestId("answer");
    await expect(answer).toBeVisible({ timeout: 90_000 });
    await expect(answer).toHaveAttribute("data-milestone", "1.1");
    await expect(page.getByTestId("explanation")).not.toBeEmpty();
    await expect(page.getByTestId("milestone-card").first()).toContainText("1.1");
    expect(await page.getByTestId("activity-card").count()).toBeGreaterThan(0);
    // videos come from the Hebrew workbook only (Hebrew selected): no Arabic video is substituted
    const target = page.locator('[data-testid="video-card"][data-video-id="j312B6F7PUI"]').first();
    await expect(target).toBeVisible();
    await expect(target.getByTestId("video-lang")).toHaveText("סרטון בעברית");
    await expect(target.getByTestId("video-link")).toHaveAttribute("href", /j312B6F7PUI/);
    await expect(page.locator('[data-testid="video-card"][data-video-id="e4RsJQ4yJMo"]')).toHaveCount(0);
    await expect(page.getByTestId("video-lang").filter({ hasText: "בערבית" })).toHaveCount(0);
    await expect(page.getByTestId("disclaimer")).toContainText("אינו אבחון");
    await expect(page.getByTestId("follow-up").first()).toBeVisible();
  });

  test("plays the embedded video (privacy-enhanced iframe loads on tap)", async ({ page }) => {
    await page.goto("/milestones/1.1");
    const card = page.locator('[data-testid="video-card"][data-video-id="j312B6F7PUI"]').first();
    await expect(card.getByTestId("video-iframe")).toHaveCount(0);
    await card.getByTestId("video-play").click();
    await expect(card.getByTestId("video-iframe")).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/j312B6F7PUI/);
  });

  test("opens the cited handbook page", async ({ page, request }) => {
    await page.goto("/milestones/1.1");
    const link = page.getByTestId("source-card").getByTestId("source-link");
    await expect(link).toHaveAttribute("href", "/api/sources/handbook-he/pdf#page=9");
    const res = await request.get("/api/sources/handbook-he/pdf");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("application/pdf");
  });

  test("is installable: manifest with PNG icons and an apple-touch icon", async ({ page, request }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({ display: "standalone", dir: "rtl" });
    for (const icon of manifest.icons.filter((i: { type: string }) => i.type === "image/png")) {
      const res = await request.get(icon.src);
      expect(res.status(), icon.src).toBe(200);
      expect(res.headers()["content-type"]).toBe("image/png");
    }
    await page.goto("/");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-touch-icon.png/);
  });

  test("browses by age group without the AI service", async ({ page }) => {
    await page.goto("/browse");
    await page.getByTestId("age-filter").first().click();
    await expect(page).toHaveURL(/age=6w-3m/);
    const cards = page.getByTestId("milestone-list").getByTestId("milestone-card");
    await expect(cards).toHaveCount(4);
    await expect(cards.first()).toContainText("1.1");
  });

  test("bookmarks a milestone and finds it on the bookmarks screen", async ({ page }) => {
    await page.goto("/milestones/2.2");
    const btn = page.getByTestId("bookmark-milestone").first();
    await expect(btn).toBeEnabled();
    if ((await btn.getAttribute("aria-pressed")) !== "true") await btn.click();
    await expect(btn).toHaveAttribute("aria-pressed", "true");
    await page.goto("/bookmarks");
    await expect(page.getByTestId("bookmarked-milestones")).toContainText("2.2");
  });

  test("answers honestly when the handbooks do not cover the question", async ({ page }) => {
    await page.goto(`/chat?q=${encodeURIComponent("מה המתכון לעוגת שוקולד?")}`);
    const answer = page.getByTestId("answer");
    await expect(answer).toHaveAttribute("data-status", "not_covered", { timeout: 90_000 });
    await expect(page.getByTestId("video-card")).toHaveCount(0);
  });
});

test.describe("educator — Arabic", () => {
  test("switches language to Arabic (RTL) and answers from the Arabic handbook", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "kidsai_lang", value: "he", url: baseURL! }]);
    await page.goto("/");
    await page.getByTestId("lang-switch").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1, name: "نتسلّق السُلّم" })).toBeVisible();

    await page.getByTestId("suggestion").nth(1).click();
    const answer = page.getByTestId("answer");
    await expect(answer).toBeVisible({ timeout: 90_000 });
    await expect(answer).toHaveAttribute("lang", "ar");
    const href = await page.getByTestId("source-card").getByTestId("source-link").getAttribute("href");
    expect(href).toMatch(/^\/api\/sources\/handbook-ar\/pdf#page=\d+$/);
    const first = page.getByTestId("video-card").first();
    await expect(first.getByTestId("video-lang")).toHaveText("فيديو بالعربية");
    await expect(page.getByTestId("video-lang").filter({ hasText: "بالعبرية" })).toHaveCount(0); // never Hebrew videos in Arabic
  });

  test("switching language on the chat screen replaces the answer — no stale content from the other language", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "kidsai_lang", value: "he", url: baseURL! }]);
    await page.goto(`/chat?q=${encodeURIComponent("צעצועים בולטים ומושכי עין לתינוק")}`);
    await expect(page.getByTestId("answer")).toHaveAttribute("lang", "he", { timeout: 90_000 });
    await page.getByTestId("lang-switch").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    const answers = page.getByTestId("answer");
    await expect(answers.first()).toHaveAttribute("lang", "ar", { timeout: 90_000 });
    await expect(answers).toHaveCount(1);
    await expect(page.locator('[data-testid="video-card"][data-video-id="j312B6F7PUI"]')).toHaveCount(0);
    for (const badge of await page.getByTestId("video-lang").allTextContents()) expect(badge).toBe("فيديو بالعربية");
  });

  test("rejects a language the app has no sources for", async ({ request }) => {
    const res = await request.post("/api/chat", { data: { question: "toys for babies", language: "en" } });
    expect(res.status()).toBe(400);
  });

  test("identifiers stay left-to-right inside Arabic text", async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "kidsai_lang", value: "ar", url: baseURL! }]);
    await page.goto("/milestones/1.1");
    const code = page.getByTestId("milestone-card").locator("bdi[dir=ltr]").first();
    await expect(code).toHaveText("1.1");
  });
});

void setLang;
