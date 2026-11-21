"""장별 해설 영상 빌드 (PADO 소개 영상 파이프라인을 장 단위로 옮긴 것).

1) <장>/script.json 대사를 TTS(문장별 캐시) → 앞뒤 무음 정리 → 길이 측정
   ElevenLabs(PADO와 같은 목소리) 또는 --say(macOS Yuna, 무료 미리보기)
2) 길이로 장면·자막 타임라인 계산 → <장>/template.html에 주입 → <장>/video.html
   (공통 화면 틀·seek 엔진은 base.css / engine.js)
3) Playwright(로컬 Chrome)로 seek(t) 후 프레임 캡처 → ffmpeg로 mp4 합성
   → ../media/web/<name>.mp4 (+ .srt)

사용 (local-llm-lab/videos/web 에서):
  uv run --no-project --with playwright python build.py ch01 --say
  uv run --no-project --with playwright python build.py ch01 --say --still 5 20.5
  uv run --no-project --with playwright python build.py ch01        # ElevenLabs (키는 ~/Projects/PADO/.env에서 읽음)
문장별 mp3는 <장>/out/tts/에 캐시되어, 대사가 같으면 다시 만들지 않는다.
"""
import argparse, hashlib, json, math, os, shutil, subprocess, sys, urllib.error, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
MEDIA = HERE.parent / "media" / "web"


PADO_ENV = Path.home() / "Projects" / "PADO" / ".env"  # 키는 PADO 쪽에만 둔다. 이 저장소에는 쓰지 않는다.


def load_env():
    """ELEVENLABS_API_KEY를 PADO .env에서 실행 시점에만 읽는다 (이미 설정된 환경변수가 우선, 출력·저장 안 함)."""
    if os.environ.get("ELEVENLABS_API_KEY") or not PADO_ENV.exists():
        return
    for line in PADO_ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("export "): line = line[7:]
        if line.startswith("ELEVENLABS_API_KEY="):
            os.environ["ELEVENLABS_API_KEY"] = line.split("=", 1)[1].strip().strip('"').strip("'")


def sh(*a, **k):
    return subprocess.run(a, check=True, capture_output=True, text=True, **k).stdout


