"""Voice endpoints.

Speech recognition and synthesis run in the browser through the Web Speech API
by default, which keeps latency low and costs nothing. If you wire up a hosted
speech provider, its credentials live here on the server and never reach the
client. /process is the single entry point the voice UI calls after it has a
transcript.
"""
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_optional_user
from app.models import User
from app.routers.ai import car_assistant
from app.schemas.ai import AssistantRequest, AssistantResponse, LanguageOut, SpeakRequest

router = APIRouter(prefix="/api/voice", tags=["voice"])

LANGUAGES = [
    LanguageOut(code="en", label="English", native_label="English", speech_code="en-IN"),
    LanguageOut(code="te", label="Telugu", native_label="తెలుగు", speech_code="te-IN"),
    LanguageOut(code="hi", label="Hindi", native_label="हिन्दी", speech_code="hi-IN"),
    LanguageOut(code="auto", label="Auto detect", native_label="Auto", speech_code="en-IN"),
]

SPEED_RATE = {"slow": 0.8, "normal": 1.0, "fast": 1.25}


@router.get("/languages", response_model=list[LanguageOut])
def languages():
    return LANGUAGES


@router.post("/process", response_model=AssistantResponse)
def process(payload: AssistantRequest, db: Session = Depends(get_db),
            user: User | None = Depends(get_optional_user)):
    """Same brain as the text assistant; input_type is recorded as voice."""
    payload.input_type = "voice"
    return car_assistant(payload, db, user)


@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...), language: str = "auto"):
    """Server-side speech to text. Only used when SPEECH_PROVIDER is set to a
    hosted service - otherwise the browser has already done this."""
    if settings.speech_provider == "browser" or not settings.speech_api_key:
        raise HTTPException(
            status.HTTP_501_NOT_IMPLEMENTED,
            "Server transcription is off. The browser's Web Speech API handles this; "
            "set SPEECH_PROVIDER and SPEECH_API_KEY to switch.",
        )
    raise NotImplementedError("Call your speech provider here with settings.speech_api_key")


@router.post("/speak")
def speak(payload: SpeakRequest):
    """Returns what the client needs to speak the reply. With the browser
    provider this is voice settings rather than audio bytes, so there is no
    audio round trip."""
    lang = payload.language if payload.language in ("en", "te", "hi") else "en"
    speech_code = {"en": "en-IN", "te": "te-IN", "hi": "hi-IN"}[lang]
    if settings.speech_provider == "browser" or not settings.speech_api_key:
        return {
            "mode": "client",
            "text": payload.text,
            "speech_lang": speech_code,
            "rate": SPEED_RATE[payload.speed],
            "pitch": 1.0,
        }
    raise NotImplementedError("Return base64 audio from your TTS provider here")
