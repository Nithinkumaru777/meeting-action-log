// Recording engine: visible cursor, human pacing, event log, beats aligned to the voiceover words.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const APP = process.env.APP_URL || "http://localhost:5000";
export const API = process.env.API_URL || "http://localhost:5000/api";
const VIDEO = path.resolve(import.meta.dirname, "..");
const W = 1920, H = 1080;

// Cursor overlay. Arrow pointer (ink with white keyline) so it reads on light and dark themes.
const CURSOR_JS = `(() => {
  if (window.__vc) return; window.__vc = 1;
  const add = () => {
    const st = document.createElement('style');
    st.textContent = \`
      #__cur{position:fixed;left:0;top:0;width:28px;height:28px;pointer-events:none;z-index:2147483647;
        transform:translate(-3px,-2px);transition:transform 90ms cubic-bezier(.23,1,.32,1);will-change:left,top}
      #__cur.down{transform:translate(-3px,-2px) scale(.82)}
      .__rip{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;pointer-events:none;
        z-index:2147483646;border:3px solid #E3A21A;background:rgba(227,162,26,.22);animation:__r 520ms cubic-bezier(.23,1,.32,1) forwards}
      @keyframes __r{from{transform:scale(.3);opacity:1}to{transform:scale(1.5);opacity:0}}\`;
    document.documentElement.appendChild(st);
    const c = document.createElement('div'); c.id='__cur';
    c.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28"><path d="M4 2 L4 22 L9.5 17 L13.2 25.5 L16.8 24 L13.2 15.6 L20.5 15.4 Z" fill="#17171A" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    c.style.left = (window.__cx ?? 960)+'px'; c.style.top = (window.__cy ?? 600)+'px';
    addEventListener('mousemove', e => { c.style.left=e.clientX+'px'; c.style.top=e.clientY+'px'; window.__cx=e.clientX; window.__cy=e.clientY; }, true);
    addEventListener('mousedown', e => { c.classList.add('down'); const r=document.createElement('div'); r.className='__rip';
      r.style.left=e.clientX+'px'; r.style.top=e.clientY+'px'; document.documentElement.appendChild(r); setTimeout(()=>r.remove(),600); }, true);
    addEventListener('mouseup', () => c.classList.remove('down'), true);
  };
  if (document.documentElement) add(); else addEventListener('DOMContentLoaded', add);
})();`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const rnd = (a, b) => a + Math.random() * (b - a);

export class Director {
  constructor(page, sceneId) {
    this.page = page; this.id = sceneId; this.events = []; this.t0 = null;
    this.x = W / 2; this.y = H * 0.6;
  }
  now() { return this.t0 == null ? 0 : Date.now() - this.t0; }
  start() { this.t0 = Date.now(); }
  async box(target) {
    const loc = typeof target === "string" ? this.page.locator(target).first() : target;
    try { await loc.waitFor({ state: "visible", timeout: 15000 }); }
    catch { throw new Error(`${this.id}: not visible: ${target}`); }
    // The app re-renders some panels (inspector, toasts) in place; retry if the node was swapped mid-action.
    for (let attempt = 0; ; attempt++) {
      try {
        await loc.scrollIntoViewIfNeeded({ timeout: 5000 });
        const b = await loc.boundingBox();
        if (!b) throw new Error(`${this.id}: no box for ${target}`);
        return { loc, b };
      } catch (e) {
        if (attempt >= 3) throw e;
        await sleep(150);
      }
    }
  }
  log(action, label, b) {
    this.events.push({ sceneId: this.id, timeMs: this.now(), action, label,
      x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height) });
  }
  async glide(tx, ty, ms) {
    const d = Math.hypot(tx - this.x, ty - this.y);
    ms = ms ?? Math.min(650, Math.max(220, d * 0.6));
    const n = Math.max(8, Math.round(ms / 16)), fx = this.x, fy = this.y;
    for (let i = 1; i <= n; i++) {
      const e = ease(i / n);
      await this.page.mouse.move(fx + (tx - fx) * e, fy + (ty - fy) * e);
      await sleep(ms / n);
    }
    this.x = tx; this.y = ty;
  }
  async hover(target, label, { dwell = 700, soft = false } = {}) {
    // soft: transient elements (toasts) may already be gone; skip instead of failing the take.
    if (soft && !(await this.page.locator(target).first().isVisible().catch(() => false))) { await sleep(dwell); return; }
    const { b } = await this.box(target);
    await this.glide(b.x + b.width / 2, b.y + b.height / 2);
    this.log("hover", label, b);
    await sleep(dwell);
  }
  async click(target, label, { after = 750, offsetX } = {}) {
    const { b } = await this.box(target);
    const cx = offsetX != null ? b.x + offsetX : b.x + b.width / 2;
    await this.glide(cx, b.y + b.height / 2);
    await sleep(90);
    this.log("click", label, b);
    await this.page.mouse.down(); await sleep(95); await this.page.mouse.up();
    await sleep(after);
  }
  // Clear the field and type at human speed (40-70 ms per key).
  async type(target, text, label, { after = 700, clear = true } = {}) {
    await this.click(target, label, { after: 200 });
    if (clear) { await this.page.keyboard.press("Control+A"); await this.page.keyboard.press("Backspace"); await sleep(120); }
    const { b } = await this.box(target);
    this.log("type", label, b);
    for (const ch of String(text)) { await this.page.keyboard.type(ch); await sleep(rnd(40, 70)); }
    await sleep(after);
  }
  async select(target, value, label, { after = 800 } = {}) {
    await this.click(target, label, { after: 250 });
    await this.page.locator(target).first().selectOption(value);
    await sleep(after);
  }
  // Date and time inputs do not take key-by-key typing reliably: focus on camera, then set the value.
  async fill(target, value, label, { after = 700 } = {}) {
    await this.click(target, label, { after: 200 });
    await this.page.locator(target).first().fill(value);
    await sleep(after);
  }
  async key(k, label, { after = 600 } = {}) {
    this.log("key", label, { x: 0, y: 0, width: 0, height: 0 });
    await this.page.keyboard.press(k); await sleep(after);
  }
  // Drag a range input to a value with a visible eased drag.
  async slide(target, value, label, { after = 800 } = {}) {
    const { loc, b } = await this.box(target);
    const [min, max] = await loc.evaluate((el) => [+el.min, +el.max]);
    const cur = +(await loc.inputValue());
    const px = (v) => b.x + 10 + ((v - min) / (max - min)) * (b.width - 20);
    await this.glide(px(cur), b.y + b.height / 2, 300);
    this.log("drag", label, b);
    await this.page.mouse.down();
    await this.glide(px(value), b.y + b.height / 2, 500);
    await this.page.mouse.up();
    // Snap to the exact value the narration names (the drag lands within one step of it).
    await loc.evaluate((el, v) => { el.value = String(v); el.dispatchEvent(new Event("input", { bubbles: true })); }, value);
    await sleep(after);
  }
  async scroll(dy, { ms = 900 } = {}) {
    const n = 30;
    for (let i = 0; i < n; i++) { await this.page.mouse.wheel(0, dy / n); await sleep(ms / n); }
    await sleep(400);
  }
  async go(hash) { await this.page.evaluate((h) => (location.hash = h), hash); await sleep(900); }
}

