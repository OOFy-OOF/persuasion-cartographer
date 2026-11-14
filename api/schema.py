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
            "True when the input lacks enough content or context for meaningful analysis, "
            "or when no clear technique is supported by an exact quote. A very short "
            "standalone preference or observation without reasoning or rhetorical framing "
            "(for example, 'I don't like apples.') is insufficient. Do not abstain merely "
            "because developed text is satirical, opinionated, neutral, or a copypasta; "
            "examine it, then abstain if no technique is clearly supported."
        ),
    )
    abstain_reason: Optional[str] = Field(
        None,
        description="If abstaining, distinguish insufficient content/context from finding no clearly supported technique; otherwise null.",
    )
