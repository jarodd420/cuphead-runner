#!/bin/bash
# Install and run Ollama inside WSL2 so Windows (OpenClaw) can use it.
# Run this script inside WSL2: bash install-ollama-wsl2.sh

set -e

echo "=== Installing Ollama in WSL2 ==="

# Install dependencies if needed (Debian/Ubuntu)
if command -v apt-get &>/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq curl ca-certificates 2>/dev/null || true
fi

# Install Ollama
echo "Downloading and installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

# Pull the model (so it's ready for OpenClaw)
echo "Pulling llama3.2 (this may take a few minutes)..."
ollama pull llama3.2

echo ""
echo "=== Ollama installed. Starting server ==="
echo "To allow Windows to connect, Ollama will listen on 0.0.0.0:11434"
echo ""

# Run Ollama so it listens on all interfaces (Windows can then reach it via localhost in recent WSL2)
export OLLAMA_HOST=0.0.0.0
exec ollama serve
