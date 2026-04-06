use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum CostError {
    #[error("Budget exceeded: need ${needed:.4}, only ${remaining:.4} remaining")]
    BudgetExceeded { needed: f64, remaining: f64 },
    #[error("No reservation found for node {0}")]
    NoReservation(String),
    #[error("Reservation already exists for node {0}")]
    ReservationExists(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AlertLevel {
    None,
    Warning50,
    Warning80,
    Critical95,
    Exceeded,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostEntry {
    pub node_id: String,
    pub agent_id: String,
    pub model_used: String,
    pub tokens_input: u64,
    pub tokens_output: u64,
    pub estimated_cost_usd: f64,
    pub actual_cost_usd: f64,
    pub committed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CostLedger {
    budget_max_usd: f64,
    warn_at_usd: f64,
    committed_total: f64,
    reserved_total: f64,
    entries: Vec<CostEntry>,
    reservations: HashMap<String, f64>,
}

impl CostLedger {
    pub fn new(budget_max_usd: f64, warn_at_usd: f64) -> Self {
        Self {
            budget_max_usd,
            warn_at_usd,
            committed_total: 0.0,
            reserved_total: 0.0,
            entries: Vec::new(),
            reservations: HashMap::new(),
        }
    }

    /// Estimate cost from token count and model pricing
    pub fn estimate_cost(
        input_tokens: u64,
        output_tokens_est: u64,
        input_cost_per_token: f64,
        output_cost_per_token: f64,
    ) -> f64 {
        (input_tokens as f64 * input_cost_per_token)
            + (output_tokens_est as f64 * output_cost_per_token)
    }

    /// Reserve estimated cost before execution. Returns error if budget would be exceeded.
    pub fn reserve(
        &mut self,
        node_id: &str,
        estimated_cost: f64,
    ) -> Result<(), CostError> {
        if self.reservations.contains_key(node_id) {
            return Err(CostError::ReservationExists(node_id.to_string()));
        }

        let remaining = self.budget_max_usd - self.committed_total - self.reserved_total;
        if estimated_cost > remaining && estimated_cost > 0.0 {
            return Err(CostError::BudgetExceeded {
                needed: estimated_cost,
                remaining,
            });
        }

        self.reservations.insert(node_id.to_string(), estimated_cost);
        self.reserved_total += estimated_cost;
        Ok(())
    }

    /// Commit actual cost after execution, releasing the reservation.
    pub fn commit(
        &mut self,
        node_id: &str,
        agent_id: &str,
        model_used: &str,
        tokens_input: u64,
        tokens_output: u64,
        actual_cost_usd: f64,
    ) -> Result<AlertLevel, CostError> {
        let estimated = self
            .reservations
            .remove(node_id)
            .ok_or_else(|| CostError::NoReservation(node_id.to_string()))?;

        self.reserved_total -= estimated;
        self.committed_total += actual_cost_usd;

        self.entries.push(CostEntry {
            node_id: node_id.to_string(),
            agent_id: agent_id.to_string(),
            model_used: model_used.to_string(),
            tokens_input,
            tokens_output,
            estimated_cost_usd: estimated,
            actual_cost_usd,
            committed: true,
        });

        Ok(self.check_alert_level())
    }

    /// Release a reservation without committing (e.g., node skipped or errored)
    pub fn release_reservation(&mut self, node_id: &str) {
        if let Some(amount) = self.reservations.remove(node_id) {
            self.reserved_total -= amount;
        }
    }

    fn check_alert_level(&self) -> AlertLevel {
        let ratio = self.committed_total / self.budget_max_usd;
        if ratio >= 1.0 {
            AlertLevel::Exceeded
        } else if ratio >= 0.95 {
            AlertLevel::Critical95
        } else if ratio >= 0.80 {
            AlertLevel::Warning80
        } else if ratio >= 0.50 {
            AlertLevel::Warning50
        } else {
            AlertLevel::None
        }
    }

    pub fn committed_total(&self) -> f64 {
        self.committed_total
    }

    pub fn reserved_total(&self) -> f64 {
        self.reserved_total
    }

    pub fn remaining_budget(&self) -> f64 {
        self.budget_max_usd - self.committed_total - self.reserved_total
    }

    pub fn entries(&self) -> &[CostEntry] {
        &self.entries
    }

    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }
}
