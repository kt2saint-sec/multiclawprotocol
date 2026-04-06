use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{AppHandle, Emitter};
use serde::{Deserialize, Serialize};

use super::cost_ledger::{AlertLevel, CostLedger};
use super::envelope::{EnvelopeHistoryEntry, UniversalEnvelope};
use super::runner::{AgentRunner, RunnerConfig, RunnerEvent};
use super::state_machine::{NodeStatus, NodeState, PipelineRun, PipelineStatus};

/// Checkpoint stored in SQLite after each node completion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Checkpoint {
    pub run_id: String,
    pub pipeline_json: String,
    pub ledger_json: String,
    pub timestamp: String,
}

/// The orchestrator drives a pipeline run to completion
pub struct Orchestrator {
    app_handle: AppHandle,
    runner: AgentRunner,
    db_path: PathBuf,
}

impl Orchestrator {
    pub fn new(app_handle: AppHandle, runner_config: RunnerConfig) -> Self {
        let db_path = runner_config
            .workspace_base
            .join("mcp_checkpoints.db");
        Self {
            app_handle,
            runner: AgentRunner::new(runner_config),
            db_path,
        }
    }

    /// Initialize SQLite checkpoint database
    fn init_db(&self) -> Result<rusqlite::Connection, String> {
        let conn = rusqlite::Connection::open(&self.db_path)
            .map_err(|e| format!("Failed to open checkpoint DB: {e}"))?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS checkpoints (
                run_id TEXT NOT NULL,
                node_id TEXT NOT NULL,
                pipeline_json TEXT NOT NULL,
                ledger_json TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                PRIMARY KEY (run_id, node_id)
            );
            CREATE TABLE IF NOT EXISTS runs (
                run_id TEXT PRIMARY KEY,
                pipeline_id TEXT NOT NULL,
                status TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT,
                total_cost_usd REAL DEFAULT 0.0
            );",
        )
        .map_err(|e| format!("Failed to init checkpoint DB: {e}"))?;

