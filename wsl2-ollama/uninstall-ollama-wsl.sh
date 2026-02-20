#!/bin/bash
# Uninstall Ollama from WSL (Ubuntu)
set -e
echo "Stopping Ollama..."
sudo systemctl stop ollama 2>/dev/null || true
pkill -x ollama 2>/dev/null || true
sleep 2
echo "Removing systemd service..."
sudo systemctl disable ollama 2>/dev/null || true
sudo rm -f /etc/systemd/system/ollama.service 2>/dev/null || true
sudo systemctl daemon-reload 2>/dev/null || true
echo "Removing Ollama binary and libraries..."
sudo rm -rf /usr/local/lib/ollama
sudo rm -f /usr/local/bin/ollama
echo "Removing Ollama user and data..."
sudo userdel ollama 2>/dev/null || true
sudo groupdel ollama 2>/dev/null || true
sudo rm -rf /usr/share/ollama 2>/dev/null || true
rm -rf /root/.ollama 2>/dev/null || true
rm -rf "$HOME/.ollama" 2>/dev/null || true
echo "Ollama uninstalled from WSL."
