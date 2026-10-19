/**
 * Renders the SVG app icons to the PNG sizes PWAs and iOS need (no image library:
 * uses the Playwright Chromium already installed for E2E tests).
 *   node scripts/generate-icons.mjs
 */
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const targets = [
  { svg: "public/icons/icon.svg", out: "public/icons/icon-192.png", size: 192 },
  { svg: "public/icons/icon.svg", out: "public/icons/icon-512.png", size: 512 },
  { svg: "public/icons/maskable.svg", out: "public/icons/maskable-512.png", size: 512 },
  { svg: "public/icons/maskable.svg", out: "public/icons/apple-touch-icon.png", size: 180 }, // iOS rounds corners itself
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const t of targets) {
  const svg = readFileSync(t.svg, "utf8").replace("<svg ", `<svg width="${t.size}" height="${t.size}" `);
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.locator("svg").screenshot({ path: t.out, omitBackground: true });
  console.log(`${t.out} (${t.size}px)`);
}
await browser.close();
