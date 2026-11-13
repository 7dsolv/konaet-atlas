"""Read embedded metadata; optionally resolve a Chromaprint through AcoustID.

Without an explicit ACOUSTID_API_KEY, no fingerprint leaves the machine.
Missing or ambiguous matches leave the original metadata intact.
"""
import io
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def text(value, fallback='', limit=160):
    if isinstance(value, (list, tuple)):
        value = value[0] if value else ''
    return ''.join(c for c in str(value or fallback) if c.isprintable()).strip()[:limit] or fallback


def read_metadata(data, fallback):
    filename = text(fallback.get('file_name'), 'Faixa PairBeat')
    stem = re.sub(r'\.(mp3|m4a|ogg|wav)$', '', filename, flags=re.I)
    parts = stem.split(' - ', 1)
    result = {'title': text(fallback.get('title'), parts[-1]),
              'artist': text(fallback.get('performer'), parts[0] if len(parts) == 2 else 'Artista não informado', 100),
              'album': '', 'duration': fallback.get('duration'),
              'recognition': {'method': 'telegram' if fallback.get('title') else 'filename'}}
    try:
        import mutagen
        from mutagen.id3 import ID3
    except ImportError:
        return result
    try:
        item = mutagen.File(io.BytesIO(data), easy=True)
        if item is not None:
            for field in ('title', 'artist', 'album'):
                found = text(item.get(field))
                if found:
                    result[field] = found
                    result['recognition'] = {'method': 'embedded-metadata'}
            length = getattr(item.info, 'length', None)
            if isinstance(length, (int, float)) and 0 < length < 86400:
                result['duration'] = round(length, 2)
    except (mutagen.MutagenError, ValueError, OSError):
        # ID3 tags may be readable even if the truncated preview has no MPEG frames.
        try:
            tags = ID3(fileobj=io.BytesIO(data))
            for field, key in (('title', 'TIT2'), ('artist', 'TPE1'), ('album', 'TALB')):
                frame = tags.get(key)
                if frame and frame.text:
                    result[field] = text(frame.text)
                    result['recognition'] = {'method': 'embedded-metadata'}
        except (mutagen.MutagenError, ValueError, OSError):
            pass
    return result


def select_match(response, threshold=.9):
    if not isinstance(response, dict) or response.get('status') != 'ok':
        return None
    matches = []
    for entry in response.get('results', []):
        score = entry.get('score', 0)
        if not isinstance(score, (int, float)) or score < threshold:
            continue
        for recording in entry.get('recordings', []):
            if recording.get('title'):
                matches.append({'title': text(recording['title']), 'artist': ' / '.join(text(a.get('name')) for a in recording.get('artists', []) if a.get('name'))[:100],
                                'recording_id': recording.get('id'), 'score': score})
    matches.sort(key=lambda m: m['score'], reverse=True)
    if not matches:
        return None
    if any(m['recording_id'] != matches[0]['recording_id'] and abs(m['score']-matches[0]['score']) < .03 for m in matches[1:]):
        return None
    return matches[0]


def recognize(data, fallback, api_key=None):
    result = read_metadata(data, fallback)
    key = api_key if api_key is not None else os.getenv('ACOUSTID_API_KEY')
    binary = shutil.which('fpcalc') if key else None
    if not key or not binary:
        return result
    try:
        with tempfile.TemporaryDirectory(prefix='konaet-audio-') as directory:
            path = Path(directory) / 'input.audio'
            path.write_bytes(data)
            run = subprocess.run([binary, '-json', '-length', '120', str(path)], capture_output=True, timeout=35, check=False)
            fingerprint = json.loads(run.stdout)
        seconds = fingerprint.get('duration')
        signature = fingerprint.get('fingerprint')
        if not isinstance(seconds, (int, float)) or seconds < 12 or not isinstance(signature, str) or len(signature) > 20000:
            return result
        body = urlencode({'client': key, 'duration': round(seconds), 'fingerprint': signature, 'meta': 'recordings', 'format': 'json'}).encode()
        request = Request('https://api.acoustid.org/v2/lookup', body, {'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'KONAET-PairBeat/1.0'})
        with urlopen(request, timeout=20) as response:
            match = select_match(json.loads(response.read(2 * 1024 * 1024)))
        if match:
            result.update({k: match[k] for k in ('title', 'artist') if match[k]})
            result['recognition'] = {'method': 'acoustid', 'recording_id': match['recording_id'], 'score': round(match['score'], 4)}
    except (OSError, ValueError, subprocess.TimeoutExpired):
        pass  # Identification is optional; an outage must not lose an uploaded song.
    return result
