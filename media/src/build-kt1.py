#!/usr/bin/env python3
"""Сборка ролика media/kt1-interview.{mp4,vtt,txt,jpg} из media/src/kt1-interview.html.

Запуск (из любой папки):  python3 media/src/build-kt1.py
Нужны: Python playwright, Chromium (/opt/pw-browsers/chromium или стандартный), ffmpeg.
Каждый кадр 30 fps рисуется детерминированно: страница сама выставляет состояние через seek(t),
поэтому запись не зависит от скорости машины. Одинаковые подряд кадры не перерисовываются.
Параметры: --frames-dir DIR  сохранить контрольные кадры (по одному на сцену) в DIR.
"""
import argparse, os, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
MEDIA = HERE.parent
SRC = HERE / "kt1-interview.html"
OUT = "kt1-interview"
FPS = 30
SIZE = 1080
CRF = 27
CHROMIUM = "/opt/pw-browsers/chromium"


def ts(sec):
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


def mmss(sec):
    return f"{int(sec // 60):02d}:{int(sec % 60):02d}"


def wrap(text, width=46):
    """Перенос субтитра на две строки примерно пополам (если длиннее width)."""
    if len(text) <= width:
        return text
    words, best = text.split(), None
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        if words[i - 1].isdigit():  # цифру не отрываем от слова: «2 / сотрудника»
            continue
        score = abs(len(a) - len(b))
        if best is None or score < best[0]:
            best = (score, a, b)
    return f"{best[1]}\n{best[2]}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames-dir", default=None)
    ap.add_argument("--only-frames", action="store_true", help="только контрольные кадры, без видео")
    args = ap.parse_args()

    with sync_playwright() as pw:
        kw = {"executable_path": CHROMIUM} if os.path.exists(CHROMIUM) else {}
        browser = pw.chromium.launch(args=["--font-render-hinting=none"], **kw)
        page = browser.new_page(viewport={"width": SIZE, "height": SIZE}, device_scale_factor=1)
        page.goto(SRC.as_uri() + "?render=1")
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(300)
        total = page.evaluate("TOTAL")
        scenes = page.evaluate("SCENES")
        cues = page.evaluate("CUES_ABS")
        for c in cues:
            c["text"] = c["text"].replace("\u00a0", " ")

        # --- субтитры и расшифровка ---
        vtt = ["WEBVTT", "", "NOTE КТ-1 «Интервью о последнем выборе». Тайминги по сценам.", ""]
        for n, c in enumerate(cues, 1):
            vtt += [str(n), f"{ts(c['from'])} --> {ts(c['to'])}", wrap(c["text"]), ""]
        (MEDIA / f"{OUT}.vtt").write_text("\n".join(vtt), encoding="utf-8")

        txt = ["КТ-1. Интервью о последнем выборе — расшифровка ролика", f"Длительность: {mmss(total)} ({total:.0f} с), без звука; смысл несут текст на экране и субтитры.", ""]
        for i, s in enumerate(scenes):
            txt.append(f"{i+1}. {s['title']} [{mmss(s['start'])}–{mmss(s['start']+s['dur'])}]")
            txt.append(f"На экране: {s['desc']}")
            for c in cues:
                if c["scene"] == i:
                    txt.append(f"  [{mmss(c['from'])}] {c['text']}")
            txt.append("")
        (MEDIA / f"{OUT}.txt").write_text("\n".join(txt), encoding="utf-8")

        # --- проверки вёрстки: субтитры не длиннее двух строк, ничего не заходит под полосу субтитров ---
        problems = []
        for c in cues:
            page.evaluate(f"seek({(c['from'] + c['to']) / 2})")
            lines = page.evaluate("Math.round(document.querySelector('#sub span').getBoundingClientRect().height / (34 * 1.34))")
            if lines > 2:
                problems.append(f"субтитр в {mmss(c['from'])} занимает {lines} строки: {c['text']}")
        for i, s in enumerate(scenes):
            page.evaluate(f"seek({s['start'] + s['dur'] - 0.75})")
            low = page.evaluate("""() => [...document.querySelectorAll('.scene .a')].filter(e => getComputedStyle(e).visibility === 'visible' && +getComputedStyle(e).opacity > 0.5 && e.getBoundingClientRect().height > 0)
                .map(e => e.getBoundingClientRect().bottom).reduce((m, v) => Math.max(m, v), 0)""")
            if low > 905:
                problems.append(f"сцена {i + 1}: контент доходит до y={low:.0f}, субтитры начинаются с 920")
        for p_ in problems:
            print("ВНИМАНИЕ:", p_)
        if problems:
            sys.exit("исправьте вёрстку и запустите снова")

        # --- контрольные кадры ---
        # (метка, сцена, секунда от начала сцены)
        marks = [("s1", 0, 15.8), ("s2", 1, 15.0), ("s3", 2, 19.2), ("s4a", 3, 7.9), ("s4b", 3, 17.0), ("s5", 4, 16.8), ("s6", 5, 13.0)]
        def shot(sc, loc, **kw):
            page.evaluate(f"seek({scenes[sc]['start'] + loc})")
            return page.screenshot(**kw)
        if args.frames_dir:
            d = Path(args.frames_dir); d.mkdir(parents=True, exist_ok=True)
            for name, sc, loc in marks:
                (d / f"{OUT}-{name}.png").write_bytes(shot(sc, loc, type="png"))
        # превью-кадр сцены 3 (все четыре карточки на экране)
        (MEDIA / f"{OUT}.jpg").write_bytes(shot(2, 19.2, type="jpeg", quality=90))
        if args.only_frames:
            browser.close(); return

        # --- запись ---
        mp4 = MEDIA / f"{OUT}.mp4"
        ff = subprocess.Popen([
            "ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "png", "-i", "-",
            "-c:v", "libx264", "-preset", "slow", "-crf", str(CRF), "-tune", "animation", "-pix_fmt", "yuv420p",
            "-r", str(FPS), "-movflags", "+faststart", "-an", str(mp4)], stdin=subprocess.PIPE)
        n = int(round(total * FPS))
        prev_sig, prev_png, t_start = None, None, time.time()
        for f in range(n):
            sig = page.evaluate(f"seek({f / FPS})")
            if sig != prev_sig:
                prev_png = page.screenshot(type="png")
                prev_sig = sig
            ff.stdin.write(prev_png)
            if f % 300 == 0:
                print(f"кадр {f}/{n}, {time.time() - t_start:.0f} с", flush=True)
        ff.stdin.close()
        if ff.wait() != 0:
            sys.exit("ffmpeg завершился с ошибкой")
        browser.close()
    print("готово:", mp4, f"{mp4.stat().st_size / 1e6:.2f} МБ")


if __name__ == "__main__":
    main()
