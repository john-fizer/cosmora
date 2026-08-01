// Smoke-test: clicking SEND LINK should call Supabase auth, not error locally.
// Uses a throwaway address; we only care that the request reaches Supabase
// and doesn't error client-side (no email inbox access from here).
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage();

let sawAuthRequest = false;
page.on("request", req => {
  if (req.url().includes("supabase.co/auth/v1/otp")) sawAuthRequest = true;
});
page.on("response", async res => {
  if (res.url().includes("supabase.co/auth/v1/otp")) {
    console.log("otp response status:", res.status());
    try { console.log("otp response body:", await res.text()); } catch {}
  }
});
page.on("console", m => { if (m.type() === "error") console.log("PAGE ERR:", m.text()); });

await page.goto(`${BASE}/dashboard/settings`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("text=COSMIC ACCOUNT", { timeout: 15000 });
await page.fill('input[placeholder="you@cosmos.com"]', "fizerco@gmail.com");
await page.click("text=SEND LINK");
await page.waitForTimeout(2500);

const statusText = await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find(b => b.textContent?.includes("SEND LINK"));
  return btn?.closest("div")?.parentElement?.textContent ?? "";
});

console.log("Saw request to Supabase auth/v1/otp:", sawAuthRequest);
console.log("Status area text:", statusText);
await browser.close();
