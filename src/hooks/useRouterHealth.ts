import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

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
  available_models: string[];
}

const POLL_INTERVAL_MS = 15_000;

export function useRouterHealth() {
  const [health, setHealth] = useState<RouterHealth>({
    ollama_connected: false,
    litellm_connected: false,
    loaded_models: [],
    available_models: [],
  });
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    // Skip polling when not running inside Tauri
    if (!("__TAURI_INTERNALS__" in window)) return;
    try {
      const result = await invoke<RouterHealth>("ollama_health");
      setHealth(result);
      setError(null);
    } catch (e) {
      setError(String(e));
      setHealth((prev) => ({
        ...prev,
        ollama_connected: false,
        litellm_connected: false,
      }));
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [check]);

  return { health, error, refresh: check };
}
