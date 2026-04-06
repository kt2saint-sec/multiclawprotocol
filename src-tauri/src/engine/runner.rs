use std::path::{Path, PathBuf};
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};

use super::envelope::UniversalEnvelope;

const DEFAULT_TIMEOUT_SECS: u64 = 600;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RunnerConfig {
    pub hermes_bin: String,
    pub workspace_base: PathBuf,
}

impl Default for RunnerConfig {
    fn default() -> Self {
        Self {
            hermes_bin: "hermes".to_string(),
            workspace_base: PathBuf::from("/mnt/nvme-fast/hermes-workspace/runs"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event")]
pub enum RunnerEvent {
    #[serde(rename = "node-started")]
    NodeStarted { run_id: String, node_id: String, agent_id: String },
    #[serde(rename = "node-output")]
    NodeOutput { run_id: String, node_id: String, line: String },
    #[serde(rename = "node-completed")]
    NodeCompleted {
        run_id: String,
        node_id: String,
        cost_usd: f64,
        tokens_input: u64,
        tokens_output: u64,
        duration_ms: u64,
    },
    #[serde(rename = "node-error")]
    NodeError { run_id: String, node_id: String, error: String },
    #[serde(rename = "cost-update")]
    CostUpdate { run_id: String, total_cost_usd: f64, budget_remaining: f64 },
}

#[derive(Debug)]
pub struct AgentRunner {
    config: RunnerConfig,
}

impl AgentRunner {
    pub fn new(config: RunnerConfig) -> Self {
        Self { config }
    }

    /// Get the workspace path for a specific run
    pub fn workspace_path(&self, run_id: &str) -> PathBuf {
        self.config.workspace_base.join(run_id)
    }

    /// Ensure workspace directories exist for a run
    pub fn setup_workspace(&self, run_id: &str) -> Result<PathBuf, String> {
        let workspace = self.workspace_path(run_id);
        let dirs = ["envelopes", "artifacts", "checkpoints"];
        for dir in &dirs {
            std::fs::create_dir_all(workspace.join(dir))
                .map_err(|e| format!("Failed to create workspace dir {dir}: {e}"))?;
        }
        Ok(workspace)
    }

    /// Spawn a Hermes agent subprocess and capture output.
    /// Uses `hermes -p <profile> chat -Q -q <prompt>` (quiet mode, single query).
    pub async fn run_agent(
        &self,
        app_handle: &AppHandle,
        run_id: &str,
        node_id: &str,
        agent_id: &str,
        input_envelope: &UniversalEnvelope,
        timeout_secs: Option<u64>,
    ) -> Result<UniversalEnvelope, String> {
        let workspace = self.workspace_path(run_id);
        let timeout = timeout_secs.unwrap_or(DEFAULT_TIMEOUT_SECS);

        // Write input envelope
        let input_filename = format!("{node_id}_input.json");
        input_envelope.write_to_file(&workspace, &input_filename)?;

        // Emit node-started event
        let _ = app_handle.emit("runner-event", RunnerEvent::NodeStarted {
            run_id: run_id.to_string(),
            node_id: node_id.to_string(),
            agent_id: agent_id.to_string(),
        });

        let start = std::time::Instant::now();

        // Build the prompt that includes the envelope context
        let prompt = self.build_prompt(input_envelope, &workspace, node_id)?;

        // Spawn hermes subprocess
        let mut child = Command::new(&self.config.hermes_bin)
            .args(["-p", agent_id, "chat", "-Q", "-q", &prompt])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true)
            .spawn()
            .map_err(|e| format!("Failed to spawn hermes for {agent_id}: {e}"))?;

        let stdout = child.stdout.take()
            .ok_or("Failed to capture stdout")?;
        let stderr = child.stderr.take()
            .ok_or("Failed to capture stderr")?;

        // Stream stdout lines to frontend
        let mut stdout_reader = BufReader::new(stdout).lines();
        let mut stderr_reader = BufReader::new(stderr).lines();
        let mut full_output = String::new();
        let mut full_stderr = String::new();

        let app_clone = app_handle.clone();
        let run_id_owned = run_id.to_string();
        let node_id_owned = node_id.to_string();

        // Read stdout and stderr concurrently with timeout
        let result = tokio::time::timeout(
            std::time::Duration::from_secs(timeout),
            async {
                loop {
                    tokio::select! {
                        line = stdout_reader.next_line() => {
                            match line {
                                Ok(Some(line)) => {
                                    let _ = app_clone.emit("runner-event", RunnerEvent::NodeOutput {
                                        run_id: run_id_owned.clone(),
                                        node_id: node_id_owned.clone(),
                                        line: line.clone(),
                                    });
                                    full_output.push_str(&line);
                                    full_output.push('\n');
                                }
                                Ok(None) => break,
                                Err(e) => {
                                    full_stderr.push_str(&format!("stdout read error: {e}\n"));
                                    break;
                                }
                            }
                        }
                        line = stderr_reader.next_line() => {
                            match line {
                                Ok(Some(line)) => {
                                    full_stderr.push_str(&line);
                                    full_stderr.push('\n');
                                }
                                Ok(None) => {}
                                Err(_) => {}
                            }
                        }
                    }
                }
            },
        )
        .await;

        let duration_ms = start.elapsed().as_millis() as u64;

        // Handle timeout
        if result.is_err() {
            let _ = child.kill().await;
            let _ = app_handle.emit("runner-event", RunnerEvent::NodeError {
                run_id: run_id.to_string(),
                node_id: node_id.to_string(),
                error: format!("Agent {agent_id} timed out after {timeout}s"),
            });
            return Err(format!("Agent {agent_id} timed out after {timeout}s"));
        }

        // Check exit status
        let status = child
            .wait()
            .await
            .map_err(|e| format!("Failed to wait on process: {e}"))?;

        if !status.success() {
            let error_msg = if full_stderr.is_empty() {
                format!("Agent {agent_id} exited with status {status}")
            } else {
                format!("Agent {agent_id} failed: {}", full_stderr.trim())
            };

            let _ = app_handle.emit("runner-event", RunnerEvent::NodeError {
                run_id: run_id.to_string(),
                node_id: node_id.to_string(),
                error: error_msg.clone(),
            });
            return Err(error_msg);
        }

        // Try to parse output as envelope JSON, or wrap raw output
        let output_envelope = self.parse_output(
            &full_output,
            input_envelope,
            run_id,
            node_id,
            agent_id,
            duration_ms,
        );

        // Write output envelope
        let output_filename = format!("{node_id}_output.json");
        output_envelope.write_to_file(&workspace, &output_filename)?;

        // Emit completion event
        let _ = app_handle.emit("runner-event", RunnerEvent::NodeCompleted {
            run_id: run_id.to_string(),
            node_id: node_id.to_string(),
            cost_usd: output_envelope.meta.cost_usd,
            tokens_input: output_envelope.meta.tokens.input,
            tokens_output: output_envelope.meta.tokens.output,
            duration_ms,
        });

        Ok(output_envelope)
    }

    fn build_prompt(
        &self,
        envelope: &UniversalEnvelope,
        workspace: &Path,
        node_id: &str,
    ) -> Result<String, String> {
        let input_path = workspace.join("envelopes").join(format!("{node_id}_input.json"));
        let context = if !envelope.context.history.is_empty() {
            let summaries: Vec<String> = envelope
                .context
                .history
                .iter()
                .map(|h| format!("- {} ({}): {}", h.agent_id, h.payload_type, h.summary))
                .collect();
            format!("\n\nPrevious agent outputs:\n{}", summaries.join("\n"))
        } else {
            String::new()
        };

        Ok(format!(
            "{}{}\n\nFull input envelope at: {}\nWrite your output as JSON to: {}/envelopes/{node_id}_output.json",
            envelope.context.task,
            context,
            input_path.display(),
            workspace.display(),
        ))
    }

    /// Parse agent output — try JSON envelope first, fall back to wrapping raw text
    fn parse_output(
        &self,
        raw_output: &str,
        input: &UniversalEnvelope,
        run_id: &str,
        node_id: &str,
        agent_id: &str,
        duration_ms: u64,
    ) -> UniversalEnvelope {
        // Try to find JSON in the output (agent might output other text before/after)
        if let Some(json_start) = raw_output.find('{') {
            if let Some(json_end) = raw_output.rfind('}') {
                let json_slice = &raw_output[json_start..=json_end];
                if let Ok(envelope) = serde_json::from_str::<UniversalEnvelope>(json_slice) {
                    return envelope;
                }
            }
        }

        // Also check if the agent wrote an output file directly
        let output_path = self
            .workspace_path(run_id)
            .join("envelopes")
            .join(format!("{node_id}_output.json"));
        if output_path.exists() {
            if let Ok(envelope) = UniversalEnvelope::read_from_file(&output_path) {
                return envelope;
            }
        }

        // Wrap raw output as an envelope
        UniversalEnvelope {
            version: "1.0.0".to_string(),
            meta: super::envelope::EnvelopeMeta {
                pipeline_id: input.meta.pipeline_id.clone(),
                run_id: run_id.to_string(),
                node_id: node_id.to_string(),
                parent_node_ids: vec![],
                timestamp: chrono::Utc::now().to_rfc3339(),
                agent_id: agent_id.to_string(),
                agent_version: None,
                model_used: "unknown".to_string(),
                cost_usd: 0.0,
                tokens: super::envelope::TokenCount {
                    input: 0,
                    output: 0,
                    cached: None,
                },
                duration_ms,
            },
            context: input.context.clone(),
            payload: super::envelope::EnvelopePayload {
                payload_type: "raw_output".to_string(),
                schema_version: "1.0.0".to_string(),
                content: serde_json::Value::String(raw_output.to_string()),
                confidence: None,
            },
            memory_refs: vec![],
            status: "success".to_string(),
            errors: vec![],
            hitl: None,
            trace: None,
        }
    }
}
