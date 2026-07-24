"""Hermetic pytest tests for scripts/build_demo_media.py.

Skips (not errors) if Pillow or imageio-ffmpeg are unavailable.
"""

import pytest

pytest.importorskip("PIL")
pytest.importorskip("imageio_ffmpeg")

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import build_demo_media as m
from PIL import Image
import imageio_ffmpeg


def _make_frame(path, size, color):
    img = Image.new("RGB", size, color)
    img.save(path)
    img.close()


def _run_ffmpeg_probe(mp4_path):
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    import subprocess
    result = subprocess.run([ffmpeg_exe, "-i", str(mp4_path)], capture_output=True, text=True)
    return result.stderr


def test_caption_changes_the_frame(tmp_path):
    img = Image.new("RGB", (400, 300), (60, 140, 200))
    captioned = m.caption_frame(img.copy(), "Hello World")
    img.close()

    h = 300
    bar_h = int(h * 0.12)
    bottom_before = Image.new("RGB", (400, 300), (60, 140, 200)).crop((0, h - bar_h, 400, h))
    bottom_after = captioned.crop((0, h - bar_h, 400, h))

    before_bytes = bottom_before.tobytes()
    after_bytes = bottom_after.tobytes()
    bottom_before.close()
    bottom_after.close()
    captioned.close()

    assert before_bytes != after_bytes


def test_music_on_produces_audio_stream(tmp_path):
    frames_dir = tmp_path / "frames"
    frames_dir.mkdir()
    _make_frame(frames_dir / "01-a.png", (320, 200), (200, 60, 60))
    _make_frame(frames_dir / "02-b.png", (320, 200), (60, 200, 60))

    out_gif = tmp_path / "out.gif"
    out_mp4 = tmp_path / "out.mp4"

    m.main([
        "--frames-dir", str(frames_dir),
        "--captions", str(tmp_path / "missing_captions.json"),
        "--out-gif", str(out_gif),
        "--out-mp4", str(out_mp4),
        "--seconds-per-frame", "0.2",
        "--gif-width", "160",
    ])

    assert out_mp4.exists()
    stderr = _run_ffmpeg_probe(out_mp4)
    assert "Audio:" in stderr


def test_music_off_produces_no_audio_stream(tmp_path):
    frames_dir = tmp_path / "frames"
    frames_dir.mkdir()
    _make_frame(frames_dir / "01-a.png", (320, 200), (200, 60, 60))
    _make_frame(frames_dir / "02-b.png", (320, 200), (60, 200, 60))

    out_gif = tmp_path / "out.gif"
    out_mp4 = tmp_path / "out.mp4"

    m.main([
        "--frames-dir", str(frames_dir),
        "--captions", str(tmp_path / "missing_captions.json"),
        "--out-gif", str(out_gif),
        "--out-mp4", str(out_mp4),
        "--seconds-per-frame", "0.2",
        "--gif-width", "160",
        "--no-music",
    ])

    assert out_mp4.exists()
    stderr = _run_ffmpeg_probe(out_mp4)
    assert "Audio:" not in stderr


def test_odd_dimensions_do_not_crash(tmp_path):
    frames_dir = tmp_path / "frames"
    frames_dir.mkdir()
    _make_frame(frames_dir / "01-a.png", (641, 399), (200, 60, 60))
    _make_frame(frames_dir / "02-b.png", (320, 200), (60, 200, 60))

    out_gif = tmp_path / "out.gif"
    out_mp4 = tmp_path / "out.mp4"

    m.main([
        "--frames-dir", str(frames_dir),
        "--captions", str(tmp_path / "missing_captions.json"),
        "--out-gif", str(out_gif),
        "--out-mp4", str(out_mp4),
        "--seconds-per-frame", "0.2",
        "--gif-width", "160",
    ])

    assert out_mp4.exists()
    assert out_mp4.stat().st_size > 0
