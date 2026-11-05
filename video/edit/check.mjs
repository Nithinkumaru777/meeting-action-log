// Phase 8 checks on the finished video. Writes ../output/qa/report.json and contact sheets of every click.
//   node check.mjs
import fs from "node:fs";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

const HERE = import.meta.dirname, OUT = path.resolve(HERE, "../output"), QA = path.join(OUT, "qa");
const final = path.join(OUT, "MeetingActionLog-Full-Guide.mp4");
const T = JSON.parse(fs.readFileSync(path.join(HERE, "src/timeline.json"), "utf8"));
const starts = JSON.parse(fs.readFileSync(path.join(OUT, "_scene-starts.json"), "utf8"));
fs.mkdirSync(QA, { recursive: true });
const ff = (args) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 1 << 28 }).stderr;
const report = {};

// duration
const dur = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", final], { encoding: "utf8" });
report.duration = { file: +dur.toFixed(2), timeline: +(T.total / T.fps).toFixed(2), diff: +(dur - T.total / T.fps).toFixed(2) };

// black / freeze (video) and silence (audio) in one decode each
const v = ff(["-i", final, "-vf", "blackdetect=d=0.3:pix_th=0.10,freezedetect=n=-60dB:d=2", "-an", "-f", "null", "-"]);
report.black = [...v.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => [+m[1], +m[2]]);
const fz = [...v.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)/g)].map((m) => [+m[1], +m[2]]);
report.freezes = fz.map(([a, b]) => ({ at: a, seconds: +(b - a).toFixed(2) }));
const a = ff(["-i", final, "-af", "silencedetect=noise=-45dB:d=0.2", "-vn", "-f", "null", "-"]);
const sil = [...a.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => [+m[1], +m[2]]);
report.silencesOver2s = sil.filter(([s, e]) => e - s > 2).map(([s, e]) => ({ at: s, seconds: +(e - s).toFixed(2) }));
const loud = ff(["-i", final, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-vn", "-f", "null", "-"]).match(/\{[^{}]*"input_i"[^{}]*\}/);
report.loudness = loud ? { integratedLUFS: +JSON.parse(loud[0]).input_i, truePeak: +JSON.parse(loud[0]).input_tp } : null;

// caption sync: each scene's first caption word vs the speech onset actually found in the mix
const onsets = sil.map(([, e]) => e);
const sceneById = Object.fromEntries(T.chapters.flatMap((c) => c.scenes).map((s) => [s.id, s]));
report.captionSync = starts.map(({ id, start }) => {
  const t = start + sceneById[id].words[0].s;
  const near = onsets.reduce((b, o) => (Math.abs(o - t) < Math.abs(b - t) ? o : b), Infinity);
  return { id, captionAt: +t.toFixed(2), speechAt: +near.toFixed(2), offsetMs: Math.round((near - t) * 1000) };
});
report.captionSyncMaxMs = Math.max(...report.captionSync.map((c) => Math.abs(c.offsetMs)));

// every click/type/drag event: frame from the FINAL render, tiled per scene
const shots = path.join(QA, "events");
fs.mkdirSync(shots, { recursive: true });
let n = 0;
for (const { id, start } of starts) {
  const ev = sceneById[id].events.filter((e) => e.width && e.action !== "hover");
  if (!ev.length) continue;
  const tmp = path.join(shots, "_" + id);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp);
  ev.forEach((e, i) => {
    const t = start + e.timeMs / 1000 + 0.2;
    ff(["-y", "-loglevel", "error", "-ss", t.toFixed(3), "-i", final, "-frames:v", "1", "-vf", "scale=640:-1", path.join(tmp, String(i + 1).padStart(3, "0") + ".png")]);
    n++;
  });
  const cols = Math.min(4, ev.length), rows = Math.ceil(ev.length / cols);
  ff(["-y", "-loglevel", "error", "-framerate", "1", "-i", path.join(tmp, "%03d.png"), "-vf", `tile=${cols}x${rows}:padding=6:color=0x17171A`, "-frames:v", "1", path.join(shots, id + ".jpg")]);
  fs.rmSync(tmp, { recursive: true, force: true });
}
report.eventFramesChecked = n;
fs.writeFileSync(path.join(QA, "report.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ duration: report.duration, black: report.black.length, freezes: report.freezes, silencesOver2s: report.silencesOver2s,
  loudness: report.loudness, captionSyncMaxMs: report.captionSyncMaxMs, eventFrames: n }, null, 1));