def duration(p):
    return float(sh("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)))


def eleven(text, prev, nxt, t, dest):
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key: sys.exit("ELEVENLABS_API_KEY 환경변수가 없습니다. (레이아웃만 볼 때는 --say)")
    body = {"text": text, "model_id": t["model_id"], "voice_settings": t["voice_settings"]}
    if prev: body["previous_text"] = prev
    if nxt: body["next_text"] = nxt
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{t['voice_id']}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), method="POST",
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r: dest.write_bytes(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs 오류 {e.code}: {e.read().decode(errors='replace')[:400]}")


def tts(cfg, out, use_say, cached_only=False):
    t = cfg["tts"]
    d = out / ("tts_say" if use_say else "tts"); d.mkdir(parents=True, exist_ok=True)
    flat = [(s["id"], i, ln["tts"]) for s in cfg["scenes"] for i, ln in enumerate(s["lines"], 1)]
    clips = []
    for k, (sid, i, text) in enumerate(flat):
        h = hashlib.sha1(json.dumps([text, use_say, t.get("voice_id"), t.get("voice_settings"), t.get("preview_say_rate")],
                                    ensure_ascii=False).encode()).hexdigest()[:10]
        wav = d / f"{sid}_{i}_{h}.wav"
        if not wav.exists():
            if use_say:
                src = wav.with_suffix(".aiff")
                sh("say", "-v", t["preview_say_voice"], "-r", str(t["preview_say_rate"]), "-o", str(src), text)
            else:
                prev = flat[k - 1][2] if k else ""
                nxt = flat[k + 1][2] if k + 1 < len(flat) else ""
                src = wav.with_suffix(".mp3")
                if not src.exists():
                    if cached_only: sys.exit(f"캐시에 없는 문장(--cached-only라 ElevenLabs를 부르지 않음): {sid} {i} {text}")
                    print("  ElevenLabs:", sid, i, text); eleven(text, prev, nxt, t, src)
            tempo = cfg.get("pacing", {}).get("atempo", 1.0) if not use_say else 1.0
            sh("ffmpeg", "-y", "-v", "error", "-i", str(src), "-af",
               "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse"
               + (f",atempo={tempo}" if tempo != 1.0 else ""), "-ar", "48000", "-ac", "1", str(wav))
        clips.append((sid, i, wav, duration(wav)))
    return clips


def split_cues(sub, t, d):
    """자막(sub)은 내레이션과 같은 문장이다. 문장마다 따로 띄우고, 글자 수 비율로 시간을 나눈다."""
    import re
    parts = [p.strip() for p in re.split(r"(?<=[.?!])\s+", sub.strip()) if p.strip()]
    # 너무 짧은 조각(예: "자.")은 다음 문장에 붙인다
    merged = []
    for p in parts:
        if merged and len(merged[-1]) < 8: merged[-1] += " " + p
        else: merged.append(p)
    weights = [len(re.sub(r"\s", "", p)) for p in merged]
    total, cues, s = sum(weights) or 1, [], t
    for p, w in zip(merged, weights):
        e = s + d * w / total
        cues.append({"start": round(s, 3), "end": round(e, 3), "text": p}); s = e
    return cues


def timeline(cfg, clips):
    dur = {(sid, i): (w, d) for sid, i, w, d in clips}
    dur_of = {w: d for _, _, w, d in clips}
    t, scenes, cues, vars_, audio, marks = 0.0, [], [], [], [], {}
    pc = cfg.get("pacing", {})
    ac = cfg.get("audio", {})
    gap = pc.get("gap", 0.3)
    for n, s in enumerate(cfg["scenes"]):
        last = n == len(cfg["scenes"]) - 1
        lead = s["lead"] * pc.get("lead_scale", 1)
        tail = s["tail"] if last else s["tail"] * pc.get("tail_scale", 1)
        # 시작·끝 배경음악이 들릴 자리: 첫 내레이션 앞, 마지막 내레이션 뒤 여유를 보장한다
        if n == 0 and not s.get("card"): lead = max(lead, ac.get("intro_min", 0))
        if last: tail = max(tail, ac.get("outro_min", 0) + (gap if s["lines"] else 0))
        start, card = t, None
        if s.get("card"):
            cd = pc.get("card_dur", 1.5)
            card = [round(t, 3), round(t + cd, 3), s["card"]]
            marks[f"{s['id']}_card"] = [round(t, 3), cd]; t += cd
        content = t; t += lead
        vars_.append(f"  --{s['id']}:{content:.3f}s;"); marks[s["id"]] = [round(content, 3), 0]
        for i, ln in enumerate(s["lines"], 1):
            w, d = dur[(s["id"], i)]
            vars_ += [f"  --{s['id']}l{i}:{t:.3f}s;", f"  --{s['id']}d{i}:{d:.3f}s;"]
            cues += split_cues(ln["sub"], t, d)
            marks[f"{s['id']}l{i}"] = [round(t, 3), round(d, 3)]
            audio.append((w, t)); t += d + gap
        t += tail - (gap if s["lines"] else 0)
        vars_.append(f"  --{s['id']}e:{t:.3f}s;")
        scenes.append({"id": s["id"], "chapter": s["chapter"], "chapterIndex": s["chapterIndex"], "start": round(start, 3),
                       **({"type": s["type"], "data": s.get(s["type"], {})} if s.get("type") else {}),
                       "content": round(content, 3), "end": round(t, 3), "card": card})
    narr = [round(audio[0][1], 3), round(max(a + dur_of[w] for w, a in audio), 3)] if audio else [0, 0]
    return {"scenes": scenes, "cues": cues, "marks": marks, "total": round(t, 3), "narration": narr}, "\n".join(vars_), audio


def build_html(ch, cfg, tl, vars_):
    html = (ch / "template.html").read_text(encoding="utf-8")
    meta = {k: cfg.get(k, "") for k in ("title", "brand", "brand_sub", "disc", "segs")}
    for k, v in {"VARS": vars_, "TL": json.dumps(tl, ensure_ascii=False), "META": json.dumps(meta, ensure_ascii=False)}.items():
        html = html.replace("{{" + k + "}}", v)
    (ch / "video.html").write_text(html, encoding="utf-8")


def render(ch, out, tl, fps, stills):
    from playwright.sync_api import sync_playwright
    frames = out / "frames"
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome")
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        pg.goto((ch / "video.html").as_uri(), wait_until="networkidle")
        pg.evaluate("document.fonts.ready.then(() => window.seek(0))")
        if stills is not None:
            sd = out / "stills"; sd.mkdir(parents=True, exist_ok=True)
            if not stills:  # 문장마다 중간·끝 한 장씩
                stills = sorted({round(c["start"] + (c["end"] - c["start"]) * f, 2) for c in tl["cues"] for f in (.5, .98)})
            for t in stills:
                pg.evaluate(f"seek({t})"); pg.screenshot(path=str(sd / f"still_{t:06.2f}.png"))
            b.close(); return
        if frames.exists(): shutil.rmtree(frames)
        frames.mkdir(parents=True)
        n = int(math.ceil(tl["total"] * fps))
        for f in range(n):
            pg.evaluate(f"seek({f / fps})")
            for attempt in range(3):  # 다른 Chrome이 동시에 돌면 가끔 폰트 대기에서 시간 초과가 난다
                try:
                    pg.screenshot(path=str(frames / f"{f:05d}.jpg"), type="jpeg", quality=92, timeout=120_000); break
                except Exception:
                    if attempt == 2: raise
            if f % 240 == 0: print(f"  frame {f}/{n}", flush=True)
        b.close()


def bgm_path(ch, p):
    """audio.json의 경로는 videos/web 기준, 장 script.json의 옛 경로(../sfx/…)는 장 폴더 기준."""
    q = (HERE / p) if not p.startswith("..") else (ch / p)
    return q.resolve()


def load_audio(cfg):
    """videos/web/audio.json(공통) 위에 장 script.json의 audio를 덮어쓴다."""
    shared = json.loads((HERE / "audio.json").read_text(encoding="utf-8")) if (HERE / "audio.json").exists() else {}
    cfg["audio"] = {**{k: v for k, v in shared.items() if not k.startswith("_")}, **cfg.get("audio", {})}


def mix_audio(ch, out, tl, audio, cfg):
    ac = cfg.get("audio", {})
    total = tl["total"]
    ins, chains = [], []
    for k, (w, t) in enumerate(audio):
        ins.append(str(w)); chains.append(f"[{len(ins) - 1}:a]adelay={int(t * 1000)}:all=1[n{k}]")
    chains.append("".join(f"[n{k}]" for k in range(len(audio))) + f"amix=inputs={len(audio)}:normalize=0,apad=whole_dur={total:.3f},asplit=2[nar][key]")
    labels, fx = ["[nar]"], []
    off = ac.get("sfx_offset_db", 0)
    for e in ac.get("sfx", []):
        st, d = tl["marks"][e["at"]]
        at = st + e.get("off", 0) + e.get("frac", 0) * d
        ins.append(str(HERE / "sfx" / f"{e['file']}.wav"))
        fx.append(f"[{len(ins) - 1}:a]volume={e.get('db', -18) + off}dB,adelay={max(0, int(at * 1000))}:all=1[f{len(fx)}]")
    chains += fx
    if fx:
        chains.append("".join(f"[f{k}]" for k in range(len(fx))) + f"amix=inputs={len(fx)}:normalize=0[fx]"); labels.append("[fx]")
    chains.append("[key]anullsink")
    if ac.get("bgm"):
        # 배경음악은 시작과 끝에만. 설명 구간에는 음악 자체가 없다(덕킹 아님).
        first, last_end = tl["narration"]
        a_end = first + ac.get("intro_fade_out", 1.2)
        o_start = last_end + ac.get("outro_gap", 0.3)
        o_len = max(0.5, total - o_start)
        fo = min(ac.get("outro_fade_out", 2.5), o_len * 0.6)
        ins.append(str(bgm_path(ch, ac["bgm"])))
        k = len(ins) - 1
        chains.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=mono,volume={ac.get('bgm_db', -7)}dB,asplit=2[bgi][bgo]")
        chains.append(f"[bgi]atrim=0:{a_end:.3f},asetpts=PTS-STARTPTS,afade=t=in:d={ac.get('intro_fade_in', 0.4)},"
                      f"afade=t=out:st={first:.3f}:d={a_end - first:.3f}[intro]")
        chains.append(f"[bgo]atrim=0:{o_len:.3f},asetpts=PTS-STARTPTS,afade=t=in:d={ac.get('outro_fade_in', 0.8)},"
                      f"afade=t=out:st={o_len - fo:.3f}:d={fo:.3f},adelay={int(o_start * 1000)}:all=1[outro]")
        chains.append(f"[intro][outro]amix=inputs=2:normalize=0,apad=whole_dur={total:.3f},asplit=2[bg][bgstem]")
        labels.append("[bg]")
        stem = True
    else:
        stem = False
    chains.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0,atrim=0:{total:.3f}[out]")
    args = ["ffmpeg", "-y", "-v", "error"]
    for i in ins: args += ["-i", i]
    pre, mix = out / "mix_pre.wav", out / "mix.wav"
    args += ["-filter_complex", ";".join(chains), "-map", "[out]", "-ac", "1", "-ar", "48000", str(pre)]
    if stem:  # 확인용: 배경음악만 따로 (설명 구간이 정말 0인지 볼 때)
        args += ["-map", "[bgstem]", "-ac", "1", "-ar", "48000", str(out / "bgm_stem.wav")]
    subprocess.run(args, check=True)
    target = f"I={ac.get('loudness_lufs', -16)}:TP=-1.5:LRA=11"
    log = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(pre), "-af", f"loudnorm={target}:print_format=json", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    m = json.loads(log[log.rindex("{"):log.rindex("}") + 1])
    sh("ffmpeg", "-y", "-v", "error", "-i", str(pre), "-af",
       f"loudnorm={target}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
       f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000", str(mix))
    return mix


def mux(out, dst, tl, mix, fps):
    MEDIA.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-framerate", str(fps), "-i", str(out / "frames" / "%05d.jpg"), "-i", str(mix),
                    "-map", "0:v", "-map", "1:a", "-t", f"{tl['total']:.3f}", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
                    "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(dst)], check=True)


def srt(dst, tl):
    f = lambda s: f"{int(s // 3600):02d}:{int(s % 3600 // 60):02d}:{int(s % 60):02d},{int(s * 1000 % 1000):03d}"
    dst.with_suffix(".srt").write_text(
        "\n".join(f"{i}\n{f(c['start'])} --> {f(c['end'])}\n{c['text']}\n" for i, c in enumerate(tl["cues"], 1)), encoding="utf-8")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("chapter", help="장 폴더 이름 (예: ch01)")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--still", type=float, nargs="*", help="해당 시각 스틸만 저장 (값 없으면 문장마다)")
    ap.add_argument("--no-render", action="store_true")
    ap.add_argument("--say", action="store_true", help="ElevenLabs 대신 macOS say로 미리보기")
    ap.add_argument("--cached-only", action="store_true", help="캐시된 음성만 쓰고, 없으면 ElevenLabs를 부르지 않고 멈춤")
    a = ap.parse_args()
    if not a.say: load_env()
    ch = HERE / a.chapter
    out = ch / "out"; out.mkdir(exist_ok=True)
    cfg = json.loads((ch / "script.json").read_text(encoding="utf-8"))
    load_audio(cfg)
    clips = tts(cfg, out, a.say, a.cached_only)
    tl, vars_, audio = timeline(cfg, clips)
    build_html(ch, cfg, tl, vars_)
    (out / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
    print("total", tl["total"], [(s["id"], s["start"], s["end"]) for s in tl["scenes"]])
    if a.no_render: sys.exit()
    render(ch, out, tl, a.fps, a.still)
    if a.still is None:
        dst = MEDIA / (cfg["name"] + ("_preview_say" if a.say else "") + ".mp4")
        mux(out, dst, tl, mix_audio(ch, out, tl, audio, cfg), a.fps); srt(dst, tl)
        print("wrote", dst)
