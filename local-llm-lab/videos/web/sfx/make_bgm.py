"""ElevenLabs Music으로 배경음악 후보 만들기 → bgm_candidates/<이름>.mp3

키는 build.py와 같이 ~/Projects/PADO/.env 에서 실행 시점에만 읽는다 (출력·저장 안 함).
  cd local-llm-lab/videos/web/sfx && python3 make_bgm.py            # 전부
  cd local-llm-lab/videos/web/sfx && python3 make_bgm.py warm_lofi  # 하나만
"""
import json, os, sys, urllib.error, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "bgm_candidates"
PADO_ENV = Path.home() / "Projects" / "PADO" / ".env"

COMMON = ("Instrumental background music for a calm technical explainer video with voice-over narration. "
          "No vocals. Steady, unobtrusive, sits under speech, no sudden drops or big builds, "
          "loopable with a seamless ending. ")
CANDIDATES = {
    "warm_lofi": COMMON + "Warm lo-fi hip hop, soft Rhodes electric piano chords, mellow upright bass, "
                          "gentle dusty drums at 82 BPM, vinyl texture kept subtle. Cozy, focused, curious.",
    "minimal_electronic": COMMON + "Minimal modern electronic, soft plucked synth arpeggio, warm analog pad, "
                                   "light clicky percussion at 100 BPM. Clean, precise, quietly optimistic, like a well-designed developer tool.",
    "ambient_piano": COMMON + "Sparse ambient piano with soft felt piano motifs, airy pads and a very light pulse at 90 BPM. "
                              "Thoughtful, clear, minimal, like reading a good engineering blog.",
}
LENGTH_MS = 60_000


def key():
    k = os.environ.get("ELEVENLABS_API_KEY")
    if k: return k
    for line in PADO_ENV.read_text(encoding="utf-8").splitlines():
        line = line.strip().removeprefix("export ")
        if line.startswith("ELEVENLABS_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("ELEVENLABS_API_KEY를 찾지 못했습니다.")


def make(name, prompt, k):
    dest = OUT / f"{name}.mp3"
    if dest.exists():
        print("있음:", dest.name); return
    body = {"prompt": prompt, "music_length_ms": LENGTH_MS, "model_id": "music_v1", "force_instrumental": True}
    req = urllib.request.Request("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128",
                                 data=json.dumps(body).encode(), method="POST",
                                 headers={"xi-api-key": k, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r: dest.write_bytes(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"{name}: ElevenLabs 오류 {e.code}: {e.read().decode(errors='replace')[:400]}")
    print("만듦:", dest.name)


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    k = key()
    for n in (sys.argv[1:] or CANDIDATES):
        make(n, CANDIDATES[n], k)
