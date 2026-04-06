#!/usr/bin/env bash
# MultiClawProtocol — Auto-Setup Script
# Detects OS, installs missing dependencies, configures workspace.
# Safe to run multiple times (idempotent).

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[MCP]${NC} $1"; }
warn() { echo -e "${YELLOW}[MCP]${NC} $1"; }
err()  { echo -e "${RED}[MCP]${NC} $1"; }

MCP_HOME="$HOME/.multiclawprotocol"
MCP_WORKSPACE="$MCP_HOME/workspace"
MCP_CHROMADB="$MCP_HOME/chromadb"

# ── Detect OS ──
detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="$ID"
    OS_VERSION="$VERSION_ID"
  else
    OS_ID="unknown"
    OS_VERSION="0"
  fi
  log "Detected OS: $OS_ID $OS_VERSION"
}

# ── Check if command exists ──
has() { command -v "$1" &>/dev/null; }

# ── Install Ollama ──
install_ollama() {
  if has ollama; then
    log "Ollama already installed: $(ollama --version 2>/dev/null || echo 'found')"
    return 0
  fi
  log "Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
  log "Ollama installed."
}

# ── Start Ollama service ──
start_ollama() {
  if systemctl is-active ollama &>/dev/null; then
    log "Ollama service already running."
    return 0
  fi
  log "Starting Ollama service..."
  sudo systemctl enable ollama 2>/dev/null || true
  sudo systemctl start ollama 2>/dev/null || true
  sleep 2
  if systemctl is-active ollama &>/dev/null; then
    log "Ollama service started."
  else
    warn "Could not start Ollama via systemd. Run manually: ollama serve &"
  fi
}

# ── Pull default model ──
pull_default_model() {
  local model="huihui_ai/qwen3.5-abliterated:9b-q8_0"
  log "Checking for default model: $model"
  if ollama list 2>/dev/null | grep -q "qwen3"; then
    log "Qwen model already installed."
    return 0
  fi
  log "Pulling $model (this may take a few minutes)..."
  ollama pull "$model" || warn "Failed to pull model. You can pull it later: ollama pull $model"
}

# ── Install Python dependencies (ChromaDB + sentence-transformers) ──
install_chromadb() {
  if python3 -c "import chromadb" 2>/dev/null; then
    log "ChromaDB already installed."
  else
    log "Installing ChromaDB + sentence-transformers..."
    pip3 install --user chromadb sentence-transformers 2>/dev/null || \
    pip install --user chromadb sentence-transformers 2>/dev/null || \
    sudo pip3 install chromadb sentence-transformers 2>/dev/null || {
      err "Failed to install ChromaDB. Install manually: pip install chromadb sentence-transformers"
      return 1
    }
    log "ChromaDB installed."
  fi
}

# ── Install Hermes Agent ──
install_hermes() {
  if has hermes; then
    log "Hermes Agent already installed: $(hermes --version 2>/dev/null || echo 'found')"
    return 0
  fi
  log "Installing Hermes Agent..."
  pip3 install --user hermes-agent 2>/dev/null || \
  pip install --user hermes-agent 2>/dev/null || {
    warn "pip install failed. Trying from source..."
    if [ -d "$HOME/hermes" ]; then
      cd "$HOME/hermes" && pip3 install --user -e . 2>/dev/null || true
      log "Hermes installed from local source."
      return 0
    fi
    err "Failed to install Hermes. Install manually: pip install hermes-agent"
    return 1
  }
  log "Hermes Agent installed."
}

# ── Install Docker (optional) ──
install_docker() {
  if has docker; then
    log "Docker already installed: $(docker --version 2>/dev/null | head -1)"
    return 0
  fi
  warn "Docker not found. Install for sandboxed agent execution (optional)."
  read -p "Install Docker? [y/N] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker "$USER" 2>/dev/null || true
    log "Docker installed. You may need to log out and back in for group permissions."
  else
    warn "Skipping Docker. BUILDER agent will use subprocess mode instead."
  fi
}

# ── Create workspace directories ──
setup_workspace() {
  log "Setting up workspace at $MCP_HOME"
  mkdir -p "$MCP_WORKSPACE"
  mkdir -p "$MCP_CHROMADB"
  mkdir -p "$MCP_HOME/logs"
  mkdir -p "$MCP_HOME/pipelines"
  mkdir -p "$MCP_HOME/agents"

  # Initialize ChromaDB with default collections
  python3 -c "
import chromadb
client = chromadb.PersistentClient(path='$MCP_CHROMADB')
for name in ['shared_knowledge', 'agent_knowledge']:
    client.get_or_create_collection(name)
print(f'ChromaDB initialized: {len(client.list_collections())} collections at $MCP_CHROMADB')
" 2>/dev/null || warn "Could not initialize ChromaDB collections. Will be created on first agent run."

  log "Workspace ready: $MCP_HOME"
}

# ── Copy Universal I/O envelope schema ──
setup_universal_io() {
  log "Setting up Universal I/O envelope format..."
  cat > "$MCP_HOME/envelope-schema.json" << 'ENVELOPE'
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MultiClawProtocol Universal I/O Envelope v1.0.0",
  "type": "object",
  "required": ["version", "meta", "context", "payload", "status"],
  "properties": {
    "version": { "type": "string", "const": "1.0.0" },
    "meta": {
      "type": "object",
      "required": ["pipeline_id", "run_id", "node_id", "agent_id", "timestamp"],
      "properties": {
        "pipeline_id": { "type": "string" },
        "run_id": { "type": "string" },
        "node_id": { "type": "string" },
        "agent_id": { "type": "string" },
        "timestamp": { "type": "string", "format": "date-time" },
        "model_used": { "type": "string" },
        "cost_usd": { "type": "number" },
        "tokens": {
          "type": "object",
          "properties": {
            "input": { "type": "integer" },
            "output": { "type": "integer" }
          }
        },
        "duration_ms": { "type": "integer" }
      }
    },
    "context": {
      "type": "object",
      "required": ["task"],
      "properties": {
        "task": { "type": "string" },
        "user_intent": { "type": "string" },
        "history": { "type": "array" },
        "constraints": { "type": "object" }
      }
    },
    "payload": {
      "type": "object",
      "required": ["type", "content"],
      "properties": {
        "type": { "type": "string" },
        "schema_version": { "type": "string" },
        "content": {},
        "confidence": { "type": "number" }
      }
    },
    "memory_refs": { "type": "array" },
    "status": { "type": "string", "enum": ["pending", "running", "success", "partial", "failed", "blocked_hitl"] },
    "errors": { "type": "array" },
    "hitl": {},
    "trace": { "type": "array" }
  }
}
ENVELOPE
  log "Universal I/O envelope schema saved to $MCP_HOME/envelope-schema.json"
}

# ── Main ──
main() {
  echo ""
  echo -e "${RED}MULTI${NC}${CYAN}CLAW${NC}${RED}PROTOCOL${NC} — Setup"
  echo "================================================"
  echo ""

  detect_os

  # Core dependencies (required)
  install_ollama
  start_ollama
  install_chromadb
  install_hermes

  # Optional
  install_docker

  # Workspace + Universal I/O
  setup_workspace
  setup_universal_io

  # Pull default model (takes time, do last)
  pull_default_model

  echo ""
  echo "================================================"
  log "Setup complete!"
  echo ""
  echo "  Workspace:  $MCP_HOME"
  echo "  ChromaDB:   $MCP_CHROMADB"
  echo "  Envelope:   $MCP_HOME/envelope-schema.json"
  echo ""
  echo "  Run the app: multiclawprotocol"
  echo ""
}

main "$@"