// Word timings from Phase 4 (audio/<id>.words.json): [{w, s, e}] in seconds.
function cueTime(words, phrase, fromIdx) {
  const toks = phrase.toLowerCase().split(/\s+/);
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9₹]/g, "");
  for (let i = fromIdx; i < words.length; i++) {
    if (toks.every((t, k) => words[i + k] && norm(words[i + k].w) === norm(t))) return [words[i].s * 1000, i + toks.length];
  }
  throw new Error(`cue "${phrase}" not found in narration`);
}

/**
 * Record one scene.
 * scene = { id, url?, setup?(d), beats: [{ at?: "cue words", run: async (d) => {} }], tail? }
 * Each beat starts when the voiceover reaches its cue word (minus a 250 ms lead so the cursor
 * is already moving as the word is said), or evenly spread if it has no cue.
 */
export async function recordScene(scene, { theme = "light", outDir = path.join(VIDEO, "record/raw") } = {}) {
  const audioDir = path.join(VIDEO, "audio");
  const words = JSON.parse(fs.readFileSync(path.join(audioDir, `${scene.id}.words.json`), "utf8"));
  const durMs = JSON.parse(fs.readFileSync(path.join(audioDir, "durations.json"), "utf8"))[scene.id] * 1000;
  fs.mkdirSync(outDir, { recursive: true });
  const tmp = path.join(outDir, "_tmp_" + scene.id);
  fs.rmSync(tmp, { recursive: true, force: true });

  const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
  const context = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: theme,
    recordVideo: { dir: tmp, size: { width: W, height: H } }, acceptDownloads: true,
  });
  await context.addInitScript(CURSOR_JS);
  const tPage = Date.now();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const d = new Director(page, scene.id);
  d.downloads = [];
  page.on("download", (dl) => d.downloads.push(dl.suggestedFilename()));

  // scene.href: absolute URL (e.g. API docs); scene.blank: start on an empty tab so opening the app is filmed.
  if (scene.blank) await page.goto("about:blank");
  else if (scene.href) await page.goto(scene.href, { waitUntil: "networkidle" });
  else {
    // No networkidle: the live event stream keeps a request open for the life of the page.
    await page.goto(APP + "/" + (scene.url || ""), { waitUntil: "load" });
    await page.waitForSelector('.live[data-state="live"]', { timeout: 15000 }).catch(() => {});
    await sleep(500);
  }
  await page.mouse.move(d.x, d.y);
  if (scene.setup) await scene.setup(d);
  await sleep(600);
  const trimStart = (Date.now() - tPage) / 1000;
  d.start();

  let wi = 0, recorded;
  const n = scene.beats.length;
  d.late = [];
  try {
    for (let i = 0; i < n; i++) {
      const beat = scene.beats[i];
      let at;
      if (beat.at) [at, wi] = cueTime(words, beat.at, wi);
      else at = (i / n) * durMs * 0.92;
      const wait = at - 250 - d.now();
      if (wait > 0) await sleep(wait);
      else if (wait < -1500) d.late.push(`${beat.at || i}: ${(-wait / 1000).toFixed(1)}s late`);
      await beat.run(d);
    }
    const hold = durMs + 600 - d.now();
    if (hold > 0) await sleep(hold);
    recorded = d.now();
  } finally {
    await context.close();
    await browser.close();
  }

  const webm = fs.readdirSync(tmp).find((f) => f.endsWith(".webm"));
  const mp4 = path.join(outDir, `${scene.id}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", trimStart.toFixed(3), "-i", path.join(tmp, webm),
    "-t", (recorded / 1000).toFixed(3), "-r", "30", "-c:v", "libx264", "-crf", "18", "-preset", "medium",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
  fs.rmSync(tmp, { recursive: true, force: true });

  const evDir = path.join(VIDEO, "record/events");
  fs.mkdirSync(evDir, { recursive: true });
  fs.writeFileSync(path.join(evDir, `${scene.id}.json`), JSON.stringify(d.events, null, 1));
  return { id: scene.id, mp4, recordedMs: recorded, audioMs: Math.round(durMs), events: d.events.length, errors, downloads: d.downloads, late: d.late };
}
