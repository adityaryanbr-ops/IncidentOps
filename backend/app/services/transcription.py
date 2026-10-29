from functools import lru_cache
from io import BytesIO
from pathlib import Path
from threading import Lock

from fastapi import HTTPException

# Keep model files with the app, outside source control; no paid speech API is needed.
MODEL_CACHE = Path(__file__).resolve().parents[2] / '.models'
transcription_lock = Lock()


@lru_cache(maxsize=1)
def speech_model():
    from faster_whisper import WhisperModel
    from faster_whisper.utils import download_model
    model_path = MODEL_CACHE / 'base'
    if not (model_path / 'model.bin').exists():
        download_model('base', output_dir=str(model_path))
    return WhisperModel(str(model_path), device='cpu', compute_type='int8')


def transcribe_audio(content: bytes) -> str:
    import av
    import numpy as np

    samples = []
    count = 0
    try:
        with av.open(BytesIO(content)) as container:
            resampler = av.AudioResampler(format='s16', layout='mono', rate=16000)
            for frame in container.decode(audio=0):
                for converted in resampler.resample(frame):
                    count += converted.samples
                    if count > 60 * 16000:
                        raise HTTPException(413, 'Keep voice reports under 60 seconds.')
                    samples.append(converted.to_ndarray().flatten())
            for converted in resampler.resample(None):
                count += converted.samples
                samples.append(converted.to_ndarray().flatten())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(400, 'Audio could not be read. Record your report again.') from exc
    if not samples or count > 60 * 16000:
        raise HTTPException(400, 'Record between 1 and 60 seconds of speech.')
    audio = np.concatenate(samples).astype(np.float32) / 32768.0
    with transcription_lock:
        segments, _ = speech_model().transcribe(audio, beam_size=3, vad_filter=True)
        text = ' '.join(segment.text.strip() for segment in segments).strip()
    if not text:
        raise HTTPException(422, 'No speech detected. Speak near the microphone and try again.')
    return text
