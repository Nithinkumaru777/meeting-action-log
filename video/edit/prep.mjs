// Builds the edit's inputs from Phase 4/5 outputs: copies audio + recordings into public/, writes src/timeline.json.
//   node prep.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUB = path.join(import.meta.dirname, "public");
const FPS = 30, TRANS = 12, TAIL = 0.6, CARD_TAIL = 0.5;
const audio = path.join(ROOT, "audio"), rec = path.join(ROOT, "record");

const scenes = JSON.parse(fs.readFileSync(path.join(audio, "scenes.json"), "utf8"));
const durs = JSON.parse(fs.readFileSync(path.join(audio, "durations.json"), "utf8"));
const probe = (f) => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" });

fs.mkdirSync(path.join(PUB, "audio"), { recursive: true });
fs.mkdirSync(path.join(PUB, "rec"), { recursive: true });
const copy = (src, dst) => { if (!fs.existsSync(dst) || fs.statSync(src).mtimeMs > fs.statSync(dst).mtimeMs) fs.copyFileSync(src, dst); };

// edge-tts word boundaries carry no punctuation, split "Next.js" into Next / . / js, and sometimes merge
// ("Chapter 1" as one boundary). Align on the normalised character stream instead of word by word, so each
// script token ("assessment.") gets the time of the speech characters it covers; a speech word spanning
// several tokens is split by character share.
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9₹]/g, "");
function captionWords(words, narration) {
  const sp = [];
  let P = "";
  for (const w of words) { const n = norm(w.w); if (n) { sp.push({ a: P.length, b: P.length + n.length, s: w.s, e: w.e }); P += n; } }
  const toks = narration.split(/\s+/).filter(Boolean);
  let S = "";
  const tk = toks.map((t) => { const n = norm(t); const r = { w: t, a: S.length, b: S.length + n.length }; S += n; return r; });
  if (S !== P) {
    let k = 0; while (k < S.length && S[k] === P[k]) k++;
    throw new Error(`caption align: script and speech differ at "${S.slice(k, k + 20)}" vs "${P.slice(k, k + 20)}"`);
  }
  const timeAt = (pos, end) => {
    const w = sp.find((x) => (end ? pos > x.a && pos <= x.b : pos >= x.a && pos < x.b)) ?? (end ? sp[sp.length - 1] : sp[0]);
    return w.s + ((pos - w.a) / (w.b - w.a)) * (w.e - w.s);
  };
  const out = [];
  for (const t of tk) {
    if (t.a === t.b) { if (out.length) out[out.length - 1].w += " " + t.w; continue; } // punctuation-only token
    out.push({ w: t.w, s: +timeAt(t.a, false).toFixed(3), e: +timeAt(t.b, true).toFixed(3) });
  }
  return out;
}

const chapters = [];
const missing = [];
for (const s of scenes) {
  let ch = chapters.find((c) => c.num === s.chapter);
  if (!ch) {
    const id = `c${s.chapter}`;
    copy(path.join(audio, id + ".mp3"), path.join(PUB, "audio", id + ".mp3"));
    ch = { num: s.chapter, title: s.chapterTitle, card: { id, frames: Math.ceil((durs[id] + CARD_TAIL) * FPS),
      words: JSON.parse(fs.readFileSync(path.join(audio, id + ".words.json"), "utf8")) }, scenes: [] };
    ch.card.cap = captionWords(ch.card.words, `Chapter ${s.chapter}. ${s.chapterTitle.replace(":", ",")}.`);
    chapters.push(ch);
  }
  copy(path.join(audio, s.id + ".mp3"), path.join(PUB, "audio", s.id + ".mp3"));
  const item = { id: s.id, type: s.type, onscreen: s.onscreen, narration: s.narration,
    words: JSON.parse(fs.readFileSync(path.join(audio, s.id + ".words.json"), "utf8")),
    frames: Math.ceil((durs[s.id] + TAIL) * FPS), events: [] };
  item.cap = captionWords(item.words, s.narration);
  if (s.type === "REC") {
    const mp4 = path.join(rec, "raw", s.id + ".mp4"), ev = path.join(rec, "events", s.id + ".json");
    if (!fs.existsSync(mp4) || !fs.existsSync(ev)) { missing.push(s.id); }
    else {
      copy(mp4, path.join(PUB, "rec", s.id + ".mp4"));
      item.events = JSON.parse(fs.readFileSync(ev, "utf8"));
      item.videoFrames = Math.floor(probe(mp4) * FPS);
    }
  }
  ch.scenes.push(item);
}
// Thumbnail uses a real frame: the decision inbox from the dc1 recording.
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "4", "-i", path.join(rec, "raw", "dc1.mp4"), "-frames:v", "1",
  "-vf", "scale=1280:720", path.join(PUB, "thumb-frame.png")]);

let start = 0;
for (const ch of chapters) {
  const parts = [ch.card.frames, ...ch.scenes.map((s) => s.frames)];
  ch.frames = parts.reduce((a, b) => a + b, 0) - TRANS * (parts.length - 1);
  ch.start = start;
  start += ch.frames;
  // step numbering for the lower third: REC scenes within the chapter
  const recs = ch.scenes.filter((s) => s.type === "REC");
  recs.forEach((s, i) => { s.step = i + 1; s.steps = recs.length; });
}
const timeline = { fps: FPS, trans: TRANS, total: start, chapters };
fs.writeFileSync(path.join(import.meta.dirname, "src", "timeline.json"), JSON.stringify(timeline));
console.log(`${chapters.length} chapters, ${(start / FPS / 60).toFixed(2)} min` + (missing.length ? `, MISSING recordings: ${missing.join(" ")}` : ""));
for (const c of chapters) console.log(`  ch${c.num} ${(c.start / FPS).toFixed(1)}s +${(c.frames / FPS).toFixed(1)}s  ${c.title}`);
