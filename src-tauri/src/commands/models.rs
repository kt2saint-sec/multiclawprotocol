use serde::{Deserialize, Serialize};
use tauri::command;

const OLLAMA_BASE: &str = "http://localhost:11434";
const LITELLM_BASE: &str = "http://localhost:4000";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OllamaModel {
    pub name: String,
    pub size: u64,
    pub digest: String,
    pub modified_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OllamaRunningModel {
    pub name: String,
    pub size: u64,
    pub size_vram: u64,
    pub expires_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaListResponse {
    models: Vec<OllamaModel>,
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaRunningResponse {
    models: Vec<OllamaRunningModel>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RouterHealth {
    pub ollama_connected: bool,
    pub litellm_connected: bool,
    pub loaded_models: Vec<OllamaRunningModel>,
    pub available_models: Vec<String>,
}

#[command]
pub async fn ollama_health() -> Result<RouterHealth, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    // Check Ollama
    let ollama_connected = client
        .get(format!("{OLLAMA_BASE}/api/version"))
        .send()
        .await
        .is_ok();

    // Get loaded (running) models
    let loaded_models = match client
        .get(format!("{OLLAMA_BASE}/api/ps"))
        .send()
        .await
    {
        Ok(resp) => resp
            .json::<OllamaRunningResponse>()
            .await
            .map(|r| r.models)
            .unwrap_or_default(),
        Err(_) => vec![],
    };

    // Get available models
    let available_models = match client
        .get(format!("{OLLAMA_BASE}/api/tags"))
        .send()
        .await
    {
        Ok(resp) => resp
            .json::<OllamaListResponse>()
            .await
            .map(|r| r.models.into_iter().map(|m| m.name).collect())
            .unwrap_or_default(),
        Err(_) => vec![],
    };

    // Check LiteLLM
    let litellm_connected = client
        .get(format!("{LITELLM_BASE}/health"))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false);

    Ok(RouterHealth {
        ollama_connected,
        litellm_connected,
        loaded_models,
        available_models,
    })
}

#[command]
pub async fn list_models() -> Result<Vec<OllamaModel>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .get(format!("{OLLAMA_BASE}/api/tags"))
        .send()
        .await
        .map_err(|e| format!("Ollama unreachable: {e}"))?;

    let list: OllamaListResponse = resp
        .json()
        .await
        .map_err(|e| format!("Invalid response: {e}"))?;

    Ok(list.models)
}

#[derive(Debug, Serialize, Deserialize)]
struct OllamaGenerateRequest {
    model: String,
    prompt: String,
    keep_alive: String,
}

#[command]
pub async fn warmup_model(model_name: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;

    let req = OllamaGenerateRequest {
        model: model_name.clone(),
        prompt: String::new(),
        keep_alive: "15m".to_string(),
    };

    client
        .post(format!("{OLLAMA_BASE}/api/generate"))
        .json(&req)
        .send()
        .await
        .map_err(|e| format!("Failed to warm up {model_name}: {e}"))?;

    Ok(format!("Model {model_name} warmed up"))
}
