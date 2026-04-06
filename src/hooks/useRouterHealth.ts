import { useEffect, useState, useCallback } from "react";

interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
}

interface RunningModel {
  name: string;
  size: number;
  size_vram: number;
  expires_at: string;
}

interface RouterHealth {
  ollama_connected: boolean;
  litellm_connected: boolean;
  loaded_models: RunningModel[];
  available_models: OllamaModel[];
}

const POLL_INTERVAL_MS = 10_000;
const OLLAMA_BASE = "http://localhost:11434";
const LITELLM_BASE = "http://localhost:4000";

async function checkOllama(): Promise<{
  connected: boolean;
  loaded: RunningModel[];
  available: OllamaModel[];
}> {
  try {
    // Check if Ollama is running
    const versionResp = await fetch(`${OLLAMA_BASE}/api/version`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!versionResp.ok) return { connected: false, loaded: [], available: [] };

    // Get loaded (running) models
    let loaded: RunningModel[] = [];
    try {
      const psResp = await fetch(`${OLLAMA_BASE}/api/ps`, {
        signal: AbortSignal.timeout(3000),
      });
      if (psResp.ok) {
        const psData = await psResp.json();
        loaded = (psData.models || []).map((m: Record<string, unknown>) => ({
          name: String(m.name || ""),
          size: Number(m.size || 0),
          size_vram: Number(m.size_vram || 0),
          expires_at: String(m.expires_at || ""),
        }));
      }
    } catch {
      // ps endpoint optional
    }

    // Get available (installed) models
    let available: OllamaModel[] = [];
    try {
      const tagsResp = await fetch(`${OLLAMA_BASE}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (tagsResp.ok) {
        const tagsData = await tagsResp.json();
        available = (tagsData.models || []).map(
          (m: Record<string, unknown>) => ({
            name: String(m.name || ""),
            size: Number(m.size || 0),
            digest: String(m.digest || ""),
            modified_at: String(m.modified_at || ""),
          }),
        );
      }
    } catch {
      // tags endpoint optional
    }

    return { connected: true, loaded, available };
  } catch {
    return { connected: false, loaded: [], available: [] };
  }
}

async function checkLiteLLM(): Promise<boolean> {
  try {
    const resp = await fetch(`${LITELLM_BASE}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export function useRouterHealth() {
  const [health, setHealth] = useState<RouterHealth>({
    ollama_connected: false,
    litellm_connected: false,
    loaded_models: [],
    available_models: [],
  });
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    try {
      const [ollama, litellm] = await Promise.all([
        checkOllama(),
        checkLiteLLM(),
      ]);
      setHealth({
        ollama_connected: ollama.connected,
        litellm_connected: litellm,
        loaded_models: ollama.loaded,
        available_models: ollama.available,
      });
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await check();
    })();
    const interval = setInterval(() => {
      void check();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [check]);

  return { health, error, refresh: check };
}
