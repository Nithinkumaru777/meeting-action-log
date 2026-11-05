// Signal Ledger v2 tokens, copied from client/src/styles/tokens.css so the video matches the app.
import { loadFont as loadSerif } from "@remotion/google-fonts/Newsreader";
import { loadFont as loadSans } from "@remotion/google-fonts/SchibstedGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import { Easing, interpolate } from "remotion";

export const SERIF = loadSerif("normal", { weights: ["500", "600"], subsets: ["latin"] }).fontFamily;
export const SERIF_I = loadSerif("italic", { weights: ["500"], subsets: ["latin"] }).fontFamily;
export const SANS = loadSans("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const MONO = loadMono("normal", { weights: ["500"], subsets: ["latin"] }).fontFamily;

export const C = {
  canvas: "#F0EEE9", canvas2: "#E6E3DB", sheet: "#F8F7F3", rule: "#D3CEC3", ruleStrong: "#B4AEA1",
  ink: "#13201F", ink2: "#47524F", ink3: "#5A6663",
  teal: "#0F5257", tealInk: "#F0EEE9", tealSoft: "#D3E5E2",
  coral: "#A8321F", coralHi: "#E0533A", coralSoft: "#F5DDD5",
  amber: "#8A5A00", amberHi: "#E3A21A", amberSoft: "#F4E5C2",
  done: "#2F6B3A", doneSoft: "#DCEAD3",
  fuchsia: "#A0216E", fuchsiaSoft: "#F5D9E8",
};

export const W = 1920, H = 1080;

export const arrive = Easing.out(Easing.exp);
export const camera = Easing.inOut(Easing.cubic);
export const leave = Easing.in(Easing.poly(4));

/** 0 -> 1 over [start, start+dur] frames with an easing, clamped. */
export const ramp = (frame: number, start: number, dur: number, easing = arrive) =>
  interpolate(frame, [start, start + dur], [0, 1], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export type Word = { w: string; s: number; e: number };

/** Frame at which `phrase` is spoken (first match). Throws if absent, so script edits can't silently desync. */
export function cue(words: Word[], phrase: string, fps = 30): number {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const toks = phrase.split(/\s+/).map(norm);
  for (let i = 0; i < words.length; i++) {
    if (toks.every((t, k) => words[i + k] && norm(words[i + k].w) === t)) return Math.round(words[i].s * fps);
  }
  throw new Error(`cue "${phrase}" not in narration`);
}

/** The app's listcheck brand icon. */
export const MARK_PATHS = ["M4 6h10", "M4 12h7", "M4 18h7", "M14 16l3 3 5-6"];
