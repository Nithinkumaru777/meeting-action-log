// Motion-graphic scenes, built in code (no stock footage). Every beat is keyed to the frame where the
// narration says it (cue), so picture and voice stay locked even if a line is re-voiced.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, MONO, SANS, SERIF, arrive, camera, cue, ramp, type Word } from "./theme";
import { BlurWords, BrandMark, Canvas, Captions } from "./ui";

type P = { id: string; words: Word[] };
const Shell: React.FC<P & { children: React.ReactNode }> = ({ id, words, children }) => (
  <Canvas>
    {children}
    <Audio src={staticFile(`audio/${id}.mp3`)} />
    <Captions words={words} bottom={34} />
  </Canvas>
);
const sheet = (extra: React.CSSProperties = {}): React.CSSProperties => ({ background: C.sheet, border: `1.5px solid ${C.rule}`, ...extra });
const Eyebrow: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = C.ink3 }) => (
  <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: "0.08em", textTransform: "uppercase", color }}>{children}</div>
);
const Title: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 72, style }) => (
  <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: size, lineHeight: 1.05, color: C.ink, letterSpacing: "-0.015em", ...style }}>{children}</div>
);

/* ---------------- Chapter card ---------------- */
export const ChapterCard: React.FC<{ num: number; title: string; id: string }> = ({ num, title, id }) => {
  const frame = useCurrentFrame();
  return (
    <Canvas>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: interpolate(ramp(frame, 0, 18, camera), [0, 1], [0, 64]), background: C.teal }} />
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 220px" }}>
        <div style={{ opacity: ramp(frame, 2, 10) }}><Eyebrow color={C.teal}>Chapter {String(num).padStart(2, "0")}</Eyebrow></div>
        <Title size={112} style={{ marginTop: 18, maxWidth: 1500 }}><BlurWords text={title} start={6} stagger={3} /></Title>
        <div style={{ height: 2, background: C.teal, marginTop: 40, width: interpolate(ramp(frame, 10, 24, camera), [0, 1], [0, 760]) }} />
      </AbsoluteFill>
      <Audio src={staticFile(`audio/${id}.mp3`)} />
    </Canvas>
  );
};

