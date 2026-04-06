use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::{command, AppHandle, State};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::engine::cost_ledger::CostLedger;
use crate::engine::orchestrator::Orchestrator;
use crate::engine::runner::RunnerConfig;
use crate::engine::state_machine::{NodeState, PipelineRun, PipelineStatus};

/// Shared execution state managed by Tauri
pub struct ExecutionManager {
    pub current_run: Arc<Mutex<Option<Arc<Mutex<PipelineRun>>>>>,
    pub current_ledger: Arc<Mutex<Option<Arc<Mutex<CostLedger>>>>>,
}

impl Default for ExecutionManager {
    fn default() -> Self {
        Self {
            current_run: Arc::new(Mutex::new(None)),
            current_ledger: Arc::new(Mutex::new(None)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StartRunRequest {
    pub pipeline_id: String,
    pub nodes: Vec<NodeConfig>,
    pub edges: Vec<EdgeConfig>,
    pub budget_max_usd: f64,
    pub budget_warn_usd: f64,
    pub max_parallel: usize,
    pub on_budget_exceeded: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NodeConfig {
    pub id: String,
    pub agent_id: String,
    pub timeout_secs: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct EdgeConfig {
    pub from: String,
    pub to: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RunStatusResponse {
    pub run_id: Option<String>,
    pub status: String,
    pub total_cost_usd: f64,
    pub nodes: Vec<NodeStatusResponse>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NodeStatusResponse {
    pub node_id: String,
    pub agent_id: String,
    pub status: String,
    pub cost_usd: f64,
    pub tokens_input: u64,
    pub tokens_output: u64,
    pub error: Option<String>,
}

#[command]
pub async fn start_run(
    app_handle: AppHandle,
    state: State<'_, ExecutionManager>,
    request: StartRunRequest,
) -> Result<String, String> {
    // Check if a run is already in progress
    {
        let current = state.current_run.lock().await;
        if let Some(ref run) = *current {
            let r = run.lock().await;
            if matches!(r.status, PipelineStatus::Running | PipelineStatus::Paused) {
                return Err("A pipeline run is already in progress".to_string());
            }
        }
    }

    let run_id = Uuid::new_v4().to_string();

    // Build dependency map from edges
    let mut deps: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
    for node in &request.nodes {
        deps.insert(node.id.clone(), vec![]);
    }
    for edge in &request.edges {
        deps.entry(edge.to.clone())
            .or_default()
            .push(edge.from.clone());
    }

    // Create node states
    let nodes: Vec<NodeState> = request
        .nodes
        .iter()
        .map(|n| {
            NodeState::new(
                n.id.clone(),
                n.agent_id.clone(),
                deps.get(&n.id).cloned().unwrap_or_default(),
            )
        })
        .collect();

    let pipeline_run = PipelineRun::new(
        run_id.clone(),
        request.pipeline_id,
        request.budget_max_usd,
        nodes,
    );

    let ledger = CostLedger::new(request.budget_max_usd, request.budget_warn_usd);

    let run = Arc::new(Mutex::new(pipeline_run));
    let ledger = Arc::new(Mutex::new(ledger));

    // Store references
    {
        let mut current_run = state.current_run.lock().await;
        *current_run = Some(Arc::clone(&run));
        let mut current_ledger = state.current_ledger.lock().await;
        *current_ledger = Some(Arc::clone(&ledger));
    }

    // Launch orchestration in background
    let run_clone = Arc::clone(&run);
    let ledger_clone = Arc::clone(&ledger);
    let max_parallel = request.max_parallel;
    let on_budget = request.on_budget_exceeded;

    tokio::spawn(async move {
        let orchestrator = Orchestrator::new(app_handle, RunnerConfig::default());
        let result = orchestrator
            .execute(run_clone, ledger_clone, max_parallel, &on_budget)
            .await;

        if let Err(e) = result {
            log::error!("Pipeline execution failed: {e}");
        }
    });

    Ok(run_id)
}

#[command]
pub async fn pause_run(state: State<'_, ExecutionManager>) -> Result<(), String> {
    let current = state.current_run.lock().await;
    match &*current {
        Some(run) => {
            let mut r = run.lock().await;
            r.transition(PipelineStatus::Paused)
                .map_err(|e| e.to_string())
        }
        None => Err("No active pipeline run".to_string()),
    }
}

#[command]
pub async fn resume_run(state: State<'_, ExecutionManager>) -> Result<(), String> {
    let current = state.current_run.lock().await;
    match &*current {
        Some(run) => {
            let mut r = run.lock().await;
            r.transition(PipelineStatus::Running)
                .map_err(|e| e.to_string())
        }
        None => Err("No active pipeline run".to_string()),
    }
}

#[command]
pub async fn cancel_run(state: State<'_, ExecutionManager>) -> Result<(), String> {
    let current = state.current_run.lock().await;
    match &*current {
        Some(run) => {
            let mut r = run.lock().await;
            r.transition(PipelineStatus::Failed)
                .map_err(|e| e.to_string())?;
            r.error_message = Some("Cancelled by user".to_string());
            Ok(())
        }
        None => Err("No active pipeline run".to_string()),
    }
}

#[command]
pub async fn get_run_status(state: State<'_, ExecutionManager>) -> Result<RunStatusResponse, String> {
    let current = state.current_run.lock().await;
    match &*current {
        Some(run) => {
            let r = run.lock().await;
            Ok(RunStatusResponse {
                run_id: Some(r.run_id.clone()),
                status: format!("{:?}", r.status),
                total_cost_usd: r.total_cost_usd,
                nodes: r
                    .nodes
                    .iter()
                    .map(|n| NodeStatusResponse {
                        node_id: n.node_id.clone(),
                        agent_id: n.agent_id.clone(),
                        status: format!("{:?}", n.status),
                        cost_usd: n.cost_usd,
                        tokens_input: n.tokens_input,
                        tokens_output: n.tokens_output,
                        error: n.error_message.clone(),
                    })
                    .collect(),
            })
        }
        None => Ok(RunStatusResponse {
            run_id: None,
            status: "idle".to_string(),
            total_cost_usd: 0.0,
            nodes: vec![],
        }),
    }
}
