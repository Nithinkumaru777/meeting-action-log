"""Phase 4: voiceover first. Parses video/plan/script.md, synthesises every scene with edge-tts
(en-IN-PrabhatNeural, rate +0%), and writes per scene:
  <id>.mp3, <id>.vtt (word cues), <id>.words.json ([{w, s, e}] seconds)
plus durations.json ({id: seconds via ffprobe}) and scenes.json (parsed script).

    python video/audio/build.py [scene_id ...]     # default: all scenes, skips up-to-date ones
"""
import asyncio
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

import edge_tts

VOICE, RATE = "en-IN-PrabhatNeural", "+0%"
HERE = Path(__file__).resolve().parent
SCRIPT = HERE.parent / "plan" / "script.md"


def parse_script():
    text = SCRIPT.read_text(encoding="utf-8")
    scenes, chapter = [], None
    for block in re.split(r"^(?=## |### )", text, flags=re.M):
        if m := re.match(r"## (\d+) · (.+)", block):
            chapter = {"num": int(m[1]), "title": m[2].strip()}
            continue
        if not (m := re.match(r"### (\w+) · (MG|REC)", block)):
            continue
        field = lambda k: (re.search(rf"\*\*{k}:\*\* (.+)", block) or [None, ""])[1].strip()
        scenes.append({"id": m[1], "type": m[2], "chapter": chapter["num"], "chapterTitle": chapter["title"],
                       "narration": field("Narration"), "actions": field("Actions"),
                       "onscreen": [s.strip() for s in field("On-screen").split("|") if s.strip()]})
    return scenes


def ts(sec):
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02}:{int(m):02}:{s:06.3f}"


async def synth(scene, sem):
    mp3, meta = HERE / f"{scene['id']}.mp3", HERE / f"{scene['id']}.words.json"
    digest = hashlib.sha1(f"{VOICE}{RATE}{scene['narration']}".encode()).hexdigest()
    stamp = HERE / f".{scene['id']}.sha1"
    if mp3.exists() and meta.exists() and stamp.exists() and stamp.read_text() == digest:
        return
    async with sem:
        for attempt in range(4):
            try:
                words, audio = [], bytearray()
                com = edge_tts.Communicate(scene["narration"], VOICE, rate=RATE, boundary="WordBoundary")
                async for ch in com.stream():
                    if ch["type"] == "audio":
                        audio += ch["data"]
                    elif ch["type"] == "WordBoundary":
                        s = ch["offset"] / 1e7
                        words.append({"w": ch["text"], "s": round(s, 3), "e": round(s + ch["duration"] / 1e7, 3)})
                break
            except Exception as e:  # network hiccups from the TTS service
                if attempt == 3:
                    raise
                print(f"  retry {scene['id']}: {e}")
                await asyncio.sleep(2 + attempt * 3)
    if not words:
        raise RuntimeError(f"{scene['id']}: no word boundaries returned")
    mp3.write_bytes(audio)
    meta.write_text(json.dumps(words), encoding="utf-8")
    vtt = ["WEBVTT", ""] + [f"{ts(w['s'])} --> {ts(w['e'])}\n{w['w']}\n" for w in words]
    (HERE / f"{scene['id']}.vtt").write_text("\n".join(vtt), encoding="utf-8")
    stamp.write_text(digest)
    print(f"  tts {scene['id']}: {len(words)} words")


def duration(p):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                         capture_output=True, text=True, check=True).stdout
    return round(float(out), 3)


async def main():
    scenes = parse_script()
    # Chapter cards are voiced too ("Chapter 6. Assess an application."), so no card is a silent gap.
    cards = [{"id": f"c{n}", "narration": f"Chapter {n}. {t}."}
             for n, t in dict((s["chapter"], s["chapterTitle"].replace(":", ",")) for s in scenes).items()]
    want = set(sys.argv[1:])
    allc = scenes + cards
    todo = [s for s in allc if not want or s["id"] in want]
    if want - {s["id"] for s in allc}:
        sys.exit(f"unknown scene ids: {want - {s['id'] for s in allc}}")
    sem = asyncio.Semaphore(4)
    await asyncio.gather(*(synth(s, sem) for s in todo))
    durs = {s["id"]: duration(HERE / f"{s['id']}.mp3") for s in allc if (HERE / f"{s['id']}.mp3").exists()}
    (HERE / "durations.json").write_text(json.dumps(durs, indent=1), encoding="utf-8")
    (HERE / "scenes.json").write_text(json.dumps(scenes, indent=1, ensure_ascii=False), encoding="utf-8")
    total = sum(durs.values())
    words = sum(len(s["narration"].split()) for s in scenes)
    print(f"{len(durs)} scenes, {total / 60:.1f} min of narration, {words} words, {words / (total / 60):.0f} wpm")
    for s in scenes:
        d = durs.get(s["id"], 0)
        print(f"  {s['id']:<4} ch{s['chapter']:<3}{s['type']:<4}{d:6.1f}s  {len(s['narration'].split()) / (d / 60) if d else 0:4.0f} wpm")


if __name__ == "__main__":
    asyncio.run(main())
