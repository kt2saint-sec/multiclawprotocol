use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvelopeMeta {
    pub pipeline_id: String,
    pub run_id: String,
    pub node_id: String,
    #[serde(default)]
    pub parent_node_ids: Vec<String>,
    pub timestamp: String,
    pub agent_id: String,
    #[serde(default)]
    pub agent_version: Option<String>,
    pub model_used: String,
    pub cost_usd: f64,
    pub tokens: TokenCount,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenCount {
    pub input: u64,
    pub output: u64,
    #[serde(default)]
    pub cached: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvelopeHistoryEntry {
    pub node_id: String,
    pub agent_id: String,
    pub summary: String,
    pub payload_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvelopeConstraints {
    pub budget_usd: Option<f64>,
    pub deadline: Option<String>,
    #[serde(default)]
    pub forbidden_actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvelopeContext {
    pub task: String,
    pub user_intent: Option<String>,
    #[serde(default)]
    pub history: Vec<EnvelopeHistoryEntry>,
    pub constraints: Option<EnvelopeConstraints>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvelopePayload {
    #[serde(rename = "type")]
    pub payload_type: String,
    pub schema_version: String,
    pub content: serde_json::Value,
    pub confidence: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryRef {
    pub uri: String,
    pub role: String,
    pub relevance: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvelopeError {
    pub code: String,
    pub message: String,
    #[serde(default)]
    pub recoverable: bool,
    pub suggested_action: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UniversalEnvelope {
    pub version: String,
    pub meta: EnvelopeMeta,
    pub context: EnvelopeContext,
    pub payload: EnvelopePayload,
    #[serde(default)]
    pub memory_refs: Vec<MemoryRef>,
    pub status: String,
    #[serde(default)]
    pub errors: Vec<EnvelopeError>,
    pub hitl: Option<serde_json::Value>,
    pub trace: Option<Vec<serde_json::Value>>,
}

impl UniversalEnvelope {
    /// Write envelope as JSON to a file in the workspace
    pub fn write_to_file(&self, workspace: &Path, filename: &str) -> Result<(), String> {
        let envelopes_dir = workspace.join("envelopes");
        std::fs::create_dir_all(&envelopes_dir)
            .map_err(|e| format!("Failed to create envelopes dir: {e}"))?;

        let path = envelopes_dir.join(filename);
        let json = serde_json::to_string_pretty(self)
            .map_err(|e| format!("Failed to serialize envelope: {e}"))?;

        std::fs::write(&path, json)
            .map_err(|e| format!("Failed to write envelope to {}: {e}", path.display()))?;

        Ok(())
    }

    /// Read an envelope from a JSON file
    pub fn read_from_file(path: &Path) -> Result<Self, String> {
        let json = std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read envelope from {}: {e}", path.display()))?;

        serde_json::from_str(&json)
            .map_err(|e| format!("Failed to parse envelope from {}: {e}", path.display()))
    }

    /// Create an input envelope for a node
    pub fn create_input(
        pipeline_id: &str,
        run_id: &str,
        node_id: &str,
        agent_id: &str,
        task: &str,
        parent_outputs: Vec<EnvelopeHistoryEntry>,
        budget_remaining: f64,
    ) -> Self {
        Self {
            version: "1.0.0".to_string(),
            meta: EnvelopeMeta {
                pipeline_id: pipeline_id.to_string(),
                run_id: run_id.to_string(),
                node_id: node_id.to_string(),
                parent_node_ids: parent_outputs.iter().map(|h| h.node_id.clone()).collect(),
                timestamp: chrono::Utc::now().to_rfc3339(),
                agent_id: agent_id.to_string(),
                agent_version: None,
                model_used: String::new(),
                cost_usd: 0.0,
                tokens: TokenCount {
                    input: 0,
                    output: 0,
                    cached: None,
                },
                duration_ms: 0,
            },
            context: EnvelopeContext {
                task: task.to_string(),
                user_intent: None,
                history: parent_outputs,
                constraints: Some(EnvelopeConstraints {
                    budget_usd: Some(budget_remaining),
                    deadline: None,
                    forbidden_actions: vec![],
                }),
            },
            payload: EnvelopePayload {
                payload_type: "input".to_string(),
                schema_version: "1.0.0".to_string(),
                content: serde_json::Value::Null,
                confidence: None,
            },
            memory_refs: vec![],
            status: "pending".to_string(),
            errors: vec![],
            hitl: None,
            trace: None,
        }
    }
}
