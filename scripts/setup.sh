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
    OS_VERSION="${VERSION_ID:-0}"
  else
    OS_ID="unknown"
    OS_VERSION="0"
  fi
  log "Detected OS: $OS_ID $OS_VERSION"
}

# ── Check if command exists ──
has() { command -v "$1" &>/dev/null; }

# ── Install system build dependencies (Tauri requires these) ──
install_system_deps() {
  log "Checking system build dependencies..."

  case "$OS_ID" in
    ubuntu|debian|pop|linuxmint)
      local missing=()
      for pkg in libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf; do
        if ! dpkg -s "$pkg" &>/dev/null; then
          missing+=("$pkg")
        fi
      done
      if [ ${#missing[@]} -gt 0 ]; then
        log "Installing system libs: ${missing[*]}"
        sudo apt-get update -qq
        sudo apt-get install -y "${missing[@]}"
      else
        log "All system libs already installed."
      fi
      ;;
    fedora|rhel|centos)
      local missing=()
      for pkg in webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel patchelf; do
        if ! rpm -q "$pkg" &>/dev/null; then
          missing+=("$pkg")
        fi
      done
      if [ ${#missing[@]} -gt 0 ]; then
        log "Installing system libs: ${missing[*]}"
        sudo dnf install -y "${missing[@]}"
      else
        log "All system libs already installed."
      fi
      ;;
    arch|manjaro)
      log "Installing system libs via pacman..."
      sudo pacman -S --needed --noconfirm webkit2gtk-4.1 gtk3 libappindicator-gtk3 librsvg patchelf
      ;;
    opensuse*)
      log "Installing system libs via zypper..."
      sudo zypper install -y webkit2gtk3-devel gtk3-devel libappindicator3-devel librsvg-devel patchelf
      ;;
    *)
      warn "Unknown distro '$OS_ID'. Ensure webkit2gtk 4.1, GTK3, and librsvg are installed."
      ;;
  esac
}

# ── Install Rust (if missing) ──
install_rust() {
  if has rustc; then
    log "Rust already installed: $(rustc --version)"
    return 0
  fi
  log "Installing Rust via rustup..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
  log "Rust installed: $(rustc --version)"
}

# ── Install Node.js (if missing) ──
install_node() {
  if has node && has npm; then
    log "Node.js already installed: $(node --version)"
    return 0
  fi
  log "Installing Node.js..."
  case "$OS_ID" in
    ubuntu|debian|pop|linuxmint)
      curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
      sudo apt-get install -y nodejs
      ;;
    fedora|rhel|centos)
      curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
      sudo dnf install -y nodejs
      ;;
    arch|manjaro)
      sudo pacman -S --needed --noconfirm nodejs npm
      ;;
    *)
      warn "Install Node.js 20+ manually: https://nodejs.org/"
      return 1
      ;;
  esac
  log "Node.js installed: $(node --version)"
}

# ── Install Tauri CLI ──
install_tauri_cli() {
  if has cargo-tauri; then
    log "Tauri CLI already installed."
    return 0
  fi
  log "Installing Tauri CLI..."
  cargo install tauri-cli
  log "Tauri CLI installed."
}

# ── Install Ollama (optional — local model hosting) ──
install_ollama() {
  if has ollama; then
    log "Ollama already installed: $(ollama --version 2>/dev/null || echo 'found')"
    return 0
  fi
  warn "Ollama not found. It's optional — only needed for local model hosting."
  read -p "Install Ollama? [y/N] " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Installing Ollama..."
    curl -fsSL https://ollama.com/install.sh | sh
    log "Ollama installed."
  else
    warn "Skipping Ollama. You can use cloud models only."
  fi
}

# ── Start Ollama service ──
start_ollama() {
  if ! has ollama; then return 0; fi
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

# ── Pull default brain model (needs text + vision + tools) ──
pull_default_model() {
  if ! has ollama; then return 0; fi
  local model="qwen3.5:latest"
  log "Checking for brain model (requires text + vision + tools capability)..."
  if ollama list 2>/dev/null | grep -qE "qwen3|gemma4|llama-4"; then
    log "Compatible brain model already installed."
    return 0
  fi
  log "Pulling $model (text + vision + tools, 430K context)..."
  log "This may take several minutes depending on your connection..."
  ollama pull "$model" || warn "Failed to pull model. Install later: ollama pull $model"
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
  mkdir -p "$MCP_HOME/checkpoints"
  mkdir -p "$MCP_HOME/memories"

  # Global memory stubs
  if [ ! -f "$MCP_HOME/memories/MEMORY.md" ]; then
    echo "# Shared Knowledge" > "$MCP_HOME/memories/MEMORY.md"
    echo "" >> "$MCP_HOME/memories/MEMORY.md"
    echo "_No shared memories yet._" >> "$MCP_HOME/memories/MEMORY.md"
  fi
  if [ ! -f "$MCP_HOME/memories/USER.md" ]; then
    echo "# User Preferences" > "$MCP_HOME/memories/USER.md"
    echo "" >> "$MCP_HOME/memories/USER.md"
    echo "_No preferences recorded._" >> "$MCP_HOME/memories/USER.md"
  fi

  # Initialize ChromaDB with all required collections
  python3 -c "
import chromadb
client = chromadb.PersistentClient(path='$MCP_CHROMADB')
for name in ['shared_knowledge', 'agent_knowledge', 'agent_scratchpad', 'agent_memory']:
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

# ── Summary ──
print_summary() {
  echo ""
  echo "================================================"
  log "Setup complete!"
  echo ""
  echo "  Workspace:    $MCP_HOME"
  echo "  ChromaDB:     $MCP_CHROMADB"
  echo "  Agents:       $MCP_HOME/agents/"
  echo "  Logs:         $MCP_HOME/logs/"
  echo "  Checkpoints:  $MCP_HOME/checkpoints/"
  echo "  Envelope:     $MCP_HOME/envelope-schema.json"
  echo ""
  echo "  Installed:"
  has rustc   && echo "    Rust:      $(rustc --version)" || echo "    Rust:      not found"
  has node    && echo "    Node.js:   $(node --version)"  || echo "    Node.js:   not found"
  has ollama  && echo "    Ollama:    $(ollama --version 2>/dev/null || echo 'installed')" || echo "    Ollama:    not installed (optional)"
  has hermes  && echo "    Hermes:    installed"          || echo "    Hermes:    not found"
  has docker  && echo "    Docker:    $(docker --version 2>/dev/null | head -1)" || echo "    Docker:    not installed (optional)"
  python3 -c "import chromadb" 2>/dev/null && echo "    ChromaDB:  installed" || echo "    ChromaDB:  not found"
  echo ""
  echo "  Build the app:  npm install && cargo tauri build --bundles deb"
  echo "  Run the app:    multiclawprotocol"
  echo ""
}

# ── Main ──
main() {
  echo ""
  echo -e "${RED}MULTI${NC}${CYAN}CLAW${NC}${RED}PROTOCOL${NC} — Setup"
  echo "================================================"
  echo ""

  detect_os

  # System build deps (required for Tauri)
  install_system_deps

  # Build toolchain
  install_rust
  install_node
  install_tauri_cli

  # Core dependencies
  install_chromadb
  install_hermes

  # Optional
  install_ollama
  start_ollama
  install_docker

  # Workspace + Universal I/O
  setup_workspace
  setup_universal_io

  # Pull brain model last (takes time, optional)
  pull_default_model

  print_summary
}

main "$@"
