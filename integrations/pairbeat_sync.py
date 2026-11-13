"""Private Telegram ingestion -> public GitHub audio assets and Atlas catalog.

No token, chat ID or Telegram file URL is written into public output.
Standard library only. This collector must be the bot's sole update consumer.
"""
import base64
import hashlib
import hmac
import json
import os
import re
import sys
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler

MAX_AUDIO = 20 * 1024 * 1024
CATALOG_PATH = 'site/music/catalog.json'
STATE_PATH = 'integrations/pairbeat-state.json'


class SyncError(Exception):
    pass


class InvalidAudio(Exception):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(url, method='GET', data=None, headers=None, limit=MAX_AUDIO):
    req = Request(url, data=data, method=method, headers=headers or {})
    try:
        with build_opener(NoRedirect).open(req, timeout=35) as response:
            result = response.read(limit + 1)
            if len(result) > limit:
                raise SyncError('Remote response exceeds the permitted size')
            return response.status, result
    except HTTPError as error:
        # Never propagate urllib's exception text: it may include a bot token URL.
        return error.code, b''
    except (URLError, TimeoutError, OSError):
        raise SyncError('Remote service unavailable; credentials and request URL omitted') from None


def decode(raw):
    try:
        return json.loads(raw)
    except (ValueError, UnicodeError):
        raise SyncError('Remote service returned invalid JSON') from None


def fingerprint(chat_id, key):
    return hmac.new(key.encode(), str(chat_id).encode(), hashlib.sha256).hexdigest()


def is_pairing(message, code):
    text = message.get('text', '')
    return isinstance(text, str) and any(hmac.compare_digest(text.strip(), expected) for expected in ('/start atlas_' + code, '/vincular ' + code))


def audio_format(data):
    if data.startswith(b'ID3') or (len(data) > 2 and data[0] == 255 and data[1] & 224 == 224):
        return 'mp3', 'audio/mpeg'
    if data.startswith(b'OggS'):
        return 'ogg', 'audio/ogg'
    if data.startswith(b'RIFF') and data[8:12] == b'WAVE':
        return 'wav', 'audio/wav'
    if len(data) > 16 and data[4:8] == b'ftyp' and data[8:12] in (b'M4A ', b'isom', b'mp42'):
        return 'm4a', 'audio/mp4'
    raise InvalidAudio('Unsupported audio container')


def title(value, fallback, maximum=160):
    return ''.join(c for c in str(value or fallback) if c.isprintable()).strip()[:maximum] or fallback


class Telegram:
    def __init__(self, token):
        self.token = token

    def call(self, method, values=None):
        status, raw = request('https://api.telegram.org/bot' + self.token + '/' + method, 'POST', json.dumps(values or {}).encode(), {'Content-Type': 'application/json'}, 2 * 1024 * 1024)
        if status != 200:
            raise SyncError(f'Telegram API failed: HTTP {status}; update cursor preserved')
        result = decode(raw)
        if not result.get('ok'):
            raise SyncError('Telegram API rejected the request')
        return result['result']

    def download(self, audio):
        if not isinstance(audio, dict) or not re.fullmatch(r'[\w-]{1,512}', audio.get('file_id', '')):
            raise InvalidAudio('Invalid audio reference')
        if audio.get('file_size', MAX_AUDIO + 1) > MAX_AUDIO:
            raise InvalidAudio('Audio exceeds Telegram cloud download limit')
        info = self.call('getFile', {'file_id': audio['file_id']})
        path = info.get('file_path', '')
        if not re.fullmatch(r'[A-Za-z0-9_./-]{1,1024}', path) or any(p in ('', '.', '..') for p in path.split('/')):
            raise SyncError('Telegram returned an invalid file path')
        status, data = request('https://api.telegram.org/file/bot' + self.token + '/' + path)
        if status != 200:
            raise SyncError(f'Telegram file download failed: HTTP {status}')
        if not data or len(data) > MAX_AUDIO:
            raise InvalidAudio('Empty or oversized audio')
        audio_format(data)
        return data


