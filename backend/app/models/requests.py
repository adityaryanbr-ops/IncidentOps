from pydantic import BaseModel, Field


class AnalyzeFormMeta(BaseModel):
    report_text: str = Field(min_length=1, max_length=8000)
    location: str = Field(min_length=1, max_length=500)
    latitude: float | None = None
    longitude: float | None = None
    transcript: str | None = Field(default=None, max_length=8000)


class OfficialHelplineRequest(BaseModel):
    location: str = Field(min_length=3, max_length=1000)
    category: str = Field(min_length=1, max_length=200)
