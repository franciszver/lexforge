#!/usr/bin/env python3
"""Build a captioned demo GIF and MP4 (with synthesized music) from a folder
of ordered PNG frames.

Usage:
    python scripts/build_demo_media.py [options]

See --help for all options. Requires Pillow and imageio-ffmpeg (bundled
ffmpeg binary). Music synthesis uses only the Python stdlib (wave + math).
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import struct
import subprocess
import sys
import wave
from pathlib import Path
from tempfile import TemporaryDirectory

from PIL import Image, ImageDraw, ImageFont

try:
    import imageio_ffmpeg
except ImportError:
    print("ERROR: imageio-ffmpeg is required. Install with `pip install imageio-ffmpeg`.", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def parse_args(argv=None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frames-dir", default=".demo-media/frames",
                         help="Directory containing ordered PNG frames (default: %(default)s)")
    parser.add_argument("--captions", default=".demo-media/captions.json",
                         help="Optional JSON mapping frame filename -> caption (default: %(default)s)")
    parser.add_argument("--out-gif", default="docs/assets/demo.gif",
                         help="Output GIF path (default: %(default)s)")
    parser.add_argument("--out-mp4", default=".demo-media/demo.mp4",
                         help="Output MP4 path (default: %(default)s)")
    parser.add_argument("--seconds-per-frame", type=float, default=3.0,
                         help="Seconds each frame is shown (default: %(default)s)")
    parser.add_argument("--gif-width", type=int, default=900,
                         help="Width in pixels of the output GIF (default: %(default)s)")
    parser.add_argument("--no-music", action="store_true",
                         help="Skip music synthesis/mux; output mp4 is the silent video with no audio stream")
    return parser.parse_args(argv)


# ---------------------------------------------------------------------------
# Frame loading / captioning
# ---------------------------------------------------------------------------

def load_frames(frames_dir: Path) -> list[tuple[str, Image.Image]]:
    paths = sorted(p for p in frames_dir.glob("*.png"))
    if not paths:
        print(f"ERROR: no PNG frames found in {frames_dir}", file=sys.stderr)
        sys.exit(1)
    frames = []
    for p in paths:
        img = Image.open(p).convert("RGB")
        frames.append((p.name, img))
    return frames


def prettify_stem(stem: str) -> str:
    # Strip a leading "NN-" ordering prefix if present.
    parts = stem.split("-", 1)
    if len(parts) == 2 and parts[0].isdigit():
        stem = parts[1]
    stem = stem.replace("-", " ").replace("_", " ")
    return stem.title()


def load_captions(captions_path: Path, frame_names: list[str]) -> dict[str, str]:
    data = {}
    if captions_path.exists():
        with open(captions_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    captions = {}
    for name in frame_names:
        if name in data:
            captions[name] = data[name]
        else:
            stem = Path(name).stem
            captions[name] = prettify_stem(stem)
    return captions


def normalize_frames(frames: list[tuple[str, Image.Image]]) -> list[tuple[str, Image.Image]]:
    max_w = max(img.width for _, img in frames)
    max_h = max(img.height for _, img in frames)
    normalized = []
    for name, img in frames:
        canvas = Image.new("RGB", (max_w, max_h), (0, 0, 0))
        x = (max_w - img.width) // 2
        y = (max_h - img.height) // 2
        canvas.paste(img, (x, y))
        normalized.append((name, canvas))
    return normalized


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for candidate in ("arial.ttf", r"C:\Windows\Fonts\arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _text_width(draw: ImageDraw.ImageDraw, text: str, font) -> float:
    try:
        return font.getlength(text)
    except AttributeError:
        bbox = draw.textbbox((0, 0), text, font=font)
        return bbox[2] - bbox[0]


def caption_frame(img: Image.Image, caption: str) -> Image.Image:
    w, h = img.size
    bar_h = max(1, int(h * 0.12))

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    draw.rectangle([0, h - bar_h, w, h], fill=(0, 0, 0, 160))

    max_text_width = w * 0.9
    is_truetype = True
    size = max(10, int(bar_h * 0.5))
    floor_size = 10
    font = _load_font(size)
    if not isinstance(font, ImageFont.FreeTypeFont):
        is_truetype = False

    if is_truetype:
        while size > floor_size:
            font = _load_font(size)
            text_w = _text_width(draw, caption, font)
            if text_w <= max_text_width:
                break
            size -= 2
    # else: default bitmap font has no meaningful size control; leave as-is.

    text_w = _text_width(draw, caption, font)
    tx = max(0, (w - text_w) / 2)
    bbox = draw.textbbox((0, 0), caption, font=font)
    text_h = bbox[3] - bbox[1]
    ty = h - bar_h + (bar_h - text_h) / 2 - bbox[1]
    draw.text((tx, ty), caption, font=font, fill=(245, 245, 245, 255))

    base = img.convert("RGBA")
    composited = Image.alpha_composite(base, overlay)
    return composited.convert("RGB")


# ---------------------------------------------------------------------------
# GIF output
# ---------------------------------------------------------------------------

def build_gif(captioned_frames: list[Image.Image], out_path: Path, gif_width: int,
              seconds_per_frame: float) -> None:
    resized = []
    for img in captioned_frames:
        ratio = gif_width / img.width
        gif_h = max(1, int(round(img.height * ratio)))
        resized.append(img.resize((gif_width, gif_h), Image.LANCZOS))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    duration_ms = int(seconds_per_frame * 1000)
    first, rest = resized[0], resized[1:]
    first.save(
        out_path,
        save_all=True,
        append_images=rest,
        duration=duration_ms,
        loop=0,
        optimize=True,
        disposal=2,
    )


# ---------------------------------------------------------------------------
# Music synthesis (stdlib only)
# ---------------------------------------------------------------------------

def synth_music(duration_s: float, sample_rate: int = 44100) -> bytes:
    """Return raw 16-bit mono PCM samples for a gentle arpeggio over
    C - G - Am - F, sized to duration_s seconds."""
    note_freqs = {
        "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23,
        "G4": 392.00, "A4": 440.00, "B3": 246.94, "C5": 523.25,
    }
    progression = [
        ["C4", "E4", "G4", "C5"],   # C major
        ["G4", "B3", "D4", "G4"],   # G major (approx, low B)
        ["A4", "C5", "E4", "A4"],   # A minor
        ["F4", "A4", "C5", "F4"],   # F major
    ]
    note_dur = 0.5  # seconds per arpeggio note
    peak_amp = 0.25 * 32767  # headroom well below full scale
    attack_s = 0.01
    decay_s = note_dur - attack_s

    total_samples = int(duration_s * sample_rate)
    samples = [0.0] * total_samples

    t_cursor = 0.0
    chord_idx = 0
    while t_cursor < duration_s:
        chord = progression[chord_idx % len(progression)]
        for note_name in chord:
            if t_cursor >= duration_s:
                break
            freq = note_freqs[note_name]
            n_note_samples = int(note_dur * sample_rate)
            start_idx = int(t_cursor * sample_rate)
            attack_samples = max(1, int(attack_s * sample_rate))
            decay_samples = max(1, n_note_samples - attack_samples)
            for i in range(n_note_samples):
                idx = start_idx + i
                if idx >= total_samples:
                    break
                t = i / sample_rate
                # Envelope: linear attack, linear decay to 0.
                if i < attack_samples:
                    env = i / attack_samples
                else:
                    env = max(0.0, 1.0 - (i - attack_samples) / decay_samples)
                sample = math.sin(2 * math.pi * freq * t) * env * peak_amp
                samples[idx] += sample
            t_cursor += note_dur
        chord_idx += 1

    # Overall fade-in / fade-out to avoid abrupt start/stop clicks.
    fade_s = min(0.5, duration_s / 4)
    fade_samples = max(1, int(fade_s * sample_rate))
    for i in range(min(fade_samples, total_samples)):
        samples[i] *= i / fade_samples
    for i in range(min(fade_samples, total_samples)):
        idx = total_samples - 1 - i
        samples[idx] *= i / fade_samples

    # Clamp to int16 range and pack.
    clamped = []
    for s in samples:
        v = int(round(s))
        if v > 32767:
            v = 32767
        elif v < -32768:
            v = -32768
        clamped.append(v)
    return struct.pack("<%dh" % len(clamped), *clamped)


def write_wav(path: Path, pcm_data: bytes, sample_rate: int = 44100) -> None:
    wf = wave.open(str(path), "wb")
    try:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    finally:
        wf.close()


# ---------------------------------------------------------------------------
# MP4 output
# ---------------------------------------------------------------------------

def run_ffmpeg(args: list[str]) -> subprocess.CompletedProcess:
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [ffmpeg_exe] + args
    return subprocess.run(cmd, capture_output=True, text=True)


def build_mp4(captioned_frames: list[Image.Image], out_path: Path,
               seconds_per_frame: float, with_music: bool = True) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    n_frames = len(captioned_frames)
    duration_s = n_frames * seconds_per_frame

    with TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        for i, img in enumerate(captioned_frames):
            frame_path = tmp / f"frame_{i:03d}.png"
            img.save(frame_path)

        silent_mp4 = tmp / "silent.mp4"
        result = run_ffmpeg([
            "-framerate", str(1.0 / seconds_per_frame),
            "-i", str(tmp / "frame_%03d.png"),
            "-r", "30",
            "-pix_fmt", "yuv420p",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            "-y", str(silent_mp4),
        ])
        if result.returncode != 0:
            print("ERROR: ffmpeg failed to encode silent video:", file=sys.stderr)
            print(result.stderr, file=sys.stderr)
            sys.exit(1)

        if not with_music:
            shutil.copyfile(silent_mp4, out_path)
            return

        music_wav = tmp / "music.wav"
        pcm = synth_music(duration_s)
        write_wav(music_wav, pcm)

        mux_result = run_ffmpeg([
            "-i", str(silent_mp4),
            "-i", str(music_wav),
            "-c:v", "copy",
            "-c:a", "aac",
            "-shortest",
            "-y", str(out_path),
        ])
        if mux_result.returncode != 0:
            print("WARNING: muxing audio failed, falling back to silent video.", file=sys.stderr)
            print(mux_result.stderr, file=sys.stderr)
            shutil.copyfile(silent_mp4, out_path)


def mp4_has_audio(mp4_path: Path) -> bool:
    result = run_ffmpeg(["-i", str(mp4_path)])
    return "Audio:" in result.stderr


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main(argv=None) -> None:
    args = parse_args(argv)

    frames_dir = Path(args.frames_dir)
    captions_path = Path(args.captions)
    out_gif = Path(args.out_gif)
    out_mp4 = Path(args.out_mp4)

    frames = load_frames(frames_dir)
    frame_names = [name for name, _ in frames]
    captions = load_captions(captions_path, frame_names)

    normalized = normalize_frames(frames)
    captioned_frames = [caption_frame(img, captions[name]) for name, img in normalized]

    build_gif(captioned_frames, out_gif, args.gif_width, args.seconds_per_frame)
    build_mp4(captioned_frames, out_mp4, args.seconds_per_frame, with_music=not args.no_music)

    gif_n_frames = Image.open(out_gif).n_frames
    has_audio = mp4_has_audio(out_mp4)

    print("Demo media build complete:")
    print(f"  Frames processed: {len(frames)}")
    print(f"  GIF: {out_gif} ({out_gif.stat().st_size} bytes, {gif_n_frames} frames)")
    print(f"  MP4: {out_mp4} ({out_mp4.stat().st_size} bytes, audio stream: {has_audio})")


if __name__ == "__main__":
    main()
