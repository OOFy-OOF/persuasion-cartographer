# Persuasion Cartographer API

FastAPI service for analysing text, returning grounded rhetorical-technique spans, and recording user feedback about technique labels.

## Run locally

Use Python 3.12, matching the API container image. From this directory, create and activate a virtual environment, install the dependencies, and set the required configuration:

```sh
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export AI_ROUTER_API_KEY="your-api-key"
export AI_ROUTER_BASE_URL="https://your-openai-compatible-provider.example/v1"
export AI_ROUTER_MODEL="gpt-5.6-luna"
uvicorn main:app --reload --port 8000
```

On Windows PowerShell, activate the environment with `.venv\Scripts\Activate.ps1` and set variables with `$env:AI_ROUTER_API_KEY = "..."`, `$env:AI_ROUTER_BASE_URL = "..."`, and `$env:AI_ROUTER_MODEL = "gpt-5.6-luna"`.

The service loads environment variables from the environment and a discoverable `.env` file. The repository's root `.env.example` shows the deployment variable names. Do not commit API keys.

The configured provider must implement OpenAI-style Chat Completions and support JSON-object response mode, which the analysis request uses.

The project root's `docker-compose.yml` builds this directory using `Dockerfile`. When the sibling `web/` directory exists, the API also serves the static site at `/` for local use. FastAPI's interactive documentation is at `/docs`.

## Endpoints

### `POST /analyze`

Analyse submitted text. The request body is JSON:

```json
{"text": "Text to analyse"}
```

Text is limited to 20,000 characters. Empty or whitespace-only text returns HTTP 400. A client may make up to 12 analysis and feedback requests per minute; exceeding the limit returns HTTP 429 with a `Retry-After` header.

The response follows the `Analysis` schema in `schema.py`:

- `technique_spans` — technique labels, exact quotes from the input, and explanations.
- `framing_notes` — notes on audience, worldview, absence, context, and who benefits.
- `confidence` — model confidence (`low`, `medium`, or `high`).
- `abstain` and `abstain_reason` — whether the result abstained and why.

The service removes any span whose quote is not an exact substring of the submitted text. If no quote-grounded technique remains, the result is marked as an abstention. Abstention may indicate insufficient substance/context, no technique that can be grounded in an exact quote, or literal/descriptive text without persuasive framing. Satire, jokes, copypastas, and strong opinions are still examined; genre alone is not a reason to abstain.

### `GET /health`

Returns `{"ok": true}` when the service is responding.

### `GET /metrics`

Returns counts since the API process started: completed analyses, abstentions, quote-grounding drops, per-technique user feedback totals, and `scope: "since_api_start"`. These in-memory counters reset when the API process restarts; they are operational counts, not accuracy measurements.

### `POST /feedback`

Record a user-submitted flag for a technique. Request body:

```json
{"technique": "loaded_language"}
```

`technique` must match one of the technique names in `schema.py`. The response includes `ok`, the technique name, and its updated count. Feedback is user-submitted and is not independently verified.

## Configuration

| Variable | Purpose |
| --- | --- |
| `AI_ROUTER_API_KEY` | Secret key for the model API. Required. |
| `AI_ROUTER_BASE_URL` | Base URL for an OpenAI-compatible API. Required. |
| `AI_ROUTER_MODEL` | Model identifier used for analysis. The Compose deployment defaults to `gpt-5.6-luna`. |

The analysis prompt is in `prompt.py`; request and response models and the supported technique list are in `schema.py`; model calls, exact-quote filtering, and usage counters are in `analyzer.py`; HTTP routes, rate limiting, and feedback counters are in `main.py`.
