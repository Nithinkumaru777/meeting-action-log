import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Freeze, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, H, SANS, W, ramp, type Word } from "./theme";
import { Captions, Canvas, LowerThird } from "./ui";

export type Ev = { timeMs: number; action: string; label: string; x: number; y: number; width: number; height: number };
type Cam = { s: number; x: number; y: number };

// Frame geometry: recording at 80% inside the canvas, caption band underneath.
export const FS = 0.8, FX = (W - W * FS) / 2, FY = 30;
const WIDE: Cam = { s: 1, x: W / 2, y: H / 2 };
const MOVE = 20, HOLD = 48, BACK = 22; // frames
// Clicks that change page: the ring and label leave with the old screen instead of floating over the new one.
const NAV = new Set(["Overdue", "Today", "Decision inbox", "Design system", "Back to Today"]);

const clampCam = (c: Cam): Cam => {
  const hw = W / (2 * c.s), hh = H / (2 * c.s);
  return { s: c.s, x: Math.min(W - hw, Math.max(hw, c.x)), y: Math.min(H - hh, Math.max(hh, c.y)) };
};
/** Zoom so the target fills about half the frame, between 1x and 1.7x; large targets stay wide. */
function camFor(e: Ev): Cam {
  let s = Math.min((0.42 * W) / Math.max(e.width, 1), (0.42 * H) / Math.max(e.height, 1), 1.7);
  if (s < 1.15) s = 1;
  return clampCam({ s, x: e.x + e.width / 2, y: e.y + e.height / 2 });
}

/** Keyframes: move to each event target just before it happens; return wide when the next event is far away. */
function buildCamera(events: Ev[], fps: number) {
  const keys: { f: number; to: Cam }[] = [];
  const targets = events.filter((e) => e.width > 0 && e.action !== "key");
  targets.forEach((e, i) => {
    const f = Math.round((e.timeMs / 1000) * fps);
    keys.push({ f: Math.max(0, f - MOVE + 4), to: camFor(e) });
    const next = targets[i + 1];
    const nf = next ? Math.round((next.timeMs / 1000) * fps) : Infinity;
    if (nf - f > HOLD + MOVE + BACK) keys.push({ f: f + HOLD, to: WIDE });
  });
  keys.sort((a, b) => a.f - b.f);
  return keys;
}
function camAt(keys: { f: number; to: Cam }[], frame: number, fps: number): Cam {
  let cur = WIDE;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (frame < k.f) break;
    const end = i + 1 < keys.length ? Math.min(frame, keys[i + 1].f) : frame;
    // Spring with damping 200: a settled, non-bouncing move (camera ease).
    const p = spring({ frame: end - k.f, fps, config: { damping: 200, stiffness: 90, mass: 1 }, durationInFrames: MOVE });
    cur = { s: cur.s + (k.to.s - cur.s) * p, x: cur.x + (k.to.x - cur.x) * p, y: cur.y + (k.to.y - cur.y) * p };
  }
  return cur;
}

export const RecScene: React.FC<{ id: string; words: Word[]; events: Ev[]; videoFrames: number; chapter: string; label: string; step: number; steps: number }> = ({ id, words, events, videoFrames, chapter, label, step, steps }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const keys = useMemo(() => buildCamera(events, fps), [events, fps]);
  const cam = camAt(keys, frame, fps);
  const tx = W / 2 - cam.x * cam.s, ty = H / 2 - cam.y * cam.s;
  const toScreen = (x: number, y: number) => ({ x: FX + (x * cam.s + tx) * FS, y: FY + (y * cam.s + ty) * FS });

  const video = <OffthreadVideo src={staticFile(`rec/${id}.mp4`)} muted style={{ width: W, height: H }} />;
  const marks = events.map((e, i) => {
    if (!e.width) return null;
    const f0 = Math.round((e.timeMs / 1000) * fps);
    const next = events[i + 1] ? Math.round((events[i + 1].timeMs / 1000) * fps) : Infinity;
    const end = Math.min(f0 + (e.action === "click" && NAV.has(e.label) ? 4 : 45), next - 2);
    if (frame < f0 - 6 || frame > end + 8) return null;
    const o = ramp(frame, f0 - 6, 6) * (1 - ramp(frame, end, 8));
    const strong = e.action !== "hover";
    // The ring marks the press only (~0.6 s): a click often navigates, and a lingering ring would sit on the next screen.
    const ringO = ramp(frame, f0 - 6, 6) * (1 - ramp(frame, Math.min(end, f0 + 18), 6));
    const tl = toScreen(e.x, e.y), br = toScreen(e.x + e.width, e.y + e.height);
    const above = tl.y > FY + 70;
    return (
      <React.Fragment key={i}>
        {strong && (
          <div style={{ position: "absolute", left: tl.x - 6, top: tl.y - 6, width: br.x - tl.x + 12, height: br.y - tl.y + 12,
            border: `3px solid ${C.teal}`, borderRadius: 6, opacity: ringO, boxShadow: `0 0 0 1.5px ${C.tealInk}` }} />
        )}
        <div style={{ position: "absolute", left: Math.min(Math.max(tl.x - 6, FX + 8), FX + W * FS - 380), top: above ? tl.y - 52 : br.y + 14, opacity: o,
          transform: `translateY(${(1 - ramp(frame, f0 - 6, 8)) * (above ? 8 : -8)}px)`,
          background: C.ink, color: "#fff", fontFamily: SANS, fontSize: 22, fontWeight: 600, padding: "6px 12px", borderRadius: 2,
          display: "flex", alignItems: "center", gap: 10, whiteSpace: "nowrap" }}>
          <span style={{ width: 10, height: 10, background: strong ? C.amberHi : C.ink3, display: "inline-block" }} />
          {e.label}
        </div>
      </React.Fragment>
    );
  });

  return (
    <Canvas>
      <div style={{ position: "absolute", left: FX, top: FY, width: W * FS, height: H * FS, borderRadius: 12, overflow: "hidden",
        border: `1.5px solid ${C.ink}`, boxShadow: "0 24px 60px rgba(19,32,31,0.16), 0 4px 14px rgba(19,32,31,0.08)", background: C.sheet }}>
        <div style={{ width: W, height: H, transformOrigin: "0 0", transform: `scale(${FS}) translate(${tx}px, ${ty}px) scale(${cam.s})` }}>
          {frame >= videoFrames - 1 ? <Freeze frame={videoFrames - 2}>{video}</Freeze> : video}
        </div>
      </div>
      <AbsoluteFill style={{ pointerEvents: "none" }}>{marks}</AbsoluteFill>
      <LowerThird chapter={chapter} label={label} step={step} steps={steps} left={FX + 28} bottom={H - FY - H * FS + 28} />
      <Audio src={staticFile(`audio/${id}.mp3`)} />
      <Captions words={words} bottom={34} />
    </Canvas>
  );
};

