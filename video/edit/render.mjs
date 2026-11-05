// Phase 7: render every chapter, join, normalise to -16 LUFS, cut per-chapter files, write SRT / script / chapters / thumbnail.
//   node render.mjs            # render all chapters (skips chapters whose MP4 is newer than timeline.json)
//   node render.mjs --force 6  # re-render chapter 6 then rebuild outputs
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const HERE = import.meta.dirname;
const OUT = path.resolve(HERE, "../output");
const CHO = path.join(OUT, "chapters");
const NAME = "MeetingActionLog";
const T = JSON.parse(fs.readFileSync(path.join(HERE, "src/timeline.json"), "utf8"));
const fps = T.fps;
fs.mkdirSync(CHO, { recursive: true });
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", maxBuffer: 1 << 28, ...opts });
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const slug = (s) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
const tc = (sec, sep = ",") => {
  const ms = Math.round(sec * 1000), h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`;
};
const yt = (sec) => { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return `${m}:${String(s).padStart(2, "0")}`; };

// ---- 1. render chapters ----
const args = process.argv.slice(2);
const force = args.includes("--force") ? args.filter((a) => /^\d+$/.test(a)).map(Number) : [];
const tlTime = fs.statSync(path.join(HERE, "src/timeline.json")).mtimeMs;
const raw = path.join(OUT, "_raw");
fs.mkdirSync(raw, { recursive: true });
for (const ch of T.chapters) {
  const f = path.join(raw, `ch${String(ch.num).padStart(2, "0")}.mp4`);
  if (fs.existsSync(f) && fs.statSync(f).mtimeMs > tlTime && !force.includes(ch.num) && !args.includes("--all")) { console.log(`ch${ch.num}: up to date`); continue; }
  console.log(`ch${ch.num}: rendering ${(ch.frames / fps).toFixed(1)}s ...`);
  const t0 = Date.now();
  run(npx, ["remotion", "render", `Ch${String(ch.num).padStart(2, "0")}`, path.relative(HERE, f).split(path.sep).join("/"), "--codec=h264", "--crf=18", "--audio-codec=aac", "--audio-bitrate=192k",
    `--concurrency=${process.env.RENDER_CONCURRENCY || 6}`, "--log=error"], { cwd: HERE, shell: true, stdio: "inherit" });
  console.log(`  done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

// ---- 2. join ----
const list = path.join(raw, "list.txt");
fs.writeFileSync(list, T.chapters.map((c) => `file 'ch${String(c.num).padStart(2, "0")}.mp4'`).join("\n"));
const joined = path.join(raw, "joined.mp4");
run("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", joined]);

// ---- 3. loudness: two-pass loudnorm to -16 LUFS integrated, -1.5 dBTP ----
const target = "I=-16:TP=-1.5:LRA=11";
// loudnorm prints its measurement JSON on stderr.
export function loudness(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", `loudnorm=${target}:print_format=json`, "-vn", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const j = r.stderr.match(/\{[^{}]*"input_i"[^{}]*\}/);
  if (!j) throw new Error("loudnorm measurement failed:\n" + r.stderr.slice(-800));
  return JSON.parse(j[0]);
}
const stats = loudness(joined);
console.log(`loudness before: ${stats.input_i} LUFS, true peak ${stats.input_tp} dBTP`);
const final = path.join(OUT, `${NAME}-Full-Guide.mp4`);
run("ffmpeg", ["-y", "-loglevel", "error", "-i", joined, "-c:v", "copy", "-af",
  `loudnorm=${target}:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true`,
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", final]);

// ---- 4. scene timing on the global clock ----
const sceneStarts = [];
for (const ch of T.chapters) {
  let t = ch.start + ch.card.frames - T.trans;
  for (const s of ch.scenes) { sceneStarts.push({ ch, s, start: t }); t += s.frames - T.trans; }
}

// ---- 5. per-chapter MP4s (accurate cuts from the normalised master) ----
for (const ch of T.chapters) {
  const f = path.join(CHO, `${String(ch.num).padStart(2, "0")}-${slug(ch.title)}.mp4`);
  run("ffmpeg", ["-y", "-loglevel", "error", "-ss", (ch.start / fps).toFixed(3), "-i", final, "-t", (ch.frames / fps).toFixed(3),
    "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", f]);
}

// ---- 6. SRT: same pages as the on-screen captions (<= ~2.3 s, sentence-aware, <= 84 chars, 2 lines max) ----
let srt = [], n = 1;
const pushCue = (ws, off) => {
  if (!ws.length) return;
  let text = "";
  text = ws.map((w) => w.w).join(" ");
  if (text.length > 42) { const mid = text.lastIndexOf(" ", Math.ceil(text.length / 2) + 4); if (mid > 0) text = text.slice(0, mid) + "\n" + text.slice(mid + 1); }
  srt.push(`${n++}\n${tc(off + ws[0].s)} --> ${tc(off + ws[ws.length - 1].e)}\n${text}\n`);
};
const groups = [...T.chapters.map((ch) => ({ off: ch.start / fps, words: ch.card.cap })), ...sceneStarts.map(({ s, start }) => ({ off: start / fps, words: s.cap }))]
  .sort((a, b) => a.off - b.off);
for (const g of groups) {
  let cur = [];
  for (const w of g.words) {
    if (cur.length && (w.e - cur[0].s > 2.6 || [...cur.map((c) => c.w), w.w].join(" ").length > 84)) { pushCue(cur, g.off); cur = []; }
    cur.push(w);
    if (/[.?!]$/.test(w.w)) { pushCue(cur, g.off); cur = []; } // never run a cue into the next sentence
  }
  pushCue(cur, g.off);
}
fs.writeFileSync(path.join(OUT, `${NAME}-Full-Guide.srt`), srt.join("\n"));

// ---- 7. chapters.txt + voiceover-script.md ----
fs.writeFileSync(path.join(OUT, "chapters.txt"), T.chapters.map((c) => `${yt(c.start / fps)} ${c.title}`).join("\n") + "\n");
let md = `# ${NAME} — Voiceover Script\n\nVoice: edge-tts en-IN-PrabhatNeural, rate +0%. Timestamps are positions in ${NAME}-Full-Guide.mp4.\n`;
for (const ch of T.chapters) {
  md += `\n## ${yt(ch.start / fps)} · Chapter ${ch.num}: ${ch.title}\n\n**[${yt(ch.start / fps)}] Card:** Chapter ${ch.num}. ${ch.title}.\n`;
  for (const { s, start } of sceneStarts.filter((x) => x.ch === ch)) md += `\n**[${yt(start / fps)}] ${s.id} (${s.type === "REC" ? "screen recording" : "motion graphic"}):** ${s.narration}\n`;
}
fs.writeFileSync(path.join(OUT, "voiceover-script.md"), md);
fs.writeFileSync(path.join(OUT, "_scene-starts.json"), JSON.stringify(sceneStarts.map(({ ch, s, start }) => ({ id: s.id, chapter: ch.num, start: start / fps, frames: s.frames }))));

// ---- 8. thumbnail ----
run(npx, ["remotion", "still", "Thumbnail", path.relative(HERE, path.join(OUT, "thumbnail.png")).split(path.sep).join("/"), "--log=error"], { cwd: HERE, shell: true, stdio: "inherit" });

const dur = +run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", final]);
console.log(`final: ${final}  ${yt(dur)} (${dur.toFixed(2)}s; timeline ${(T.total / fps).toFixed(2)}s)`);
