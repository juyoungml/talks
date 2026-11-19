"""Run the checkpoints, compare traces, and validate logits."""
import argparse
import json
import statistics
import sys
import time
from pathlib import Path

import torch
from huggingface_hub import snapshot_download
from transformers import AutoTokenizer, TextStreamer

from engine import Request, choose
from model import MODEL_ID, load_model
from quant import quantize_linears, stored_weight_bytes

REVISION = "c1899de289a04d12100db370d81485cdf75e47ca"
FILES = ["config.json", "generation_config.json", "tokenizer.json", "tokenizer_config.json", "model.safetensors"]
ROOT = Path(__file__).resolve().parent


def sync(device):
    if device == "mps":
        torch.mps.synchronize()


def prompt_ids(tokenizer, prompt, device):
    meeting = (ROOT / "meeting.txt").read_text().strip()
    if prompt == "long":
        details = "\n".join(
            f"논의 {i}. 안건을 검토했다. 추가 검토가 필요한 항목은 다음 회의로 넘긴다."
            for i in range(1, 25)
        )
        meeting = details + "\n" + meeting
    return tokenizer.apply_chat_template(
        [{"role": "user", "content": f"회의록의 결정 사항 세 가지를 한국어로 정리해줘.\n\n{meeting}"}],
        enable_thinking=False,
        add_generation_prompt=True,
        return_tensors="pt",
    ).to(device)


def run_steps(request, count, device, streamer=None, eos=()):
    previous = None
    sync(device)
    start = time.perf_counter()
    first = start
    generated = 0
    for index in range(count):
        previous = choose(request.next_logits(previous))
        if index == 0:
            sync(device)
            first = time.perf_counter()
        generated += 1
        if streamer is not None:
            if previous.item() in eos:
                break
            streamer.put(previous.cpu())
    sync(device)
    end = time.perf_counter()
    if streamer is not None:
        streamer.end()
    return (first - start) * 1000, (end - first) * 1000 / max(1, generated - 1)


def compare_logits(model, ids, first_version, second_version, count, compiled=None):
    capacity = ids.shape[1] + count
    first = Request(model, ids, first_version, capacity)
    second = Request(model, ids, second_version, capacity, compiled)
    previous = None
    max_delta = 0
    same_top1 = 0
    for _ in range(count):
        expected = first.next_logits(previous).float()
        actual = second.next_logits(previous).float()
        torch.testing.assert_close(actual, expected, atol=0.15, rtol=0.02)
        max_delta = max(max_delta, (actual - expected).abs().max().item())
        previous = choose(expected)
        same_top1 += int((choose(actual) == previous).item())
    print(f"logits PASS | max abs diff={max_delta:.5f} | same top-1={same_top1}/{count}")


def benchmark(model, ids, version, args, compiled=None):
    def request():
        return Request(model, ids, version, ids.shape[1] + args.steps, compiled)

    run_steps(request(), args.steps, args.device)
    samples = []
    for _ in range(args.repeats):
        current = request()
        samples.append(run_steps(current, args.steps, args.device))
    used, reserved = current.memory()
    first, decode = map(statistics.median, zip(*samples))
    print(f"CP{version:02d} | prompt={ids.shape[1]} | generated={args.steps} | {args.device}/{args.dtype}")
    print(f"  forward lengths={[x for x, _ in current.trace[:4]]}")
    if current.cache:
        print(f"  cached KV lengths={[y for _, y in current.trace[:4]]}")
    print(f"  first token={first:.2f} ms | decode={decode:.2f} ms/token")
    print(f"  KV used={used:,} B | reserved={reserved:,} B | weights={stored_weight_bytes(model):,} B")


def compile_probe(model, ids, args):
    def decode(ids, cache, start):
        return model(ids, cache, start, use_sdpa=True)

    compiled = torch.compile(decode, dynamic=True)
    for label, fn in (("eager", decode), ("compiled", compiled)):
        try:
            request = Request(model, ids, 7, ids.shape[1] + args.steps, fn)
            first = choose(request.next_logits())
            sync(args.device)
            start = time.perf_counter()
            request.next_logits(first)
            sync(args.device)
            print(f"{label} first decode call: {(time.perf_counter() - start) * 1000:.2f} ms")
            if label == "compiled":
                compare_logits(model, ids, 6, 7, 3, compiled=fn)
            benchmark(model, ids, 7, args, fn)
        except Exception as exc:
            if label == "eager":
                raise
            print(f"Compile probe did not pass on this build: {type(exc).__name__}: {str(exc).splitlines()[0]}")
            print("Eager remains the default.")


