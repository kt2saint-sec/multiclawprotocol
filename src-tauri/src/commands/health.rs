use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ServiceHealth { pub name: String, pub status: String, pub latency_ms: Option<u64> }

async fn check_http(name: &str, url: &str, timeout_ms: u64) -> ServiceHealth {
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_millis(timeout_ms)).build().unwrap();
    let start = std::time::Instant::now();
    match client.get(url).send().await {
        Ok(resp) if resp.status().is_success() => ServiceHealth { name: name.to_string(), status: "healthy".to_string(), latency_ms: Some(start.elapsed().as_millis() as u64) },
        Ok(resp) => ServiceHealth { name: name.to_string(), status: format!("unhealthy ({})", resp.status()), latency_ms: Some(start.elapsed().as_millis() as u64) },
        Err(_) => ServiceHealth { name: name.to_string(), status: "offline".to_string(), latency_ms: None },
    }
}

#[command]
pub async fn check_all_health() -> Result<Vec<ServiceHealth>, String> {
    let checks = tokio::join!(
        check_http("Ollama", "http://localhost:11434/api/version", 3000),
        check_http("LiteLLM", "http://localhost:4000/health", 3000),
        check_http("ChromaDB", "http://localhost:8000/api/v1/heartbeat", 3000),
    );
    Ok(vec![checks.0, checks.1, checks.2])
}

#[command]
pub async fn check_agent_health(agent_id: String, url: String) -> Result<ServiceHealth, String> {
    Ok(check_http(&agent_id, &url, 5000).await)
}
