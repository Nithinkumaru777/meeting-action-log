import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { createTikTokStyleCaptions, type Caption } from "@remotion/captions";
import { C, MARK_PATHS, SANS, SERIF, ramp, type Word } from "./theme";

/** The app's Cloud Dancer paper. */
export const Canvas: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: C.canvas }}>
    {children}
  </AbsoluteFill>
);

export const BrandMark: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <div style={{ width: size, height: size, background: C.teal, borderRadius: Math.max(2, size * 0.07), display: "grid", placeItems: "center", ...style }}>
    <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke={C.tealInk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {MARK_PATHS.map((d) => <path key={d} d={d} />)}
    </svg>
  </div>
);

/**
 * Two-line-max captions with each word lit as it is spoken. Pages come from @remotion/captions
 * (createTikTokStyleCaptions) over the edge-tts word boundaries. Own white sheet + ink rule, so it reads
 * on any background.
 */
export const Captions: React.FC<{ words: Word[]; bottom?: number }> = ({ words, bottom = 40 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages = useMemo(() => {
    // `words` are script tokens with punctuation (prep.mjs aligns them to the speech timings).
    // Page per sentence first, so a caption never runs on into the next sentence ("...the day On").
    const sentences: Caption[][] = [[]];
    words.forEach((w, i) => {
      const cur = sentences[sentences.length - 1];
      cur.push({ text: (cur.length ? " " : "") + w.w, startMs: w.s * 1000, endMs: w.e * 1000, timestampMs: w.s * 1000, confidence: null });
      if (/[.?!]$/.test(w.w) && i < words.length - 1) sentences.push([]);
    });
    return sentences.flatMap((captions) => createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: 2300 }).pages);
  }, [words]);
  const ms = (frame / fps) * 1000;
  const idx = pages.findIndex((p, i) => ms >= p.startMs && (i === pages.length - 1 || ms < pages[i + 1].startMs));
  if (idx < 0) return null;
  const page = pages[idx];
  const lastEnd = page.tokens[page.tokens.length - 1].toMs;
  if (idx === pages.length - 1 && ms > lastEnd + 900) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom, display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ maxWidth: 1480, background: C.sheet, border: `1.5px solid ${C.ink}`, padding: "10px 24px 12px", fontFamily: SANS,
        fontSize: 36, lineHeight: "48px", fontWeight: 500, textAlign: "center", color: C.ink3 }}>
        {page.tokens.map((t, i) => {
          const spoken = ms >= t.toMs, now = ms >= t.fromMs && ms < t.toMs;
          const lit = interpolate(ms, [t.fromMs - 40, t.fromMs + 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <span key={i} style={{ color: spoken || now ? C.ink : C.ink3, whiteSpace: "pre",
              background: now ? `rgba(211,229,226,${lit})` : "transparent", borderRadius: 2 }}>{t.text}</span>
          );
        })}
      </div>
    </div>
  );
};

/** Thin progress bar across the very bottom with chapter tick marks. */
export const ProgressBar: React.FC<{ globalFrame: number; total: number; starts: number[] }> = ({ globalFrame, total, starts }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: "rgba(19,32,31,0.10)" }}>
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(globalFrame / total) * 100}%`, background: C.teal }} />
    {starts.slice(1).map((s) => (
      <div key={s} style={{ position: "absolute", top: 0, bottom: 0, left: `${(s / total) * 100}%`, width: 3, background: C.canvas }} />
    ))}
  </div>
);

/** Lower third: chapter and feature name with a step counter; slides in, holds, leaves. */
export const LowerThird: React.FC<{ chapter: string; label: string; step: number; steps: number; left: number; bottom: number; hold?: number }> = ({ chapter, label, step, steps, left, bottom, hold = 150 }) => {
  const frame = useCurrentFrame();
  const inP = ramp(frame, 8, 16);
  const outP = ramp(frame, hold, 10, (t) => t * t * t * t);
  const x = interpolate(inP, [0, 1], [-40, 0]) - outP * 30;
  const o = inP * (1 - outP);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left, bottom, opacity: o, transform: `translateX(${x}px)`, background: C.sheet,
      border: `1.5px solid ${C.ink}`, boxShadow: `6px 6px 0 ${C.ink}`, padding: "14px 22px 16px", minWidth: 380 }}>
      <div style={{ fontFamily: SANS, fontSize: 18, fontWeight: 500, color: C.ink3, display: "flex", justifyContent: "space-between", gap: 24 }}>
        <span>{chapter}</span><span style={{ fontVariantNumeric: "tabular-nums", color: C.ink2 }}>Step {step} of {steps}</span>
      </div>
      <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 34, color: C.ink, marginTop: 4 }}>{label}</div>
      <div style={{ marginTop: 10, height: 4, background: C.rule }}>
        <div style={{ width: `${(step / steps) * 100}%`, height: "100%", background: C.teal }} />
      </div>
    </div>
  );
};

/** Per-word blur-in for titles (motion-craft: vary entrances; a landed title is still). */
export const BlurWords: React.FC<{ text: string; start: number; stagger?: number; style?: React.CSSProperties; hi?: string }> = ({ text, start, stagger = 2, style, hi }) => {
  const frame = useCurrentFrame();
  return (
    <span style={style}>
      {text.split(" ").map((w, i) => {
        const p = ramp(frame, start + i * stagger, 6);
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: p, filter: `blur(${(1 - p) * 6}px)`,
            background: hi && w.replace(/[.,]/g, "") === hi ? `linear-gradient(transparent 58%, ${C.tealSoft} 58%, ${C.tealSoft} 92%, transparent 92%)` : undefined }}>
            {w}{i < text.split(" ").length - 1 ? " " : ""}
          </span>
        );
      })}
    </span>
  );
};
