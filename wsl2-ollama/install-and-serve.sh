#!/bin/bash
set -e
echo "=== Installing Ollama in WSL2 ==="
if command -v apt-get &>/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq curl ca-certificates zstd 2>/dev/null || true
fi
echo "Downloading and installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh
echo "Pulling llama3.2 (this may take a few minutes)..."
ollama pull llama3.2
echo "Starting Ollama server on 0.0.0.0:11434..."
export OLLAMA_HOST=0.0.0.0
nohup ollama serve > /tmp/ollama-serve.log 2>&1 &
echo $! > /tmp/ollama-serve.pid
sleep 2
echo "Ollama server started. PID=$(cat /tmp/ollama-serve.pid). Log: /tmp/ollama-serve.log"
echo "From Windows test: Invoke-RestMethod -Uri http://localhost:11434/api/tags -Method Get"
