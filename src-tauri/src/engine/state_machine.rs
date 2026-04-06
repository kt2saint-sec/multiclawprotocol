use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PipelineStatus {
    Pending,
    Validating,
    Ready,
    Running,
    Paused,
    Completed,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NodeStatus {
    Init,
    Validate,
    Execute,
    Collect,
    Pass,
    Complete,
    Error,
    Skipped,
}

#[derive(Debug, Error)]
pub enum StateMachineError {
    #[error("Invalid pipeline transition: {from:?} -> {to:?}")]
    InvalidPipelineTransition {
        from: PipelineStatus,
        to: PipelineStatus,
    },
    #[error("Invalid node transition: {from:?} -> {to:?}")]
    InvalidNodeTransition {
        from: NodeStatus,
        to: NodeStatus,
    },
    #[error("Node {0} not found")]
    NodeNotFound(String),
    #[error("Pipeline not in running state")]
    NotRunning,
    #[error("Database error: {0}")]
    Database(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeState {
    pub node_id: String,
    pub agent_id: String,
    pub status: NodeStatus,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub cost_usd: f64,
    pub tokens_input: u64,
    pub tokens_output: u64,
    pub error_message: Option<String>,
    pub depends_on: Vec<String>,
}

impl NodeState {
    pub fn new(node_id: String, agent_id: String, depends_on: Vec<String>) -> Self {
        Self {
            node_id,
            agent_id,
            status: NodeStatus::Init,
            started_at: None,
            completed_at: None,
            cost_usd: 0.0,
            tokens_input: 0,
            tokens_output: 0,
            error_message: None,
            depends_on,
        }
    }

    pub fn transition(&mut self, to: NodeStatus) -> Result<(), StateMachineError> {
        if !self.is_valid_transition(to) {
            return Err(StateMachineError::InvalidNodeTransition {
                from: self.status,
                to,
            });
        }
        self.status = to;
        match to {
            NodeStatus::Execute => self.started_at = Some(Utc::now()),
            NodeStatus::Complete | NodeStatus::Error | NodeStatus::Skipped => {
                self.completed_at = Some(Utc::now());
            }
            _ => {}
        }
        Ok(())
    }

    fn is_valid_transition(&self, to: NodeStatus) -> bool {
        matches!(
            (self.status, to),
            (NodeStatus::Init, NodeStatus::Validate)
                | (NodeStatus::Validate, NodeStatus::Execute)
                | (NodeStatus::Validate, NodeStatus::Skipped)
                | (NodeStatus::Execute, NodeStatus::Collect)
                | (NodeStatus::Execute, NodeStatus::Error)
                | (NodeStatus::Collect, NodeStatus::Pass)
                | (NodeStatus::Collect, NodeStatus::Error)
                | (NodeStatus::Pass, NodeStatus::Complete)
                | (NodeStatus::Error, NodeStatus::Init) // retry
        )
    }

    pub fn is_complete(&self) -> bool {
        matches!(
            self.status,
            NodeStatus::Complete | NodeStatus::Error | NodeStatus::Skipped
        )
    }

    pub fn is_success(&self) -> bool {
        self.status == NodeStatus::Complete
    }

    pub fn dependencies_met(&self, nodes: &[NodeState]) -> bool {
        self.depends_on.iter().all(|dep_id| {
            nodes
                .iter()
                .find(|n| n.node_id == *dep_id)
                .map(|n| n.is_success())
                .unwrap_or(false)
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineRun {
    pub run_id: String,
    pub pipeline_id: String,
    pub status: PipelineStatus,
    pub nodes: Vec<NodeState>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub total_cost_usd: f64,
    pub budget_max_usd: f64,
    pub error_message: Option<String>,
}

impl PipelineRun {
    pub fn new(
        run_id: String,
        pipeline_id: String,
        budget_max_usd: f64,
        nodes: Vec<NodeState>,
    ) -> Self {
        Self {
            run_id,
            pipeline_id,
            status: PipelineStatus::Pending,
            nodes,
            started_at: None,
            completed_at: None,
            total_cost_usd: 0.0,
            budget_max_usd,
            error_message: None,
        }
    }

    pub fn transition(&mut self, to: PipelineStatus) -> Result<(), StateMachineError> {
        if !self.is_valid_transition(to) {
            return Err(StateMachineError::InvalidPipelineTransition {
                from: self.status,
                to,
            });
        }
        self.status = to;
        match to {
            PipelineStatus::Running => self.started_at = Some(Utc::now()),
            PipelineStatus::Completed | PipelineStatus::Failed => {
                self.completed_at = Some(Utc::now());
            }
            _ => {}
        }
        Ok(())
    }

    fn is_valid_transition(&self, to: PipelineStatus) -> bool {
        matches!(
            (self.status, to),
            (PipelineStatus::Pending, PipelineStatus::Validating)
                | (PipelineStatus::Validating, PipelineStatus::Ready)
                | (PipelineStatus::Validating, PipelineStatus::Failed)
                | (PipelineStatus::Ready, PipelineStatus::Running)
                | (PipelineStatus::Running, PipelineStatus::Paused)
                | (PipelineStatus::Running, PipelineStatus::Completed)
                | (PipelineStatus::Running, PipelineStatus::Failed)
                | (PipelineStatus::Paused, PipelineStatus::Running)
                | (PipelineStatus::Paused, PipelineStatus::Failed)
        )
    }

    pub fn get_node(&self, node_id: &str) -> Result<&NodeState, StateMachineError> {
        self.nodes
            .iter()
            .find(|n| n.node_id == node_id)
            .ok_or_else(|| StateMachineError::NodeNotFound(node_id.to_string()))
    }

    pub fn get_node_mut(&mut self, node_id: &str) -> Result<&mut NodeState, StateMachineError> {
        self.nodes
            .iter_mut()
            .find(|n| n.node_id == node_id)
            .ok_or_else(|| StateMachineError::NodeNotFound(node_id.to_string()))
    }

    /// Returns node IDs that are ready to execute (dependencies met, still in Init state)
    pub fn ready_nodes(&self) -> Vec<String> {
        self.nodes
            .iter()
            .filter(|n| n.status == NodeStatus::Init && n.dependencies_met(&self.nodes))
            .map(|n| n.node_id.clone())
            .collect()
    }

    /// True when all nodes are in a terminal state
    pub fn all_nodes_done(&self) -> bool {
        self.nodes.iter().all(|n| n.is_complete())
    }

    /// True when all nodes completed successfully
    pub fn all_nodes_success(&self) -> bool {
        self.nodes.iter().all(|n| n.is_success())
    }
}
