import io
import unittest
from unittest.mock import patch
from integrations.audio_recognition import read_metadata, select_match, recognize
from integrations.pairbeat_sync import audio_attachment
from integrations.pairbeat_service import serve


class IdentificationTests(unittest.TestCase):
    def test_embedded_id3_metadata_overrides_generic_file_name(self):
        from mutagen.id3 import ID3, TIT2, TPE1, TALB
        stream = io.BytesIO()
        tags = ID3()
        tags.add(TIT2(encoding=3, text=['Estudo original']))
        tags.add(TPE1(encoding=3, text=['KONAET']))
        tags.add(TALB(encoding=3, text=['Prancha um']))
        tags.save(stream)
        info = read_metadata(stream.getvalue(), {'file_name': 'unhelpful.mp3'})
        self.assertEqual(info['title'], 'Estudo original')
        self.assertEqual(info['artist'], 'KONAET')
        self.assertEqual(info['recognition']['method'], 'embedded-metadata')

    def test_file_name_fallback_does_not_claim_acoustic_match(self):
        info = read_metadata(b'not audio', {'file_name': 'Artist - Track.mp3'})
        self.assertEqual((info['artist'], info['title']), ('Artist', 'Track'))
        self.assertEqual(info['recognition']['method'], 'filename')

    def test_external_identification_never_runs_without_key(self):
        with patch('integrations.audio_recognition.shutil.which') as binary:
            recognize(b'fixture', {'file_name': 'local.mp3'}, api_key='')
        binary.assert_not_called()

    def test_ambiguous_acoustic_results_are_not_reported_as_a_match(self):
        fixture = {'status': 'ok', 'results': [{'score': .97, 'recordings': [{'id': 'a', 'title': 'A'}, {'id': 'b', 'title': 'B'}]}]}
        self.assertIsNone(select_match(fixture))
        fixture['results'][0]['recordings'].pop()
        self.assertEqual(select_match(fixture)['title'], 'A')
        fixture['results'][0]['score'] = .6
        self.assertIsNone(select_match(fixture))

    def test_music_documents_are_selected_but_other_attachments_are_not(self):
        document = {'file_name': 'track.MP3', 'file_id': 'fixture'}
        self.assertEqual(audio_attachment({'document': document}), document)
        self.assertIsNone(audio_attachment({'document': {'file_name': 'script.py'}}))
        self.assertIsNone(audio_attachment({'document': {'file_name': 'song.mp3.exe'}}))


class Stop:
    def __init__(self): self.delays = []
    def is_set(self): return False
    def wait(self, seconds): self.delays.append(seconds)


class ContinuousTests(unittest.TestCase):
    def test_disabled_continuous_mode_never_consumes_updates(self):
        from integrations.pairbeat_sync import SyncError
        calls = []
        with self.assertRaises(SyncError):
            serve(lambda: calls.append(True), lambda: False, 20, Stop(), lambda _: None, limit=1)
        self.assertEqual(calls, [])

    def test_service_retries_transient_failure_with_backoff(self):
        from integrations.pairbeat_sync import SyncError
        stop, results = Stop(), []
        calls = [False, True, True]
        def cycle():
            if not calls.pop(0): raise SyncError('temporary')
            return {'published': 1}
        serve(cycle, lambda: True, 20, stop, results.append, limit=3)
        self.assertEqual(stop.delays, [40, 20])
        self.assertEqual(len(results), 2)


if __name__ == '__main__': unittest.main()
