from pydantic import BaseModel, Field
from typing import Literal, Optional

Technique = Literal[
    "loaded_language", "fear_appeal", "false_dilemma", "whataboutism",
    "appeal_to_authority_unnamed", "appeal_to_authority_named",
    "urgency", "bandwagon", "scapegoating", "cherry_picking",
    "dehumanization", "ad_hominem", "causal_oversimplification",
]

class Span(BaseModel):
    technique: Technique
    quote: str = Field(..., max_length=400)          # exact substring of input
    explanation: str = Field(..., max_length=500)    # how it functions, plain language

class FramingNote(BaseModel):
    kind: Literal["implied_audience", "worldview", "notable_absence", "context", "who_benefits"]
    note: str

class Analysis(BaseModel):
    technique_spans: list[Span]
    framing_notes: list[FramingNote]
    confidence: Literal["low", "medium", "high"]
    abstain: bool
    abstain_reason: Optional[str] = None