class GitHub:
    def __init__(self, repo, token):
        if not re.fullmatch(r'[\w.-]+/[\w.-]+', repo):
            raise SyncError('Invalid repository')
        self.repo, self.token = repo, token

    def call(self, path, method='GET', data=None, content_type='application/json', optional=False, upload=False):
        host = 'https://uploads.github.com' if upload else 'https://api.github.com'
        headers = {'Authorization': 'Bearer ' + self.token, 'Accept': 'application/vnd.github+json', 'User-Agent': 'KONAET-PairBeat', 'Content-Type': content_type, 'X-GitHub-Api-Version': '2022-11-28'}
        body = data if isinstance(data, bytes) else json.dumps(data).encode() if data is not None else None
        status, raw = request(host + path, method, body, headers, 5 * 1024 * 1024)
        if status == 404 and optional:
            return None
        if status not in (200, 201, 204):
            raise SyncError(f'GitHub API failed: HTTP {status}; changes were not acknowledged')
        return decode(raw) if raw else None

    def get_json(self, path, default):
        entry = self.call(f'/repos/{self.repo}/contents/{path}?ref=main', optional=True)
        if entry is None:
            return default, None
        return decode(base64.b64decode(entry['content'])), entry['sha']

    def put_json(self, path, value, sha, message):
        body = {'message': message, 'branch': 'main', 'content': base64.b64encode((json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()).decode()}
        if sha:
            body['sha'] = sha
        result = self.call(f'/repos/{self.repo}/contents/{path}', 'PUT', body)
        return result['content']['sha']

    def publish_audio(self, track_id, data, track_title):
        ext, mime = audio_format(data)
        tag = 'pairbeat-' + track_id
        release = self.call(f'/repos/{self.repo}/releases/tags/{tag}', optional=True)
        if release is None:
            # A prior interrupted upload may have left an unpublished draft.
            for page in range(1, 5):
                batch = self.call(f'/repos/{self.repo}/releases?per_page=100&page={page}')
                release = next((r for r in batch if r['tag_name'] == tag), None)
                if release is not None or len(batch) < 100:
                    break
        if release is None:
            release = self.call(f'/repos/{self.repo}/releases', 'POST', {'tag_name': tag, 'target_commitish': 'main', 'name': 'PairBeat — ' + track_title[:90], 'body': 'Audio published by the linked owner of PairBeat for the KONAET Atlas music library.', 'draft': True, 'make_latest': 'false'})
        filename = track_id + '.' + ext
        assets = self.call(f'/repos/{self.repo}/releases/{release["id"]}/assets?per_page=100')
        asset = next((a for a in assets if a['name'] == filename and a.get('state') == 'uploaded'), None)
        if asset is None:
            if not release.get('draft'):
                raise SyncError('Published audio release is incomplete; leaving it unchanged')
            asset = self.call(f'/repos/{self.repo}/releases/{release["id"]}/assets?' + urlencode({'name': filename}), 'POST', data, mime, upload=True)
        if release.get('draft'):
            self.call(f'/repos/{self.repo}/releases/{release["id"]}', 'PATCH', {'draft': False, 'make_latest': 'false'})
        return f'https://github.com/{self.repo}/releases/download/{tag}/{filename}'

    def deploy(self):
        self.call(f'/repos/{self.repo}/actions/workflows/pages.yml/dispatches', 'POST', {'ref': 'main'})


def synchronize(tg, gh, code, owner_key):
    bot = tg.call('getMe')
    if bot.get('username', '').lower() != 'pairbeat7dsbot':
        raise SyncError('Unexpected Telegram bot identity')
    if tg.call('getWebhookInfo').get('url'):
        raise SyncError('An existing webhook is active; preserving it and stopping this collector')
    state, state_sha = gh.get_json(STATE_PATH, {'schema': 1, 'next_update_id': 0, 'owner_fingerprint': None})
    catalog, catalog_sha = gh.get_json(CATALOG_PATH, {'schema': 1, 'provider': {'name': 'PairBeat', 'username': 'PairBeat7dsbot', 'connected': False}, 'updated_at': None, 'tracks': []})
    if state.get('schema') != 1 or catalog.get('schema') != 1 or not isinstance(catalog.get('tracks'), list) or len(catalog['tracks']) > 250:
        raise SyncError('Incompatible catalog or collector state')
    original_state, original_catalog = json.dumps(state, sort_keys=True), json.dumps(catalog, sort_keys=True)
    updates = tg.call('getUpdates', {'offset': state['next_update_id'], 'limit': 100, 'timeout': 0, 'allowed_updates': ['message']})
    counts = {'published': 0, 'rejected': 0, 'linked': False}
    pending_error = None
    for update in updates:
        if not isinstance(update.get('update_id'), int):
            raise SyncError('Invalid update sequence')
        message = update.get('message', {})
        chat = message.get('chat', {})
        chat_id = chat.get('id')
        private = chat.get('type') == 'private' and isinstance(chat_id, int) and message.get('from', {}).get('id') == chat_id
        owner = state.get('owner_fingerprint')
        if private and not owner and is_pairing(message, code):
            state['owner_fingerprint'] = fingerprint(chat_id, owner_key)
            state['publish_pending'] = True
            catalog['provider']['connected'] = True
            counts['linked'] = True
        elif private and owner and hmac.compare_digest(owner, fingerprint(chat_id, owner_key)) and 'audio' in message:
            try:
                data = tg.download(message['audio'])
                digest = hashlib.sha256(data).hexdigest()
                track_id = digest[:24]
                if not any(t['id'] == track_id for t in catalog['tracks']):
                    if len(catalog['tracks']) >= 250:
                        raise InvalidAudio('Library capacity reached')
                    a = message['audio']
                    track_title = title(a.get('title'), title(a.get('file_name'), 'Faixa PairBeat'))
                    url = gh.publish_audio(track_id, data, track_title)
                    catalog['tracks'].append({'id': track_id, 'title': track_title, 'artist': title(a.get('performer'), 'PairBeat', 100), 'duration': a.get('duration') if isinstance(a.get('duration'), int) else None, 'url': url, 'sha256': digest})
                    counts['published'] += 1
                state['publish_pending'] = True
            except InvalidAudio:
                counts['rejected'] += 1
            except SyncError as error:
                pending_error = error
                break  # The failed update remains unacknowledged and is retried next cycle.
        state['next_update_id'] = max(state['next_update_id'], update['update_id'] + 1)
    catalog_changed = json.dumps(catalog, sort_keys=True) != original_catalog
    if catalog_changed:
        catalog['updated_at'] = datetime.now(timezone.utc).isoformat()
        gh.put_json(CATALOG_PATH, catalog, catalog_sha, 'Publish PairBeat library update [skip ci]')
        state['publish_pending'] = True
    if json.dumps(state, sort_keys=True) != original_state:
        state_sha = gh.put_json(STATE_PATH, state, state_sha, 'Save PairBeat ingestion cursor [skip ci]')
    if state.get('publish_pending'):
        gh.deploy()
        state['publish_pending'] = False
        gh.put_json(STATE_PATH, state, state_sha, 'Record PairBeat publication request [skip ci]')
    if pending_error:
        raise pending_error
    return counts


def main():
    required = ('PAIRBEAT_BOT_TOKEN', 'PAIRBEAT_LINK_CODE', 'PAIRBEAT_OWNER_KEY', 'GITHUB_TOKEN', 'GITHUB_REPOSITORY')
    if any(not os.getenv(k) for k in required):
        raise SyncError('PairBeat is not configured: repository secrets are missing')
    result = synchronize(Telegram(os.environ['PAIRBEAT_BOT_TOKEN']), GitHub(os.environ['GITHUB_REPOSITORY'], os.environ['GITHUB_TOKEN']), os.environ['PAIRBEAT_LINK_CODE'], os.environ['PAIRBEAT_OWNER_KEY'])
    print(json.dumps(result))


if __name__ == '__main__':
    try:
        main()
    except SyncError as error:
        print('PairBeat sync: ' + str(error), file=sys.stderr)
        sys.exit(1)
