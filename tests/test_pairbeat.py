import copy
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('pairbeat', Path(__file__).resolve().parents[1] / 'integrations/pairbeat_sync.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)
KEY, CODE = 'fixture-owner-key-not-a-credential', 'fixture-pair-code'
MP3 = b'ID3' + bytes(range(100))


def message(n, chat=42, text=None, audio=False, private=True):
    m = {'chat': {'id': chat, 'type': 'private' if private else 'group'}, 'from': {'id': chat}}
    if text:
        m['text'] = text
    if audio:
        m['audio'] = {'file_id': 'test-file', 'file_size': len(MP3), 'title': 'Original study', 'duration': 5}
    return {'update_id': n, 'message': m}


class Telegram:
    def __init__(self, updates=(), webhook=False, failure=False):
        self.updates, self.webhook, self.failure = list(updates), webhook, failure
        self.downloads = 0
        self.called = []

    def call(self, method, values=None):
        self.called.append(method)
        return {'getMe': {'username': 'PairBeat7dsbot'}, 'getWebhookInfo': {'url': 'https://existing.invalid/webhook' if self.webhook else ''}, 'getUpdates': self.updates}[method]

    def download(self, audio):
        self.downloads += 1
        if self.failure:
            raise p.SyncError('temporary failure')
        return MP3


class GitHub:
    def __init__(self, bound=False):
        self.files = {
            p.STATE_PATH: {'schema': 1, 'next_update_id': 0, 'owner_fingerprint': p.fingerprint(42, KEY) if bound else None},
            p.CATALOG_PATH: {'schema': 1, 'provider': {'connected': bound}, 'updated_at': None, 'tracks': []},
        }
        self.assets, self.deployments = 0, 0
        self.fail_deploy = False

    def get_json(self, path, default):
        return copy.deepcopy(self.files.get(path, default)), 'sha'

    def put_json(self, path, value, sha, message):
        self.files[path] = copy.deepcopy(value)
        return 'next-sha'

    def publish_audio(self, track_id, data, title):
        self.assets += 1
        return 'https://github.com/example/audio/releases/download/test/' + track_id + '.mp3'

    def deploy(self):
        if self.fail_deploy:
            raise p.SyncError('deployment unavailable')
        self.deployments += 1


class PairBeatTests(unittest.TestCase):
    def test_pairing_and_owner_upload_in_same_batch(self):
        gh = GitHub()
        result = p.synchronize(Telegram([message(1, text='/start atlas_' + CODE), message(2, audio=True)]), gh, CODE, KEY)
        self.assertTrue(result['linked'])
        self.assertEqual(result['published'], 1)
        self.assertEqual(gh.files[p.STATE_PATH]['next_update_id'], 3)
        self.assertTrue(gh.files[p.CATALOG_PATH]['provider']['connected'])
        self.assertEqual(gh.assets, 1)
        self.assertEqual(gh.deployments, 1)

    def test_wrong_code_and_unknown_chat_cannot_publish_or_trigger_deploy(self):
        gh = GitHub()
        tg = Telegram([message(1, text='/start atlas_wrong'), message(2, audio=True)])
        p.synchronize(tg, gh, CODE, KEY)
        self.assertIsNone(gh.files[p.STATE_PATH]['owner_fingerprint'])
        self.assertEqual(tg.downloads, 0)
        self.assertEqual(gh.deployments, 0)

    def test_group_cannot_bind_owner(self):
        gh = GitHub()
        p.synchronize(Telegram([message(1, text='/vincular ' + CODE, private=False)]), gh, CODE, KEY)
        self.assertIsNone(gh.files[p.STATE_PATH]['owner_fingerprint'])

    def test_bound_owner_cannot_be_replaced(self):
        gh = GitHub(bound=True)
        tg = Telegram([message(1, chat=99, text='/vincular ' + CODE), message(2, chat=99, audio=True)])
        p.synchronize(tg, gh, CODE, KEY)
        self.assertEqual(gh.files[p.STATE_PATH]['owner_fingerprint'], p.fingerprint(42, KEY))
        self.assertEqual(tg.downloads, 0)

    def test_repeat_audio_does_not_duplicate_asset_or_catalog(self):
        gh = GitHub(bound=True)
        p.synchronize(Telegram([message(1, audio=True), message(2, audio=True)]), gh, CODE, KEY)
        self.assertEqual(gh.assets, 1)
        self.assertEqual(len(gh.files[p.CATALOG_PATH]['tracks']), 1)

    def test_download_failure_keeps_update_unacknowledged(self):
        gh = GitHub(bound=True)
        with self.assertRaises(p.SyncError):
            p.synchronize(Telegram([message(1), message(2, audio=True)], failure=True), gh, CODE, KEY)
        self.assertEqual(gh.files[p.STATE_PATH]['next_update_id'], 2)
        self.assertEqual(gh.assets, 0)

    def test_existing_webhook_is_never_changed_or_consumed(self):
        tg = Telegram(webhook=True)
        with self.assertRaises(p.SyncError):
            p.synchronize(tg, GitHub(), CODE, KEY)
        self.assertNotIn('getUpdates', tg.called)

    def test_deploy_failure_is_retried_without_new_audio(self):
        gh = GitHub(bound=True)
        gh.fail_deploy = True
        with self.assertRaises(p.SyncError):
            p.synchronize(Telegram([message(1, audio=True)]), gh, CODE, KEY)
        self.assertTrue(gh.files[p.STATE_PATH]['publish_pending'])
        gh.fail_deploy = False
        p.synchronize(Telegram(), gh, CODE, KEY)
        self.assertEqual(gh.deployments, 1)
        self.assertFalse(gh.files[p.STATE_PATH]['publish_pending'])

    def test_public_output_excludes_chat_ids_file_ids_and_pair_code(self):
        gh = GitHub()
        p.synchronize(Telegram([message(1, text='/start atlas_' + CODE), message(2, audio=True)]), gh, CODE, KEY)
        output = str(gh.files)
        self.assertNotIn(CODE, output)
        self.assertNotIn(KEY, output)
        self.assertNotIn('test-file', output)
        self.assertNotIn('api.telegram.org', output)
        self.assertNotIn('chat_id', output)

    def test_content_detection_rejects_non_audio(self):
        for data in (b'<html>not audio', b'#!/bin/sh', b'', b'RIFFxxxxxxxx'):
            with self.subTest(data=data), self.assertRaises(p.InvalidAudio):
                p.audio_format(data)
        self.assertEqual(p.audio_format(MP3)[1], 'audio/mpeg')

    def test_catalog_commit_followed_by_cursor_failure_recovers_publication(self):
        gh = GitHub(bound=True)
        normal_put = gh.put_json
        def fail_cursor(path, *args):
            if path == p.STATE_PATH:
                raise p.SyncError('cursor save unavailable')
            return normal_put(path, *args)
        gh.put_json = fail_cursor
        with self.assertRaises(p.SyncError):
            p.synchronize(Telegram([message(1, audio=True)]), gh, CODE, KEY)
        self.assertEqual(gh.files[p.STATE_PATH]['next_update_id'], 0)
        self.assertEqual(len(gh.files[p.CATALOG_PATH]['tracks']), 1)
        gh.put_json = normal_put
        p.synchronize(Telegram([message(1, audio=True)]), gh, CODE, KEY)
        self.assertEqual(gh.assets, 1)
        self.assertEqual(gh.deployments, 1)

    def test_file_path_cannot_escape_telegram_origin(self):
        tg = p.Telegram('000000:fixture')
        tg.call = lambda *args: {'file_path': '../secret'}
        with self.assertRaises(p.SyncError):
            tg.download({'file_id': 'fixture', 'file_size': 100})

    def test_oversized_audio_is_rejected_before_request(self):
        tg = p.Telegram('000000:fixture')
        tg.call = lambda *args: self.fail('No API request expected')
        with self.assertRaises(p.InvalidAudio):
            tg.download({'file_id': 'fixture', 'file_size': p.MAX_AUDIO + 1})

    def test_malformed_credential_never_reaches_url_or_error_output(self):
        with self.assertRaises(p.SyncError) as failure:
            p.Telegram('private-value\nmalformed')
        self.assertNotIn('private-value', str(failure.exception))


if __name__ == '__main__':
    unittest.main()
