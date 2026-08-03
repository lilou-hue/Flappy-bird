#!/usr/bin/env python3
"""
Move the arcade to /arcade/ so the root can host something else.

Run from the repo root. Uses `git mv` so history follows the files.

What moves: the arcade homepage, its shared CSS/JS, its PWA manifest and
service worker, and every game/page directory.

What stays at root: CNAME, .nojekyll, robots.txt, sitemap.xml, the shared
icons and og-images (referenced by both sites), and dev files.
"""
import os
import re
import subprocess
import sys

MOVE_DIRS = [
    "achievements", "art-of-doing-nothing", "astro-miner", "beat-drop",
    "dragon-lab", "dress-up", "flappy-bird", "gravity-garden", "gun-game",
    "heart-serve", "inkognito", "last-seen-online", "leaderboard-page",
    "life-in-weeks", "lumina", "methane-drift", "neon-pong", "phantom-road",
    "profile", "rivals", "shop", "snake", "spend", "stack-tower", "star-fury",
    "tetris", "the-deep", "unicorn-clicker",
]
MOVE_FILES = [
    "index.html", "arcade.css", "arcade.js", "i18n.js",
    "leaderboard.css", "leaderboard.js", "shop.css", "shop.js",
    "manifest.json", "sw.js",
]
# Shared between both sites - deliberately NOT moved, so refs to them stay valid.
KEEP_AT_ROOT = {
    "icon.svg", "icon-192.png", "icon-512.png", "apple-touch-icon.png",
    "og-image.png", "og-image.svg", "robots.txt", "sitemap.xml",
}


def sh(*args):
    subprocess.run(args, check=True)


def move_everything():
    os.makedirs("arcade", exist_ok=True)
    for d in MOVE_DIRS:
        if os.path.isdir(d) and not os.path.isdir(os.path.join("arcade", d)):
            sh("git", "mv", d, f"arcade/{d}")
    for f in MOVE_FILES:
        if os.path.isfile(f) and not os.path.isfile(os.path.join("arcade", f)):
            sh("git", "mv", f, f"arcade/{f}")


def build_rewrites():
    """Root-absolute references that must gain the /arcade prefix."""
    targets = [f"/{d}/" for d in MOVE_DIRS]
    targets += [f"/{f}" for f in MOVE_FILES if f != "index.html"]
    # longest first so /shop/ is not clobbered by /shop.js
    targets.sort(key=len, reverse=True)
    return targets


def rewrite_file(path, targets):
    try:
        src = open(path, encoding="utf-8").read()
    except (UnicodeDecodeError, IsADirectoryError):
        return 0
    out, n = src, 0

    for t in targets:
        for q in ('"', "'"):
            old, new = f"{q}{t}", f"{q}/arcade{t}"
            if old in out:
                n += out.count(old)
                out = out.replace(old, new)

    # bare href="/" and src="/" -> the arcade home
    for attr in ("href", "src", "action"):
        for q in ('"', "'"):
            old, new = f'{attr}={q}/{q}', f'{attr}={q}/arcade/{q}'
            if old in out:
                n += out.count(old)
                out = out.replace(old, new)
    # service-worker precache entry for the site root
    out2 = re.sub(r"(['\"])/\1(\s*,)", r"\1/arcade/\1\2", out)
    if out2 != out:
        n += 1
        out = out2

    if out != src:
        open(path, "w", encoding="utf-8").write(out)
    return n


def main():
    if not os.path.isfile("CNAME"):
        sys.exit("run me from the SlayPlay repo root")
    move_everything()
    targets = build_rewrites()

    total, touched = 0, 0
    for root, dirs, files in os.walk("arcade"):
        dirs[:] = [d for d in dirs if d != "node_modules"]
        for fn in files:
            if not fn.endswith((".html", ".js", ".json", ".css", ".webmanifest")):
                continue
            n = rewrite_file(os.path.join(root, fn), targets)
            if n:
                touched += 1
                total += n
    print(f"rewrote {total} references across {touched} files")


if __name__ == "__main__":
    main()
