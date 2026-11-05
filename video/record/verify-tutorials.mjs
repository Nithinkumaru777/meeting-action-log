// Real-browser check of the Tutorials page in both apps. Uses installed Chrome, because Playwright's bundled
// Chromium has no H.264 decoder.  node verify-tutorials.mjs <outDir>
import { chromium } from "playwright";
import path from "node:path";

const OUT = process.argv[2] || ".";
const SITES = [
  { name: "saakh", url: "http://localhost:3000/#tutorials", clip: "as6", search: "pdf" },
  { name: "mal", url: "http://localhost:5000/tutorials", clip: "md3", search: "convert" },
];
const browser = await chromium.launch({ channel: "chrome" });
let failed = 0;
const check = (site, what, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"} ${site} ${what} ${detail}`); };

for (const s of SITES) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_CONNECTION_REFUSED|Failed to load resource|EventSource/.test(m.text())) errors.push(m.text()); });
  await page.goto(s.url, { waitUntil: "load" });
  await page.waitForSelector(".tut-topic");
  await page.waitForTimeout(600);
  check(s.name, "topics listed", (await page.locator(".tut-topic").count()) > 30, String(await page.locator(".tut-topic").count()));
  await page.screenshot({ path: path.join(OUT, `${s.name}-page.png`) });

  const row = page.locator(`[data-topic="${s.clip}"]`);
  check(s.name, "closed topic has no video", (await row.locator("video").count()) === 0);
  await row.locator(".tut-toggle").click();
  const video = row.locator("video");
  await video.waitFor({ state: "visible" });
  check(s.name, "arrow shows description", (await row.locator(".tut-desc").innerText()).length > 40);
  const played = await video.evaluate(async (v) => {
    v.muted = true;
    await v.play();
    await new Promise((r) => setTimeout(r, 1500));
    const t1 = v.currentTime;
    v.pause();
    v.currentTime = v.duration - 3;
    await new Promise((r) => v.addEventListener("seeked", r, { once: true }));
    return { w: v.videoWidth, h: v.videoHeight, dur: v.duration, t1, sought: v.currentTime };
  });
  check(s.name, "clip plays", played.t1 > 0.5 && played.w === 1920, JSON.stringify(played));
  check(s.name, "clip seeks", played.sought > played.dur - 4);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, `${s.name}-open.png`) });

  const other = page.locator(".tut-topic").nth(0);
  await other.locator(".tut-toggle").click();
  check(s.name, "one topic open at a time", (await page.locator('.tut-toggle[aria-expanded="true"]').count()) === 1);

  const full = page.locator(".tut-full video");
  const fullInfo = await full.evaluate(async (v) => {
    v.muted = true;
    await v.play();
    await new Promise((r) => setTimeout(r, 1000));
    return { dur: v.duration, t: v.currentTime };
  });
  check(s.name, "full video plays", fullInfo.t > 0.3 && fullInfo.dur > 1000, JSON.stringify(fullInfo));
  await other.locator("video").evaluate((v) => v.play().catch(() => {}));
  await page.waitForTimeout(300);
  check(s.name, "starting a clip pauses the full video", await full.evaluate((v) => v.paused));

  await page.fill("#tutSearch", s.search);
  await page.waitForTimeout(200);
  const hits = await page.locator(".tut-topic").count();
  check(s.name, "search narrows", hits > 0 && hits < 20, String(hits));
  await page.fill("#tutSearch", "zzzz");
  await page.waitForTimeout(200);
  check(s.name, "no match message", (await page.getByText(/No topics match/).count()) > 0);
  await page.fill("#tutSearch", "");

  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(s.name, "no sideways scroll on a phone", overflow <= 1, String(overflow));
  await page.screenshot({ path: path.join(OUT, `${s.name}-phone.png`) });

  check(s.name, "no console errors", errors.length === 0, errors.slice(0, 3).join(" | ").slice(0, 400));
  await ctx.close();
}
await browser.close();
console.log(failed ? `${failed} FAILED` : "ALL PASSED");
process.exit(failed ? 1 : 0);
