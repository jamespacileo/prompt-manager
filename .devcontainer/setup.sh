#!/bin/bash

# Update package lists
sudo apt-get update

# Install additional packages
sudo apt-get install -y curl

# Install global npm packages
npm install -g typescript ts-node

# Install ChatGPT CLI (adjust the installation method as needed)
npm install -g chatgpt-cli

# Verify Bun installation
bun --version

# Set up Python environment
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install pytest black mypy

# Add any other tool installations or configurations here

echo "Setup complete!"