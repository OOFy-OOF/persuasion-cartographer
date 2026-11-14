#!/bin/bash
umask 077

echo "Persuasion Cartographer Setup..."

# Check prerequisites before asking for configuration values.
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

echo "Enter the public domain name pointing to this server (for example, cartographer.example.com):"
read -r SITE_DOMAIN
if [[ ! "$SITE_DOMAIN" =~ ^[[:alnum:].-]+$ ]]; then
    echo "Please enter a valid domain name containing only letters, numbers, dots, and hyphens."
    exit 1
fi

# Prompt for API Key (hidden)
echo "Please enter your OpenAI-compatible API provider key:"
read -r -s API_KEY
echo ""
if [ -z "$API_KEY" ]; then
    echo "An API key is required."
    exit 1
fi

# Prompt for API base URL
echo "Enter the base URL for your OpenAI-compatible API (for example, https://api.example.com/v1):"
read -r AI_ROUTER_BASE_URL
if [ -z "$AI_ROUTER_BASE_URL" ]; then
    echo "An API base URL is required."
    exit 1
fi

# Prompt for Model
echo "Enter a model ID supported by your provider (Enter for gpt-5.6-luna):"
read -r MODEL
MODEL=${MODEL:-"gpt-5.6-luna"}

# Generate the .env file
echo "Generating .env file..."
cat <<EOF > .env
SITE_DOMAIN="$SITE_DOMAIN"
AI_ROUTER_API_KEY="$API_KEY"
AI_ROUTER_BASE_URL="$AI_ROUTER_BASE_URL"
AI_ROUTER_MODEL="$MODEL"
EOF
chmod 600 .env

# Start the containers
echo "Building and starting Docker containers..."
docker compose up -d --build

echo "Setup complete! Your app should be live at https://$SITE_DOMAIN."
echo "Check logs with: docker compose logs -f"
