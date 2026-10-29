from unittest.mock import patch

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_transcription_returns_text():
    with patch('app.api.incidents.transcribe_audio', return_value='A tree blocks the road.'):
        response = client.post('/api/incidents/transcribe', files={'audio': ('note.webm', b'audio', 'audio/webm')})
    assert response.status_code == 200
    assert response.json() == {'text': 'A tree blocks the road.'}


def test_transcription_rejects_wrong_type_empty_and_large_uploads():
    for content, mime, status in [(b'html', 'text/html', 415), (b'', 'audio/webm', 400), (b'x' * (5 * 1024 * 1024 + 1), 'audio/webm', 413)]:
        response = client.post('/api/incidents/transcribe', files={'audio': ('note', content, mime)})
        assert response.status_code == status


def test_transcription_does_not_expose_internal_errors():
    with patch('app.api.incidents.transcribe_audio', side_effect=RuntimeError('private internals')):
        response = client.post('/api/incidents/transcribe', files={'audio': ('note.webm', b'audio', 'audio/webm')})
    assert response.status_code == 503
    assert 'private internals' not in response.text


def test_corrupt_audio_is_rejected_without_loading_model():
    # A real decoder check, independent of model weights and network access.
    from app.services.transcription import transcribe_audio
    from fastapi import HTTPException
    import pytest
    with pytest.raises(HTTPException) as error:
        transcribe_audio(b'not an audio container')
    assert error.value.status_code == 400
