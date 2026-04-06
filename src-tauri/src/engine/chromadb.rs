use serde::{Deserialize, Serialize};
use tauri::command;

const CHROMA_BASE: &str = "http://localhost:8000";

#[derive(Debug, Serialize, Deserialize)]
pub struct ChromaResult {
    pub id: String,
    pub document: String,
    pub distance: f64,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChromaQueryRequest { query_texts: Vec<String>, n_results: usize }

#[derive(Debug, Serialize, Deserialize)]
struct ChromaAddRequest { ids: Vec<String>, documents: Vec<String>, metadatas: Vec<serde_json::Value> }

#[derive(Debug, Serialize, Deserialize)]
struct ChromaQueryResponse {
    ids: Vec<Vec<String>>,
    documents: Option<Vec<Vec<String>>>,
    distances: Option<Vec<Vec<f64>>>,
    metadatas: Option<Vec<Vec<serde_json::Value>>>,
}

async fn ensure_collection(client: &reqwest::Client, collection: &str) -> Result<(), String> {
    let resp = client.post(format!("{CHROMA_BASE}/api/v1/collections"))
        .json(&serde_json::json!({"name": collection, "get_or_create": true}))
        .send().await.map_err(|e| format!("ChromaDB unreachable: {e}"))?;
    if !resp.status().is_success() { return Err(format!("ChromaDB error: {}", resp.status())); }
    Ok(())
}

async fn get_collection_id(client: &reqwest::Client, collection: &str) -> Result<String, String> {
    let resp = client.get(format!("{CHROMA_BASE}/api/v1/collections/{collection}"))
        .send().await.map_err(|e| format!("ChromaDB unreachable: {e}"))?;
    if !resp.status().is_success() { return Err(format!("Collection '{collection}' not found")); }
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    data["id"].as_str().map(|s| s.to_string()).ok_or_else(|| "No collection ID".to_string())
}

#[command]
pub async fn chroma_search(collection: String, query: String, k: Option<usize>) -> Result<Vec<ChromaResult>, String> {
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(10)).build().map_err(|e| e.to_string())?;
    ensure_collection(&client, &collection).await?;
    let col_id = get_collection_id(&client, &collection).await?;
    let req = ChromaQueryRequest { query_texts: vec![query], n_results: k.unwrap_or(5) };
    let resp = client.post(format!("{CHROMA_BASE}/api/v1/collections/{col_id}/query")).json(&req).send().await.map_err(|e| format!("Query failed: {e}"))?;
    let data: ChromaQueryResponse = resp.json().await.map_err(|e| format!("Parse failed: {e}"))?;
    let mut results = Vec::new();
    if let Some(ids) = data.ids.first() {
        for (i, id) in ids.iter().enumerate() {
            results.push(ChromaResult {
                id: id.clone(),
                document: data.documents.as_ref().and_then(|d| d.first()).and_then(|d| d.get(i)).cloned().unwrap_or_default(),
                distance: data.distances.as_ref().and_then(|d| d.first()).and_then(|d| d.get(i)).copied().unwrap_or(0.0),
                metadata: data.metadatas.as_ref().and_then(|d| d.first()).and_then(|d| d.get(i)).cloned().unwrap_or(serde_json::Value::Null),
            });
        }
    }
    Ok(results)
}

#[command]
pub async fn chroma_store(collection: String, document: String, metadata: Option<serde_json::Value>) -> Result<String, String> {
    let client = reqwest::Client::builder().timeout(std::time::Duration::from_secs(10)).build().map_err(|e| e.to_string())?;
    ensure_collection(&client, &collection).await?;
    let col_id = get_collection_id(&client, &collection).await?;
    let id = uuid::Uuid::new_v4().to_string();
    let req = ChromaAddRequest { ids: vec![id.clone()], documents: vec![document], metadatas: vec![metadata.unwrap_or(serde_json::json!({}))] };
    let resp = client.post(format!("{CHROMA_BASE}/api/v1/collections/{col_id}/add")).json(&req).send().await.map_err(|e| format!("Store failed: {e}"))?;
    if !resp.status().is_success() { return Err(format!("ChromaDB store error: {}", resp.text().await.unwrap_or_default())); }
    Ok(id)
}
