import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from schema import Analysis
from prompt import SYSTEM

load_dotenv()

client = OpenAI(
    base_url=os.environ.get("AI_ROUTER_BASE_URL"),
    api_key=os.environ.get("AI_ROUTER_API_KEY")
)

# Global counter for dropped spans
DROPPED_SPANS = 0

def analyze(text: str) -> Analysis:
    global DROPPED_SPANS
    
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
    DROPPED_SPANS += (before - len(result.technique_spans))
    
    return result
