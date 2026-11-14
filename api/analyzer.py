import os
import json
from threading import Lock
from openai import OpenAI
from dotenv import load_dotenv
from schema import Analysis
from prompt import SYSTEM

load_dotenv()

client = OpenAI(
    base_url=os.environ.get("AI_ROUTER_BASE_URL"),
    api_key=os.environ.get("AI_ROUTER_API_KEY"),
    timeout=45.0,
    max_retries=1,
)

# In-memory counters for the lifetime of this API process.
_METRICS_LOCK = Lock()
_METRICS = {
    "analyses": 0,
    "abstentions": 0,
    "quote_grounding_drops": 0,
}


def metrics_snapshot() -> dict[str, int]:
    with _METRICS_LOCK:
        return _METRICS.copy()

def analyze(text: str) -> Analysis:
    schema_str = json.dumps(Analysis.model_json_schema())
    full_system_prompt = f"{SYSTEM}\n\nYou must return a JSON object matching this exact JSON schema:\n{schema_str}"

    response = client.chat.completions.create(
        model=os.environ.get("AI_ROUTER_MODEL"),
        messages=[
            {"role": "system", "content": full_system_prompt},
            {"role": "user", "content": text}
        ],
        response_format={"type": "json_object"},
        temperature=0.1
    )
    
    data = json.loads(response.choices[0].message.content)
    result = Analysis(**data)
    
    before = len(result.technique_spans)
    result.technique_spans = [span for span in result.technique_spans if span.quote in text]
    with _METRICS_LOCK:
        _METRICS["analyses"] += 1
        _METRICS["abstentions"] += int(result.abstain)
        _METRICS["quote_grounding_drops"] += before - len(result.technique_spans)
    
    return result
