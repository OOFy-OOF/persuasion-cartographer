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
            "True only when the input lacks enough intelligible, substantive content or "
            "context for meaningful analysis (for example, a generic sentence with no "
            "claim or rhetorical content). A short but clear rhetorical move is analysable. "
            "Do not abstain merely because text is satirical, opinionated, a copypasta, "
            "neutral, or contains no clear technique."
        ),
    )
    abstain_reason: Optional[str] = Field(
        None,
        description="If abstaining, explain what substantive content or context is missing; otherwise null.",
    )
