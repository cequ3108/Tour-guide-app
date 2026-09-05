#!/usr/bin/env python3
"""Generate neural Taiwanese Mandarin narration MP3s from narration.ts"""

from __future__ import annotations

import asyncio
import re
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
NARRATION_TS = ROOT / "src" / "data" / "narration.ts"
OUT_DIR = ROOT / "public" / "audio"
VOICE = "zh-TW-HsiaoChenNeural"
RATE = "-12%"
MAX_CONCURRENCY = 4


def parse_clips() -> list[dict[str, str]]:
    text = NARRATION_TS.read_text(encoding="utf-8")
    clips: list[dict[str, str]] = []
    for block in re.findall(r"\{\s*id: '([^']+)',[\s\S]*?audioUrl: '([^']+)',\s*\}", text):
        # re-parse each object more carefully
        pass
    for m in re.finditer(
        r"id: '([^']+)',\s*title: '([^']*)',[\s\S]*?script: '((?:\\'|[^'])*)',[\s\S]*?audioUrl: '([^']+)',",
        text,
    ):
        clip_id, title, script, audio_url = m.groups()
        script = script.replace("\\'", "'").replace("\\n", "\n")
        clips.append(
            {
                "id": clip_id,
                "title": title,
                "script": script,
                "audioUrl": audio_url,
            }
        )
    return clips


async def synth_one(clip: dict[str, str], sem: asyncio.Semaphore) -> tuple[str, str]:
    out = OUT_DIR / f"{clip['id']}.mp3"
    if out.exists() and out.stat().st_size > 1000:
        return clip["id"], "skip"
    text = re.sub(r"。", "。 ", clip["script"])
    async with sem:
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(out))
            return clip["id"], f"ok:{out.stat().st_size}"
        except Exception as exc:  # noqa: BLE001
            return clip["id"], f"err:{exc}"


async def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    clips = parse_clips()
    chars = sum(len(c["script"]) for c in clips)
    print(f"clips={len(clips)} chars={chars} est_min~{chars/155:.1f}")
    if not clips:
        raise SystemExit("No clips parsed from narration.ts")
    sem = asyncio.Semaphore(MAX_CONCURRENCY)
    results = await asyncio.gather(*(synth_one(c, sem) for c in clips))
    ok = sum(1 for _, s in results if s.startswith(("ok", "skip")))
    errs = [r for r in results if r[1].startswith("err")]
    print(f"done ok/skip={ok}/{len(results)}")
    for item in errs[:12]:
        print("ERR", item)
    total = sum(p.stat().st_size for p in OUT_DIR.glob("*.mp3"))
    print(f"audio_mb={total/1024/1024:.1f}")


if __name__ == "__main__":
    asyncio.run(main())