        Ok(conn)
    }

    /// Save checkpoint to SQLite
    fn save_checkpoint(
        &self,
        conn: &rusqlite::Connection,
        run: &PipelineRun,
        ledger: &CostLedger,
        completed_node_id: &str,
    ) -> Result<(), String> {
        let pipeline_json =
            serde_json::to_string(run).map_err(|e| format!("Serialize pipeline: {e}"))?;
        let ledger_json = ledger.to_json().map_err(|e| format!("Serialize ledger: {e}"))?;
        let timestamp = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT OR REPLACE INTO checkpoints (run_id, node_id, pipeline_json, ledger_json, timestamp)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            rusqlite::params![run.run_id, completed_node_id, pipeline_json, ledger_json, timestamp],
        )
        .map_err(|e| format!("Failed to save checkpoint: {e}"))?;

        conn.execute(
            "INSERT OR REPLACE INTO runs (run_id, pipeline_id, status, started_at, completed_at, total_cost_usd)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![
                run.run_id,
                run.pipeline_id,
                format!("{:?}", run.status),
                run.started_at.map(|t| t.to_rfc3339()),
                run.completed_at.map(|t| t.to_rfc3339()),
                run.total_cost_usd,
            ],
        )
        .map_err(|e| format!("Failed to update run status: {e}"))?;

        Ok(())
    }

    /// Load the most recent checkpoint for a run
    pub fn load_checkpoint(
        &self,
        run_id: &str,
    ) -> Result<Option<(PipelineRun, CostLedger)>, String> {
        let conn = self.init_db()?;

        let result: Result<(String, String), _> = conn.query_row(
            "SELECT pipeline_json, ledger_json FROM checkpoints
             WHERE run_id = ?1 ORDER BY timestamp DESC LIMIT 1",
            rusqlite::params![run_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        );

        match result {
            Ok((pipeline_json, ledger_json)) => {
                let run: PipelineRun = serde_json::from_str(&pipeline_json)
                    .map_err(|e| format!("Deserialize pipeline: {e}"))?;
                let ledger: CostLedger = serde_json::from_str(&ledger_json)
                    .map_err(|e| format!("Deserialize ledger: {e}"))?;
                Ok(Some((run, ledger)))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(format!("Failed to load checkpoint: {e}")),
        }
    }

    /// Execute a full pipeline run with DAG scheduling
    pub async fn execute(
        &self,
        run: Arc<Mutex<PipelineRun>>,
        ledger: Arc<Mutex<CostLedger>>,
        max_parallel: usize,
        on_budget_exceeded: &str,
    ) -> Result<(), String> {
        let conn = self.init_db()?;

        // Setup workspace
        let run_id = {
            let r = run.lock().await;
            self.runner.setup_workspace(&r.run_id)?;
            r.run_id.clone()
        };

        // Transition: Pending -> Validating -> Ready -> Running
        {
            let mut r = run.lock().await;
            r.transition(PipelineStatus::Validating)
                .map_err(|e| e.to_string())?;
            // Validation: check all agent_ids exist, edges are valid
            r.transition(PipelineStatus::Ready)
                .map_err(|e| e.to_string())?;
            r.transition(PipelineStatus::Running)
                .map_err(|e| e.to_string())?;
        }

        // Collected output envelopes keyed by node_id
        let outputs: Arc<Mutex<std::collections::HashMap<String, UniversalEnvelope>>> =
            Arc::new(Mutex::new(std::collections::HashMap::new()));

        // DAG execution loop
        loop {
            let ready_nodes = {
                let r = run.lock().await;
                if r.status == PipelineStatus::Paused {
                    // Wait for resume signal
                    tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                    continue;
                }
                if r.all_nodes_done() {
                    break;
                }
                r.ready_nodes()
            };

            if ready_nodes.is_empty() {
                // Check if we're stuck (no ready nodes but not all done)
                let r = run.lock().await;
                if !r.all_nodes_done() {
                    // Nodes may be running — wait and retry
                    drop(r);
                    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
                    continue;
                }
                break;
            }

            // Launch ready nodes up to max_parallel
            let batch: Vec<String> = ready_nodes.into_iter().take(max_parallel).collect();
            let mut handles = Vec::new();

            for node_id in batch {
                // Transition node: Init -> Validate -> Execute
                let (agent_id, depends, timeout) = {
                    let mut r = run.lock().await;
                    let node = r.get_node_mut(&node_id).map_err(|e| e.to_string())?;
                    node.transition(NodeStatus::Validate)
                        .map_err(|e| e.to_string())?;
                    node.transition(NodeStatus::Execute)
                        .map_err(|e| e.to_string())?;
                    (
                        node.agent_id.clone(),
                        node.depends_on.clone(),
                        None::<u64>,
                    )
                };

                // Build history from parent outputs
                let history = {
                    let outs = outputs.lock().await;
                    depends
                        .iter()
                        .filter_map(|dep_id| {
                            outs.get(dep_id).map(|env| EnvelopeHistoryEntry {
                                node_id: dep_id.clone(),
                                agent_id: env.meta.agent_id.clone(),
                                summary: format!(
                                    "{}: {}",
                                    env.payload.payload_type,
                                    truncate_content(&env.payload.content, 200)
                                ),
                                payload_type: env.payload.payload_type.clone(),
                            })
                        })
                        .collect::<Vec<_>>()
                };

                // Reserve budget
                {
                    let mut l = ledger.lock().await;
                    // For local models, estimated cost is $0
                    let estimated_cost = 0.05; // Conservative estimate for cloud
                    match l.reserve(&node_id, estimated_cost) {
                        Ok(()) => {}
                        Err(e) => {
                            match on_budget_exceeded {
                                "pause_and_notify" => {
                                    let mut r = run.lock().await;
                                    r.transition(PipelineStatus::Paused)
                                        .map_err(|e| e.to_string())?;
                                    let _ = self.app_handle.emit(
                                        "runner-event",
                                        RunnerEvent::NodeError {
                                            run_id: run_id.clone(),
                                            node_id: node_id.clone(),
                                            error: format!("Budget exceeded: {e}"),
                                        },
                                    );
                                    continue;
                                }
                                "terminate" => return Err(e.to_string()),
                                _ => {} // fallback: try anyway
                            }
                        }
                    }
                }

                let budget_remaining = {
                    let l = ledger.lock().await;
                    l.remaining_budget()
                };

                let pipeline_id = {
                    let r = run.lock().await;
                    r.pipeline_id.clone()
                };

                // Create input envelope
                let input_envelope = UniversalEnvelope::create_input(
                    &pipeline_id,
                    &run_id,
                    &node_id,
                    &agent_id,
                    &format!("Execute task for node {node_id}"),
                    history,
                    budget_remaining,
                );

                // Spawn the agent task
                let run_clone = Arc::clone(&run);
                let ledger_clone = Arc::clone(&ledger);
                let outputs_clone = Arc::clone(&outputs);
                let app_clone = self.app_handle.clone();
                let runner_config = RunnerConfig::default();
                let run_id_clone = run_id.clone();
                let on_budget_str = on_budget_exceeded.to_string();

                let handle = tokio::spawn(async move {
                    let runner = AgentRunner::new(runner_config);
                    let result = runner
                        .run_agent(
                            &app_clone,
                            &run_id_clone,
                            &node_id,
                            &agent_id,
                            &input_envelope,
                            timeout,
                        )
                        .await;

                    match result {
                        Ok(output_envelope) => {
                            // Transition node: Execute -> Collect -> Pass -> Complete
                            let mut r = run_clone.lock().await;
                            if let Ok(node) = r.get_node_mut(&node_id) {
                                let _ = node.transition(NodeStatus::Collect);
                                node.cost_usd = output_envelope.meta.cost_usd;
                                node.tokens_input = output_envelope.meta.tokens.input;
                                node.tokens_output = output_envelope.meta.tokens.output;
                                let _ = node.transition(NodeStatus::Pass);
                                let _ = node.transition(NodeStatus::Complete);
                            }
                            r.total_cost_usd += output_envelope.meta.cost_usd;

                            // Commit cost to ledger
                            let mut l = ledger_clone.lock().await;
                            let alert = l.commit(
                                &node_id,
                                &agent_id,
                                &output_envelope.meta.model_used,
                                output_envelope.meta.tokens.input,
                                output_envelope.meta.tokens.output,
                                output_envelope.meta.cost_usd,
                            );

                            if let Ok(alert) = alert {
                                if matches!(alert, AlertLevel::Critical95 | AlertLevel::Exceeded) {
                                    let _ = app_clone.emit(
                                        "runner-event",
                                        RunnerEvent::CostUpdate {
                                            run_id: run_id_clone.clone(),
                                            total_cost_usd: l.committed_total(),
                                            budget_remaining: l.remaining_budget(),
                                        },
                                    );
                                }
                            }

                            // Store output
                            outputs_clone
                                .lock()
                                .await
                                .insert(node_id.clone(), output_envelope);
                        }
                        Err(error) => {
                            let mut r = run_clone.lock().await;
                            if let Ok(node) = r.get_node_mut(&node_id) {
                                node.error_message = Some(error.clone());
                                let _ = node.transition(NodeStatus::Error);
                            }

                            // Release budget reservation
                            let mut l = ledger_clone.lock().await;
                            l.release_reservation(&node_id);
                        }
                    }
                });

                handles.push(handle);
            }

            // Wait for this batch to complete
            for handle in handles {
                let _ = handle.await;
            }

            // Save checkpoint after batch
            {
                let r = run.lock().await;
                let l = ledger.lock().await;
                let last_node = r
                    .nodes
                    .iter()
                    .filter(|n| n.is_complete())
                    .last()
                    .map(|n| n.node_id.clone())
                    .unwrap_or_default();
                if !last_node.is_empty() {
                    let _ = self.save_checkpoint(&conn, &r, &l, &last_node);
                }
            }
        }

        // Final transition
        {
            let mut r = run.lock().await;
            if r.all_nodes_success() {
                r.transition(PipelineStatus::Completed)
                    .map_err(|e| e.to_string())?;
            } else {
                r.transition(PipelineStatus::Failed)
                    .map_err(|e| e.to_string())?;
            }

            // Save final checkpoint
            let l = ledger.lock().await;
            let _ = self.save_checkpoint(&conn, &r, &l, "final");
        }

        Ok(())
    }
}

fn truncate_content(value: &serde_json::Value, max_len: usize) -> String {
    let s = match value {
        serde_json::Value::String(s) => s.clone(),
        _ => value.to_string(),
    };
    if s.len() > max_len {
        format!("{}...", &s[..max_len])
    } else {
        s
    }
}
