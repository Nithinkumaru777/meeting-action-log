// Render review stills at chosen moments: node stills.mjs id@secondsIntoScene ...  (e.g. h1@20 as6@1.3 c6@1)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const HERE = import.meta.dirname;
const T = JSON.parse(fs.readFileSync(path.join(HERE, "src/timeline.json"), "utf8"));
const out = "../output/qa/stills";
fs.mkdirSync(path.join(HERE, out), { recursive: true });
for (const spec of process.argv.slice(2)) {
  const [id, sec] = spec.split("@");
  let ch, local;
  for (const c of T.chapters) {
    if (id === c.card.id) { ch = c; local = 0; break; }
    let t = c.card.frames - T.trans;
    for (const s of c.scenes) { if (s.id === id) { ch = c; local = t; break; } t += s.frames - T.trans; }
    if (ch) break;
  }
  if (!ch) throw new Error("unknown scene " + id);
  const frame = local + Math.round(+sec * T.fps);
  const comp = `Ch${String(ch.num).padStart(2, "0")}`;
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["remotion", "still", comp, `${out}/${id}-${sec}.png`, `--frame=${frame}`, "--log=error"],
    { cwd: HERE, shell: true, stdio: "inherit" });
  console.log(`${spec} -> ${comp} frame ${frame}`);
}
