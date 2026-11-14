#!/bin/bash

echo "Persuasion Cartographer Setup..."

# 1. Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# 2. Prompt for API Key (hidden)
echo "Please enter your Hostinger AI Router API Key:"
read -s API_KEY
echo ""

# 3. Prompt for Model
echo "Enter the AI Model to use (Enter for default):"
read MODEL
MODEL=${MODEL:-"gpt-6.1-sol"}

# 4. Generate the .env file
echo "Generating .env file..."
cat <<EOF > .env
AI_ROUTER_API_KEY="$API_KEY"
AI_ROUTER_BASE_URL="https://router.hostinger.com/v1"
AI_ROUTER_MODEL="$MODEL"
EOF

# 5. Start the containers
echo "Building and starting Docker containers..."
docker compose up -d --build

echo "Setup complete! Your app should be live on your configured domain."
echo "Check logs with: docker compose logs -f"