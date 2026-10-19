#!/usr/bin/env python3
"""
Clifton Apparels Ltd. - Dyeing & Finishing Performance Dashboard
================================================================
File watcher / auto-rebuild helper.

Author : Ikramul Hasan Rakib
         Executive, Central IE Department, Clifton Group
(c) 2026 Ikramul Hasan Rakib. All rights reserved.

Watches the two live workbooks:
    * DYEING PERFORMANCE OVERVIEW.xlsx
    * FINISHING PERFORMANCE OVERVIEW.xlsx

and re-runs ``scripts/build.py`` whenever either of them is saved, so the
static dashboard (``dashboard/index.html``) always reflects the latest data.
Just refresh the browser tab after a rebuild.

Usage
-----
    python scripts/watch.py                 # build once, then watch
    python scripts/watch.py --no-build      # watch only (skip the first build)
    python scripts/watch.py --interval 5    # poll every 5 seconds (default 3)
    python scripts/watch.py --once          # build once and exit (no watching)

Stop with Ctrl+C.

The script is intentionally dependency-light (standard library only) so it
can run on any machine in the plant.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUILD = Path(__file__).resolve().parent / "build.py"
WORKBOOKS = [
    ROOT / "DYEING PERFORMANCE OVERVIEW.xlsx",
    ROOT / "FINISHING PERFORMANCE OVERVIEW.xlsx",
]

# How long a workbook's timestamp must stay unchanged before we rebuild.
# Excel writes in stages, so a short settle window avoids half-saved reads.
SETTLE_SECONDS = 2.0
# How many times to retry a failed build (e.g. the file was briefly locked).
BUILD_RETRIES = 3
RETRY_WAIT = 2.0


def log(message: str) -> None:
    print(f"[{datetime.now():%H:%M:%S}] {message}", flush=True)


def snapshot() -> dict:
    """Current (mtime, size) of every workbook that exists."""
    state = {}
    for path in WORKBOOKS:
        try:
            st = path.stat()
            state[path] = (st.st_mtime, st.st_size)
        except OSError:
            state[path] = None
    return state


def run_build() -> bool:
    """Run the ETL builder, retrying briefly if a workbook is locked."""
    for attempt in range(1, BUILD_RETRIES + 1):
        log(f"Rebuilding dashboard data (attempt {attempt}/{BUILD_RETRIES}) ...")
        try:
            proc = subprocess.run([sys.executable, str(BUILD)], cwd=str(ROOT))
        except OSError as exc:
            log(f"  could not launch {BUILD.name}: {exc}")
            proc = None

        if proc is not None and proc.returncode == 0:
            log("  rebuild complete - refresh the dashboard in your browser.")
            return True

        if attempt < BUILD_RETRIES:
            log(f"  build failed (workbook may be locked by Excel); retrying in {RETRY_WAIT:g}s ...")
            time.sleep(RETRY_WAIT)

    log("  rebuild FAILED - will try again when a workbook is next saved.")
    return False


def wait_until_settled(previous: dict, interval: float) -> dict:
    """Wait until the changed workbooks stop changing, then return the new state."""
    while True:
        time.sleep(SETTLE_SECONDS)
        current = snapshot()
        if current == previous:
            return current
        previous = current


def main() -> int:
    parser = argparse.ArgumentParser(description="Watch workbooks and rebuild the dashboard.")
    parser.add_argument("--interval", type=float, default=3.0,
                        help="seconds between change checks (default: 3)")
    parser.add_argument("--no-build", action="store_true",
                        help="do not run an initial build before watching")
    parser.add_argument("--once", action="store_true",
                        help="build once and exit (no watching)")
    args = parser.parse_args()

    missing = [p for p in WORKBOOKS if not p.exists()]
    if missing:
        for path in missing:
            log(f"WARNING: workbook not found: {path}")
        if len(missing) == len(WORKBOOKS):
            log("No workbooks to watch. Aborting.")
            return 1

    if args.once:
        return 0 if run_build() else 1

    if not args.no_build:
        run_build()

    log("Watching for changes:")
    for path in WORKBOOKS:
        log(f"  - {path.name}")
    log(f"Polling every {args.interval:g}s. Press Ctrl+C to stop.")

    state = snapshot()
    try:
        while True:
            time.sleep(args.interval)
            current = snapshot()
            if current != state:
                changed = [
                    p.name for p in WORKBOOKS
                    if current.get(p) != state.get(p)
                ]
                log("Change detected: " + ", ".join(changed))
                state = wait_until_settled(current, args.interval)
                run_build()
    except KeyboardInterrupt:
        log("Stopped watching. Goodbye.")
        return 0


if __name__ == "__main__":
    sys.exit(main())
