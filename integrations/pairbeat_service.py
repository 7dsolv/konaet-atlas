"""Continuously run the PairBeat collector on an always-on host.

The working GitHub schedule remains the default until PAIRBEAT_RUN_MODE is
explicitly set to continuous. No server, credentials or billing is created.
"""
import argparse
import json
import os
from pathlib import Path
import signal
import threading
import time
import tempfile

try:
    from .pairbeat_sync import GitHub, Telegram, SyncError, synchronize
except ImportError:
    from pairbeat_sync import GitHub, Telegram, SyncError, synchronize


def serve(sync, enabled, interval, stopping, health, *, limit=None):
    failures = 0
    cycles = 0
    while not stopping.is_set():
        try:
            active = enabled()
        except SyncError:
            failures += 1
            cycles += 1
            print(json.dumps({'status': 'checking-mode', 'failures': failures}), flush=True)
            if limit is not None and cycles >= limit:
                return
            stopping.wait(min(300, interval * 2 ** min(failures, 4)))
            continue
        if not active:
            raise SyncError('Continuous mode is not enabled; scheduled collector preserved')
        try:
            counts = sync()
            failures = 0
            health({'last_success': time.time(), 'published': counts.get('published', 0)})
            print(json.dumps({'status': 'ok', **counts}), flush=True)
        except SyncError:
            failures += 1
            print(json.dumps({'status': 'retrying', 'failures': failures}), flush=True)
        cycles += 1
        if limit is not None and cycles >= limit:
            return
        stopping.wait(min(300, interval * 2 ** min(failures, 4)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--interval', type=int, default=20)
    args = parser.parse_args()
    if not 15 <= args.interval <= 300:
        raise SyncError('Interval must be between 15 and 300 seconds')
    names = ('PAIRBEAT_BOT_TOKEN', 'PAIRBEAT_LINK_CODE', 'PAIRBEAT_OWNER_KEY', 'GITHUB_TOKEN', 'GITHUB_REPOSITORY')
    if any(not os.getenv(name) for name in names):
        raise SyncError('Continuous service environment is incomplete')
    gh = GitHub(os.environ['GITHUB_REPOSITORY'], os.environ['GITHUB_TOKEN'])
    tg = Telegram(os.environ['PAIRBEAT_BOT_TOKEN'])
    def enabled():
        entry = gh.call(f'/repos/{gh.repo}/actions/variables/PAIRBEAT_RUN_MODE', optional=True)
        return bool(entry and entry.get('value') == 'continuous')
    stopping = threading.Event()
    for name in ('SIGINT', 'SIGTERM'):
        if hasattr(signal, name):
            signal.signal(getattr(signal, name), lambda *_: stopping.set())
    target = Path(os.getenv('PAIRBEAT_HEALTH_FILE', str(Path(tempfile.gettempdir()) / 'pairbeat-health.json')))
    def health(value):
        target.write_text(json.dumps(value), encoding='utf-8')
    serve(lambda: synchronize(tg, gh, os.environ['PAIRBEAT_LINK_CODE'], os.environ['PAIRBEAT_OWNER_KEY']), enabled, args.interval, stopping, health)


if __name__ == '__main__':
    try:
        main()
    except SyncError as error:
        raise SystemExit('PairBeat service: ' + str(error))
