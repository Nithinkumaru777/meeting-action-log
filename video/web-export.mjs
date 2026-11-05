// Cuts the finished guide into one web clip per topic and writes the topic list the Tutorials page reads.
//   node video/web-export.mjs            # skips clips that already exist
//   node video/web-export.mjs --force    # re-encode everything
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const HERE = import.meta.dirname;
const MASTER = path.join(HERE, "output/MeetingActionLog-Full-Guide.mp4");
const THUMB = path.join(HERE, "output/thumbnail.png");
const PUBLIC_DIR = path.resolve(HERE, "../client/public/tutorial");
const MANIFEST = path.resolve(HERE, "../client/src/features/tutorials/topics.json");
const SKIP = new Set(["ou1"]); // the recap repeats everything; it stays in the full video only

const TITLES = {
  h1: "The problem MeetingActionLog solves", w1: "What MeetingActionLog is", a1: "Architecture and data flow", a2: "The tech stack",
  g1: "Open the app and find your way around",
  td1: "Read the four figures on Today", td2: "Tick off actions and close decisions", td3: "Weekly chart, late by owner and coming up",
  mt1: "Filter and search meetings", mt2: "Log a new meeting",
  md1: "Read and edit a meeting", md2: "Log a decision", md3: "Convert a decision into a task", md4: "Add an action and delete a meeting",
  dc1: "Use the decision inbox", dc2: "Convert from the inbox and undo",
  ov1: "Chase overdue work by owner",
  mb1: "Add, edit and remove team members",
  pw1: "Use the command palette", pw2: "Switch between light and dark", pw3: "Take the guided demo", pw4: "Live updates across desks", pw5: "The design system page",
  api1: "Read the REST API responses",
  va1: "Meeting form errors", va2: "Task and decision errors", va3: "Empty results and missing pages", va4: "Protected members and bad emails",
  rw1: "Worked example: log the meeting", rw2: "Worked example: record the decisions", rw3: "Worked example: assign owners", rw4: "Worked example: chase what is late",
  im1: "Real-world impact", im2: "What comes next",
};
// Spoken numbers read badly as text.
const WRITTEN = [
  ["seventy one percent", "71 percent"], ["one hundred and eighty two", "182"], ["S S L", "SSL"], ["port five thousand", "port 5000"],
  ["React nineteen", "React 19"], ["Express five", "Express 5"], ["twenty four endpoints", "24 endpoints"],
];

const force = process.argv.includes("--force");
const T = JSON.parse(fs.readFileSync(path.join(HERE, "edit/src/timeline.json"), "utf8"));
const starts = new Map(JSON.parse(fs.readFileSync(path.join(HERE, "output/_scene-starts.json"), "utf8")).map((s) => [s.id, s.start]));
const CLIPS = path.join(PUBLIC_DIR, "clips");
fs.mkdirSync(CLIPS, { recursive: true });
const WEB = ["-c:v", "libx264", "-crf", "27", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart"];
const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: ["ignore", "ignore", "pipe"] });
const fmt = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;

const chapters = [];
for (const ch of T.chapters) {
  const topics = [];
  for (const s of ch.scenes) {
    if (SKIP.has(s.id)) continue;
    if (!TITLES[s.id]) throw new Error(`no title for scene ${s.id}`);
    if (!starts.has(s.id)) throw new Error(`no start time for scene ${s.id}`);
    const seconds = (s.frames - T.trans) / T.fps;
    const out = path.join(CLIPS, `${s.id}.mp4`);
    if (force || !fs.existsSync(out)) {
      // The scene's first frames cross-fade from the previous scene, so fade in from the page colour instead.
      ff(["-ss", starts.get(s.id).toFixed(3), "-i", MASTER, "-t", seconds.toFixed(3), "-vf", "fade=in:st=0:d=0.4", ...WEB, out]);
      console.log(`clip ${s.id} ${fmt(seconds)}`);
    }
    let description = s.narration;
    for (const [a, b] of WRITTEN) description = description.split(a).join(b);
    topics.push({ id: s.id, title: TITLES[s.id], description, duration: fmt(seconds), src: `/tutorial/clips/${s.id}.mp4` });
  }
  if (topics.length) chapters.push({ num: ch.num, title: ch.title, topics });
}

const full = path.join(PUBLIC_DIR, "full.mp4");
if (force || !fs.existsSync(full)) { ff(["-i", MASTER, ...WEB, full]); console.log("full video"); }
ff(["-i", THUMB, "-q:v", "3", path.join(PUBLIC_DIR, "poster.jpg")]);

const stray = Object.keys(TITLES).filter((id) => !chapters.some((c) => c.topics.some((t) => t.id === id)));
if (stray.length) throw new Error(`titles without a scene: ${stray.join(" ")}`);
const totalSec = T.total / T.fps;
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
fs.writeFileSync(MANIFEST, JSON.stringify({ full: { src: "/tutorial/full.mp4", poster: "/tutorial/poster.jpg", duration: fmt(totalSec) }, chapters }, null, 2) + "\n");
const mb = fs.readdirSync(CLIPS).reduce((a, f) => a + fs.statSync(path.join(CLIPS, f)).size, fs.statSync(full).size) / 1e6;
console.log(`done: ${chapters.flatMap((c) => c.topics).length} topics, ${Math.round(mb)} MB`);