@torch.inference_mode()
def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("checkpoint", choices=[f"cp{i:02d}" for i in range(1, 10)])
    parser.add_argument("--prompt", choices=["short", "long"], default="short")
    parser.add_argument("--device", choices=["mps", "cpu"], default="mps" if torch.backends.mps.is_available() else "cpu")
    parser.add_argument("--dtype", choices=["float32", "float16"])
    parser.add_argument("--steps", type=int, default=16)
    parser.add_argument("--repeats", type=int, default=3)
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--reference", action="store_true", help="Compare CP01 with Transformers forward")
    args = parser.parse_args()
    if args.steps < 2 or args.repeats < 1:
        parser.error("use --steps >= 2 and --repeats >= 1")
    if args.device == "mps" and not torch.backends.mps.is_available():
        parser.error("MPS is unavailable; use --device cpu")
    if args.dtype is None:
        args.dtype = "float16" if args.device == "mps" else "float32"
    if args.device == "cpu":
        torch.set_num_threads(min(torch.get_num_threads(), 4))
    dtype = getattr(torch, args.dtype)
    path = snapshot_download(
        MODEL_ID, revision=REVISION, allow_patterns=FILES, local_files_only=args.offline
    )
    if not all((Path(path) / name).is_file() for name in FILES):
        parser.error("model files are incomplete; run cp01 without --offline first")
    tokenizer = AutoTokenizer.from_pretrained(path)
    eos = json.loads((Path(path) / "generation_config.json").read_text())["eos_token_id"]
    eos = eos if isinstance(eos, list) else [eos]
    model = load_model(path, args.device, dtype)
    ids = prompt_ids(tokenizer, args.prompt, args.device)
    version = int(args.checkpoint[2:])

    if version == 1:
        logits = model(ids, all_logits=True)
        next_id = choose(logits[:, -1]).item()
        print(f"input={list(ids.shape)} | logits={list(logits.shape)} | next id={next_id}")
        print(f"text={tokenizer.decode([next_id])!r}")
        if args.reference:
            from transformers import AutoModelForCausalLM

            reference = AutoModelForCausalLM.from_pretrained(path, dtype=dtype).to(args.device).eval()
            expected = reference(ids, use_cache=False).logits[:, -1].float()
            torch.testing.assert_close(logits[:, -1].float(), expected, atol=0.15, rtol=0.02)
            print(f"Transformers logits PASS | max abs diff={(expected - logits[:, -1]).abs().max().item():.5f}")
    elif version == 2:
        streamer = TextStreamer(tokenizer, skip_special_tokens=True)
        request = Request(model, ids, 2, ids.shape[1] + args.steps)
        run_steps(request, args.steps, args.device, streamer, eos)
        print(f"forward lengths={[x for x, _ in request.trace[:4]]}")
    elif version == 3:
        for name in ("short", "long"):
            benchmark(model, prompt_ids(tokenizer, name, args.device), 3, args)
    elif version in (4, 5, 6, 9):
        before, after = (3, 6) if version == 9 else (version - 1, version)
        if version == 9:
            for checkpoint in (before, after):
                print(f"CP{checkpoint:02d} streaming")
                streamer = TextStreamer(tokenizer, skip_special_tokens=True)
                request = Request(model, ids, checkpoint, ids.shape[1] + args.steps)
                run_steps(request, args.steps, args.device, streamer, eos)
        compare_logits(model, ids, before, after, min(args.steps, 4))
        for checkpoint in (before, after):
            benchmark(model, ids, checkpoint, args)
    elif version == 7:
        compile_probe(model, ids, args)
    else:
        print("Floating-point weights")
        baseline = model(ids, use_sdpa=True)[:, -1, :].float()
        benchmark(model, ids, 6, args)
        print("INT8 weight storage + floating-point linear")
        quantize_linears(model)
        quantized = model(ids, use_sdpa=True)[:, -1, :].float()
        print(f"first-token logits max abs diff={(baseline - quantized).abs().max().item():.5f}")
        benchmark(model, ids, 6, args)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