/* ---------------- 1. Hook ---------------- */
const DECISIONS = ["Move the export to sprint 15", "Cut signup to three fields", "Rotate on-call weekly"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
export const Hook: React.FC<P> = ({ id, words }) => {
  const frame = useCurrentFrame();
  const fThree = cue(words, "Three things"), fNods = cue(words, "Everyone nods"), fFri = cue(words, "By Friday"), fSurvey = cue(words, "In a Harvard"), fLoss = cue(words, "The real loss");
  const statIn = ramp(frame, fSurvey - 6, 18, camera);
  const lossIn = ramp(frame, fLoss - 4, 16, camera);
  const pct = interpolate(frame, [fSurvey + 40, fSurvey + 110], [0, 71], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: arrive });
  const day = Math.min(4, Math.floor(interpolate(frame, [fNods, fFri + 6], [0, 4.99], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  return (
    <Shell id={id} words={words}>
      {statIn < 1 && (
        <div style={{ position: "absolute", left: 140, right: 140, top: 110, opacity: 1 - statIn }}>
          <div style={{ opacity: ramp(frame, 4, 12) }}><Eyebrow>Monday · 10:00 AM IST · Bengaluru</Eyebrow></div>
          <Title style={{ marginTop: 14, opacity: ramp(frame, 8, 14) }}>Planning meeting, 45 minutes</Title>
          <div style={{ marginTop: 44, display: "grid", gridTemplateColumns: "1fr 330px", gap: 12, width: 1100 }}>
            {DECISIONS.map((t, i) => {
              const p = ramp(frame, fThree + 12 + i * 12, 14);
              return (
                <React.Fragment key={t}>
                  <div style={{ ...sheet({ padding: "22px 28px" }), fontFamily: SERIF, fontSize: 36, color: C.ink, opacity: p, transform: `translateY(${(1 - p) * 14}px)` }}>{t}</div>
                  <div style={{ border: `2px dashed ${C.coral}`, padding: "22px 24px", fontFamily: SANS, fontSize: 30, fontWeight: 600, color: C.coral, opacity: ramp(frame, fNods - 6 + i * 8, 12) }}>No owner</div>
                </React.Fragment>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 56, opacity: ramp(frame, fNods, 12) }}>
            {DAYS.map((d, i) => (
              <div key={d} style={{ width: 160, padding: "14px 0", textAlign: "center", fontFamily: MONO, fontSize: 28,
                background: i <= day ? C.teal : C.sheet, color: i <= day ? C.tealInk : C.ink3, border: `1.5px solid ${i <= day ? C.teal : C.rule}` }}>{d}</div>
            ))}
            <div style={{ marginLeft: 26, alignSelf: "center", fontFamily: SERIF, fontSize: 40, color: C.coral, opacity: ramp(frame, fFri + 16, 14) }}>Nobody remembers who.</div>
          </div>
        </div>
      )}
      {statIn > 0 && lossIn < 1 && (
        <div style={{ position: "absolute", left: 140, right: 140, top: 130, opacity: statIn * (1 - lossIn) }}>
          <div style={{ fontFamily: SANS, fontSize: 34, color: C.ink2 }}>Senior managers who said meetings are unproductive and inefficient</div>
          <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 300, lineHeight: 1.05, color: C.teal, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>{Math.round(pct)}%</div>
          <div style={{ display: "flex", height: 54, border: `1.5px solid ${C.teal}` }}>
            <div style={{ width: `${pct}%`, background: C.teal }} />
          </div>
          <div style={{ fontFamily: SANS, fontSize: 24, color: C.ink3, marginTop: 20 }}>Survey of 182 senior managers. Source: Harvard Business Review, July-August 2017</div>
        </div>
      )}
      {lossIn > 0 && (
        <AbsoluteFill style={{ justifyContent: "center", padding: "0 160px 140px", opacity: lossIn }}>
          <Title size={92}>Decisions that leave the room <span style={{ color: C.fuchsia }}>without an owner.</span></Title>
          <Title size={92} style={{ marginTop: 34, opacity: ramp(frame, cue(words, "and the tasks"), 14) }}>Deadlines that slip <span style={{ color: C.coral }}>unnoticed.</span></Title>
        </AbsoluteFill>
      )}
    </Shell>
  );
};

/* ---------------- 2. What it is ---------------- */
export const WhatIs: React.FC<P> = ({ id, words }) => {
  const frame = useCurrentFrame();
  const fFor = cue(words, "It is built"), fRec = cue(words, "It records"), fOut = cue(words, "The outcome");
  const AUD = [["Team leads", "who run meetings"], ["Task owners", "who do the work"], ["Managers", "who watch what slips"]];
  const CHIPS = ["Owner", "Due date", "Priority"];
  return (
    <Shell id={id} words={words}>
      <div style={{ position: "absolute", left: 140, top: 120, display: "flex", alignItems: "center", gap: 28, opacity: ramp(frame, 2, 12) }}>
        <BrandMark size={96} />
        <Title size={104}><BlurWords text="MeetingActionLog" start={8} /></Title>
      </div>
      <div style={{ position: "absolute", left: 140, top: 260, fontFamily: SERIF, fontSize: 48, color: C.ink2, opacity: ramp(frame, 26, 14) }}>A full stack ledger for meetings, decisions and follow up.</div>
      <div style={{ position: "absolute", left: 140, top: 380, display: "flex", gap: 22 }}>
        {AUD.map(([a, b], i) => {
          const p = ramp(frame, fFor + 26 + i * 44, 14);
          return <div key={a} style={{ ...sheet({ padding: "26px 32px", width: 480 }), opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>
            <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 44, color: C.teal }}>{a}</div>
            <div style={{ fontFamily: SANS, fontSize: 28, color: C.ink2, marginTop: 6 }}>{b}</div>
          </div>;
        })}
      </div>
      <div style={{ position: "absolute", left: 140, top: 590, display: "flex", gap: 16, alignItems: "center" }}>
        {CHIPS.map((c, i) => {
          const p = ramp(frame, fRec + 90 + i * 20, 10);
          return <span key={c} style={{ background: C.tealSoft, color: C.teal, fontFamily: SANS, fontWeight: 600, fontSize: 32, padding: "10px 24px", opacity: p }}>{c}</span>;
        })}
      </div>
      <Title size={72} style={{ position: "absolute", left: 140, top: 700, opacity: ramp(frame, fOut, 14) }}>Every decision leaves the room with an <span style={{ color: C.teal }}>owner</span> and a <span style={{ color: C.teal }}>date.</span></Title>
    </Shell>
  );
};

/* ---------------- 3. Architecture ---------------- */
const STAGES = [
  { t: "Middleware", s: "Request id · rate limit · Zod", at: "a middleware chain" },
  { t: "Controller", s: "Reads the request", at: "a controller hands" },
  { t: "Service", s: "Business rules", at: "a service" },
  { t: "Mongoose models", s: "Member · Meeting · Decision · Action", at: "through Mongoose models" },
];
export const Architecture: React.FC<P> = ({ id, words }) => {
  const frame = useCurrentFrame();
  const fApi = cue(words, "REST API"), fDb = cue(words, "into MongoDB"), fSse = cue(words, "broadcasts");
  const X0 = 110, BW = 230, GAP = 30, Y = 300, H0 = 230;
  const apiX = X0 + BW + 50;
  const stageX = (i: number) => apiX + 24 + i * (BW + GAP);
  const dbX = stageX(4) + 30;
  const stops = [
    { f: cue(words, "JSON request"), x: X0 + BW + 12 },
    ...STAGES.map((s, i) => ({ f: cue(words, s.at), x: stageX(i) + BW / 2 })),
    { f: fDb, x: dbX + BW / 2 - 30 },
  ];
  let px = stops[0].x;
  stops.forEach((s, i) => { if (i > 0) px = interpolate(frame, [s.f - 10, s.f + 6], [px, s.x], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: camera }); });
  const pOp = ramp(frame, stops[0].f - 4, 6) * (1 - ramp(frame, fSse - 4, 8));
  const pulse = interpolate(frame, [fSse + 6, fSse + 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: camera });
  return (
    <Shell id={id} words={words}>
      <Title size={64} style={{ position: "absolute", left: 110, top: 90, opacity: ramp(frame, 2, 12) }}>From a click to the whole team's screen</Title>
      <div style={{ ...sheet({ position: "absolute", left: X0, top: Y, width: BW, height: H0, padding: 22, border: `1.5px solid ${C.teal}` }), opacity: ramp(frame, 12, 12) }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: C.ink }}>React app</div>
        <div style={{ fontFamily: SANS, fontSize: 24, color: C.ink2, marginTop: 8 }}>The browser</div>
      </div>
      <div style={{ position: "absolute", left: apiX, top: Y - 60, width: stageX(3) + BW + 24 - apiX, height: H0 + 90, border: `1.5px solid ${C.ruleStrong}`, opacity: ramp(frame, fApi - 4, 12) }}>
        <div style={{ fontFamily: MONO, fontSize: 22, color: C.ink3, padding: "12px 24px" }}>EXPRESS 5 REST API</div>
      </div>
      {STAGES.map((s, i) => {
        const f = cue(words, s.at), p = ramp(frame, f - 4, 12), active = frame >= f - 4 && frame < (STAGES[i + 1] ? cue(words, STAGES[i + 1].at) - 4 : fDb - 4);
        return <div key={s.t} style={{ position: "absolute", left: stageX(i), top: Y, width: BW, height: H0, padding: 22, opacity: p,
          background: active ? C.teal : C.sheet, color: active ? C.tealInk : C.ink, border: `1.5px solid ${active ? C.teal : C.rule}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30 }}>{s.t}</div>
          <div style={{ fontFamily: SANS, fontSize: 23, marginTop: 8, opacity: 0.82 }}>{s.s}</div>
        </div>;
      })}
      <div style={{ ...sheet({ position: "absolute", left: dbX, top: Y, width: BW - 40, height: H0, padding: 22, border: `1.5px solid ${C.done}` }), opacity: ramp(frame, fDb - 4, 12) }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.done }}>MongoDB</div>
        <div style={{ fontFamily: SANS, fontSize: 23, color: C.ink2, marginTop: 8 }}>Saved</div>
      </div>
      <div style={{ position: "absolute", left: px - 13, top: Y + H0 + 14, width: 26, height: 26, background: C.amberHi, opacity: pOp }} />
      {/* live event returning */}
      <div style={{ position: "absolute", left: X0, right: 110, top: 660, opacity: ramp(frame, fSse - 2, 12) }}>
        <div style={{ position: "relative", height: 4, background: C.rule }}>
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${pulse * 100}%`, background: C.fuchsia }} />
        </div>
        <div style={{ fontFamily: MONO, fontSize: 24, color: C.fuchsia, marginTop: 14 }}>GET /api/events · SERVER-SENT EVENT</div>
        <div style={{ display: "flex", gap: 24, marginTop: 22 }}>
          {[0, 1, 2].map((i) => {
            const p = ramp(frame, fSse + 40 + i * 12, 12);
            return <div key={i} style={{ ...sheet({ width: 420, padding: "18px 22px", border: `1.5px solid ${C.fuchsia}` }), opacity: p, fontFamily: SANS, fontSize: 28, color: C.ink }}>Open tab {i + 1}: refetches</div>;
          })}
        </div>
      </div>
    </Shell>
  );
};

export const Stack: React.FC<P> = ({ id, words }) => {
  const frame = useCurrentFrame();
  const COLS = [
    { t: "Front end", at: "React nineteen", items: ["React 19", "React Query", "Vite"] },
    { t: "Back end", at: "Express five", items: ["Express 5", "Mongoose", "Pino"] },
    { t: "Data and live", at: "MongoDB for storage", items: ["MongoDB", "Server-Sent Events"] },
  ];
  const fShared = cue(words, "One shared package");
  return (
    <Shell id={id} words={words}>
      <Title size={64} style={{ position: "absolute", left: 110, top: 90, opacity: ramp(frame, 2, 12) }}>The MERN stack, in strict TypeScript</Title>
      <div style={{ position: "absolute", left: 110, right: 110, top: 220, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {COLS.map((c) => {
          const f = cue(words, c.at);
          return <div key={c.t} style={{ ...sheet({ padding: 30, height: 340 }), opacity: ramp(frame, f - 6, 10) }}>
            <Eyebrow color={C.teal}>{c.t}</Eyebrow>
            {c.items.map((it, i) => <div key={it} style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 48, color: C.ink, marginTop: 14, opacity: ramp(frame, f + i * 12, 10) }}>{it}</div>)}
          </div>;
        })}
      </div>
      <div style={{ position: "absolute", left: 110, top: 590, width: 1132, padding: "22px 30px", background: C.teal, color: C.tealInk, opacity: ramp(frame, fShared, 12), transform: `translateY(${(1 - ramp(frame, fShared, 12)) * 14}px)` }}>
        <span style={{ fontFamily: MONO, fontSize: 32 }}>@mal/shared</span>
        <span style={{ fontFamily: SANS, fontSize: 34, marginLeft: 26, fontWeight: 500 }}>One set of Zod rules for the form and the server</span>
      </div>
      <div style={{ position: "absolute", left: 110, top: 730, fontFamily: SANS, fontSize: 34, fontWeight: 500, color: C.ink2, opacity: ramp(frame, cue(words, "The test suite"), 12) }}>Tested: shared rules · services · API · interface</div>
    </Shell>
  );
};

/* ---------------- 15. Impact ---------------- */
export const Impact: React.FC<P> = ({ id, words }) => {
  const frame = useCurrentFrame();
  const fCmp = cue(words, "Compare the two"), fAfter = cue(words, "After, every"), fFit = cue(words, "This fits");
  const WHO = [["Team leads", "stop writing follow up emails", "Team leads stop"], ["Task owners", "always know what they owe", "Task owners always"], ["Managers", "see what is slipping early", "Managers can see"]] as const;
  const cols = ramp(frame, fCmp - 6, 14, camera);
  const BEFORE = ["Decisions in someone's notes", "Ownership assumed", "Late work surfaces next meeting"];
  const AFTER = ["Every decision logged", "An owner and a date on every task", "Late work visible the same day"];
  return (
    <Shell id={id} words={words}>
      {cols < 1 && (
        <div style={{ position: "absolute", left: 140, right: 140, top: 200, opacity: 1 - cols }}>
          <Title size={72} style={{ opacity: ramp(frame, 2, 12) }}>Who benefits?</Title>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 50 }}>
            {WHO.map(([a, b, at]) => {
              const p = ramp(frame, cue(words, at), 12);
              return <div key={a} style={{ ...sheet({ padding: 34, minHeight: 260 }), opacity: p, transform: `translateY(${(1 - p) * 14}px)` }}>
                <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 50, color: C.teal }}>{a}</div>
                <div style={{ fontFamily: SANS, fontSize: 34, color: C.ink2, marginTop: 14, lineHeight: 1.25 }}>{b}</div>
              </div>;
            })}
          </div>
        </div>
      )}
      {cols > 0 && (
        <div style={{ position: "absolute", left: 140, right: 140, top: 110, opacity: cols, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
          {[{ t: "Before", c: C.coral, bg: C.coralSoft, l: BEFORE, f: cue(words, "Before, decisions") }, { t: "After", c: C.teal, bg: C.tealSoft, l: AFTER, f: fAfter }].map((col) => (
            <div key={col.t} style={{ background: col.bg, padding: 36, minHeight: 460, opacity: ramp(frame, col.f - 8, 10) }}>
              <Title size={64} style={{ color: col.c }}>{col.t}</Title>
              {col.l.map((x, i) => <div key={x} style={{ fontFamily: SANS, fontSize: 38, fontWeight: 500, color: C.ink, marginTop: 28, opacity: ramp(frame, col.f + i * 34, 10) }}>{x}</div>)}
            </div>
          ))}
          <div style={{ gridColumn: "1 / span 2", display: "flex", gap: 16, marginTop: 10, opacity: ramp(frame, fFit, 12) }}>
            {["Software teams", "College committees", "Startups", "Any group that meets"].map((x) => <span key={x} style={{ ...sheet({ padding: "14px 24px" }), fontFamily: SANS, fontSize: 32, fontWeight: 500, color: C.ink }}>{x}</span>)}
          </div>
        </div>
      )}
    </Shell>
  );
};

export const Roadmap: React.FC<P> = ({ id, words }) => {
  const frame = useCurrentFrame();
  const ITEMS = [["Sign-in and roles", "Sign in"], ["Email and calendar reminders", "Email and calendar"], ["Import from meeting transcripts", "Importing action"], ["Slack and Jira", "And integrations"]] as const;
  const fBase = cue(words, "The foundation");
  return (
    <Shell id={id} words={words}>
      <Title size={72} style={{ position: "absolute", left: 140, top: 100, opacity: ramp(frame, 2, 12) }}>What could come next</Title>
      <div style={{ position: "absolute", left: 140, right: 140, top: 240, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        {ITEMS.map(([t, at]) => {
          const p = ramp(frame, cue(words, at) - 4, 12);
          return <div key={t} style={{ ...sheet({ padding: "28px 34px" }), fontFamily: SERIF, fontWeight: 600, fontSize: 46, color: C.ink, opacity: p, transform: `translateY(${(1 - p) * 14}px)` }}>{t}</div>;
        })}
      </div>
      <div style={{ position: "absolute", left: 140, right: 140, top: 560, padding: "28px 34px", background: C.teal, color: C.tealInk, opacity: ramp(frame, fBase, 12), fontFamily: SANS, fontSize: 38, fontWeight: 600 }}>
        Foundation in place: REST API · shared validation · live event stream
      </div>
    </Shell>
  );
};

/* ---------------- 16. Outro ---------------- */
const RECAP: [string, string][] = [["Today dashboard", "the Today dashboard"], ["Meetings log", "the meetings log"], ["Decisions and action items", "decisions and action"], ["Decision inbox", "the decision inbox"], ["Overdue view", "the overdue view"],
  ["Team directory", "the team directory"], ["Command palette", "the command palette"], ["Guided demo", "the guided demo"], ["Live updates", "live updates"], ["REST API", "REST API"]];
export const Outro: React.FC<P> = ({ id, words }) => {
  const frame = useCurrentFrame();
  const fEnd = cue(words, "Built by"), fThanks = cue(words, "Thank you");
  const out = ramp(frame, fEnd - 6, 14, camera);
  return (
    <Shell id={id} words={words}>
      {out < 1 && (
        <div style={{ position: "absolute", left: 200, right: 200, top: 130, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 40px", opacity: 1 - out }}>
          {RECAP.map(([t, at]) => {
            const p = ramp(frame, cue(words, at), 10);
            return <div key={t} style={{ display: "flex", alignItems: "center", gap: 20, opacity: 0.3 + p * 0.7, ...sheet({ padding: "20px 24px" }) }}>
              <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray={24} strokeDashoffset={24 * (1 - p)} />
              </svg>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 36, color: C.ink }}>{t}</span>
            </div>;
          })}
        </div>
      )}
      {out > 0 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: out, paddingBottom: 120 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <BrandMark size={100} />
            <Title size={116}>MeetingActionLog</Title>
          </div>
          <div style={{ marginTop: 50, textAlign: "center", fontFamily: SANS }}>
            <div style={{ fontSize: 42, fontWeight: 600, color: C.ink }}>Nithin Kumar U</div>
            <div style={{ fontSize: 28, color: C.ink2, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>USN 2102508611</div>
            <div style={{ fontSize: 28, color: C.ink2, marginTop: 6 }}>Backend Development · CIA-II · Meeting decisions and follow-up</div>
          </div>
          <Title size={64} style={{ marginTop: 44, opacity: ramp(frame, fThanks, 12) }}>Thank you</Title>
        </AbsoluteFill>
      )}
    </Shell>
  );
};

export const MG: Record<string, React.FC<P>> = { h1: Hook, w1: WhatIs, a1: Architecture, a2: Stack, im1: Impact, im2: Roadmap, ou1: Outro };
