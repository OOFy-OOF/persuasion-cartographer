from pydantic import BaseModel, Field
from typing import Literal, Optional

Technique = Literal[
    "loaded_language", "fear_appeal", "false_dilemma", "whataboutism",
    "appeal_to_authority_unnamed", "appeal_to_authority_named",
    "urgency", "bandwagon", "scapegoating", "cherry_picking",
    "dehumanization", "ad_hominem", "causal_oversimplification",
    "coded_language",
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
    abstain: bool = Field(
        ...,
        description=(
            "True only when the input is too short, garbled, or otherwise lacks enough "
            "intelligible content for analysis. Do not abstain merely because text is "
            "satirical, opinionated, a copypasta, neutral, or contains no clear technique."
        ),
    )
    abstain_reason: Optional[str] = Field(
        None,
        description="If abstaining, explain why there is not enough analysable content; otherwise null.",
    )
