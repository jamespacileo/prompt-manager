#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Update package lists and upgrade existing packages
sudo apt-get update -y && sudo apt-get upgrade -y

# Install additional packages
sudo apt-get install -y curl build-essential


# Install additional packages
sudo apt-get install -y curl

npm install -g npm@latest
npm install -g bun pnpm

# Install global npm packages
bun install -g typescript ts-node tsx

# Install ChatGPT CLI (adjust the installation method as needed)
bun install -g chatgpt-cli

# Verify Bun installation
bun --version

# Set up Python environment
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install pytest black mypy aider-chat

# Add any other tool installations or configurations here

echo "Setup complete!"