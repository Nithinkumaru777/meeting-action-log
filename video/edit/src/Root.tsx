import React from "react";
import { AbsoluteFill, Composition, Img, Series, Still, staticFile, useCurrentFrame } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import T from "./timeline.json";
import { C, SANS, SERIF, ramp, type Word } from "./theme";
import { BrandMark, Canvas, ProgressBar } from "./ui";
import { ChapterCard, MG } from "./mg";
import { RecScene, type Ev } from "./rec";

type Scene = { id: string; type: string; onscreen: string[]; words: Word[]; cap: Word[]; frames: number; events: Ev[]; videoFrames?: number; step?: number; steps?: number };
type Chap = { num: number; title: string; frames: number; start: number; card: { id: string; frames: number }; scenes: Scene[] };
const CH = T.chapters as Chap[];
const STARTS = CH.map((c) => c.start);
const LABEL: Record<string, string> = { g1: "Open the app" };

const SceneView: React.FC<{ s: Scene; ch: Chap }> = ({ s, ch }) => {
  if (s.type === "MG") {
    const M = MG[s.id];
    if (!M) throw new Error(`no motion graphic for ${s.id}`);
    return <M id={s.id} words={s.cap} />;
  }
  if (!s.videoFrames) throw new Error(`recording missing for ${s.id}; run record.mjs then prep.mjs`);
  return <RecScene id={s.id} words={s.cap} events={s.events} videoFrames={s.videoFrames} chapter={`Chapter ${ch.num} · ${ch.title}`}
    label={LABEL[s.id] ?? s.onscreen[0]} step={s.step!} steps={s.steps!} />;
};

export const Chapter: React.FC<{ num: number }> = ({ num }) => {
  const ch = CH.find((c) => c.num === num)!;
  const frame = useCurrentFrame();
  const edge = Math.min(ramp(frame, 0, 8), 1 - ramp(frame, ch.frames - 8, 8));
  return (
    <AbsoluteFill style={{ background: C.canvas }}>
      <TransitionSeries name={`Chapter ${num}`}>
        <TransitionSeries.Sequence name={`Card ${num}`} durationInFrames={ch.card.frames}>
          <ChapterCard num={ch.num} title={ch.title} id={ch.card.id} />
        </TransitionSeries.Sequence>
        {ch.scenes.flatMap((s) => [
          <TransitionSeries.Transition key={s.id + "t"} presentation={fade()} timing={linearTiming({ durationInFrames: T.trans })} />,
          <TransitionSeries.Sequence key={s.id} name={s.id} durationInFrames={s.frames}><SceneView s={s} ch={ch} /></TransitionSeries.Sequence>,
        ])}
      </TransitionSeries>
      <ProgressBar globalFrame={ch.start + frame} total={T.total} starts={STARTS} />
      {/* dip to canvas at chapter edges so the ffmpeg joins are invisible */}
      <AbsoluteFill style={{ background: C.canvas, opacity: 1 - edge }} />
    </AbsoluteFill>
  );
};

const Full: React.FC = () => (
  <Series>{CH.map((c) => <Series.Sequence key={c.num} name={`Chapter ${c.num}`} durationInFrames={c.frames}><Chapter num={c.num} /></Series.Sequence>)}</Series>
);

/** 1280x720 thumbnail: brand + a real frame of the decision inbox recording. */
const Thumbnail: React.FC = () => (
  <Canvas>
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 28, background: C.teal }} />
    <div style={{ position: "absolute", right: -40, top: 90, width: 720, height: 405, border: `1.5px solid ${C.teal}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 18px 50px -18px rgba(19,32,31,0.35)" }}>
      <Img src={staticFile("thumb-frame.png")} style={{ width: 1280, height: 720, transform: "scale(0.5625)", transformOrigin: "0 0" }} />
    </div>
    <div style={{ position: "absolute", left: 70, top: 66, display: "flex", alignItems: "center", gap: 14 }}>
      <BrandMark size={52} /><span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 38, color: C.ink }}>MeetingActionLog</span>
    </div>
    <div style={{ position: "absolute", left: 70, top: 170, width: 470, fontFamily: SERIF, fontWeight: 600, fontSize: 82, lineHeight: 1.02, color: C.ink, letterSpacing: "-0.02em" }}>
      Every decision gets an <span style={{ color: C.teal }}>owner</span>
    </div>
    <div style={{ position: "absolute", left: 70, top: 560, fontFamily: SANS, fontSize: 30, fontWeight: 600, color: C.ink2 }}>Full guide · every feature</div>
  </Canvas>
);

export const RemotionRoot: React.FC = () => (
  <>
    {CH.map((c) => (
      <Composition key={c.num} id={`Ch${String(c.num).padStart(2, "0")}`} component={Chapter} defaultProps={{ num: c.num }}
        durationInFrames={c.frames} fps={T.fps} width={1920} height={1080} />
    ))}
    <Composition id="Full" component={Full} durationInFrames={T.total} fps={T.fps} width={1920} height={1080} />
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
  </>
);
