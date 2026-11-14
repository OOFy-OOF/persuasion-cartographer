# Persuasion Cartographer

Persuasion Cartographer maps rhetorical techniques in text. It highlights exact quoted spans and explains how they may persuade; it does not determine factual accuracy, authorial intent, or morality. The project includes a web interface, a FastAPI backend, and a Chromium browser extension.

The tool prioritises recall over precision: it analyses jokes, satire, and strong opinions when a technique can be grounded in an exact quote, leaving readers to supply context. It abstains when there is too little substance to examine, no technique can be grounded in an exact quote, or the text is purely literal or administrative with no persuasive framing.

## Project layout

- `web/` — static website and downloadable extension package.
- `api/` — FastAPI service, analysis prompt, response schema, and Dockerfile. See [API documentation](./api/README.md).
- `extension/` — Manifest V3 extension for Chromium-based browsers. See its [README](./extension/README.md).
- `docker-compose.yml` and `Caddyfile` — production-style deployment with HTTPS and reverse proxying.
- `setup.sh` — interactive Bash setup for Docker deployments using Hostinger AI Router.
- `eval/` — evaluation materials.

## Deploy with Docker Compose

You need Docker Engine with the Compose plugin, a domain whose DNS points to your server, and an API key for an OpenAI-compatible model router.

For the interactive setup, run `./setup.sh` in Bash (for example, on Linux, macOS, or WSL). It asks for the domain, Hostinger AI Router API key, and model, writes a local `.env` file, then builds and starts the services. The script uses `https://router.hostinger.com/v1` as its router endpoint and defaults to `gpt-5.6-luna`.

To configure the deployment manually, copy `.env.example` to `.env`, set `SITE_DOMAIN`, `AI_ROUTER_API_KEY`, `AI_ROUTER_BASE_URL`, and `AI_ROUTER_MODEL`, then run:

```sh
docker compose up -d --build
```

The deployment serves the website and extension download through Caddy on ports 80 and 443. Caddy obtains and renews HTTPS certificates for `SITE_DOMAIN`. View service logs with `docker compose logs -f`; stop the services with `docker compose down`.

Keep `.env` private. It contains the API key and is excluded from version control.

## Run the API locally

The API uses Python 3.12 (as specified by its Dockerfile). Create and activate a virtual environment, install `api/requirements.txt`, and provide `AI_ROUTER_API_KEY`, `AI_ROUTER_BASE_URL`, and `AI_ROUTER_MODEL`. From the `api/` directory, start the development server with:

```sh
uvicorn main:app --reload --port 8000
```

When the sibling `web/` directory is present, the API process also serves the website at `http://localhost:8000`. Interactive API documentation is available at `http://localhost:8000/docs`.

For endpoint behaviour, limits, and response fields, see [api/README.md](./api/README.md).

## Browser extension

Download the packaged extension from the website's **Download** tab, extract it, and load the `extension/` folder as an unpacked extension in a Chromium-based browser. Configure its API endpoint in the popup settings. Full installation instructions are in [extension/README.md](./extension/README.md).

## Operational notes

Usage, abstention, quote-drop, and technique-feedback counts are held in API process memory. They reset when the API process restarts and are not accuracy or quality scores. The API rate-limits analysis and feedback requests per client.
