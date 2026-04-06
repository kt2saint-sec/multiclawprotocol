use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::command;

fn agents_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")).join(".multiclawprotocol").join("agents")
}

fn agent_dir(agent_id: &str) -> PathBuf { agents_dir().join(agent_id) }

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentFiles {
    pub agent_id: String,
    pub soul_md: String,
    pub config_yaml: String,
    pub tools_json: String,
    pub memory_md: String,
    pub user_md: String,
}

#[command]
pub async fn save_agent(agent_id: String, soul_md: String, config_yaml: String, tools_json: String) -> Result<(), String> {
    let dir = agent_dir(&agent_id);
    let memories_dir = dir.join("memories");
    fs::create_dir_all(&memories_dir).map_err(|e| format!("Failed to create agent dir: {e}"))?;
    fs::create_dir_all(dir.join("logs")).map_err(|e| format!("Failed to create logs dir: {e}"))?;
    fs::create_dir_all(dir.join("sessions")).map_err(|e| format!("Failed to create sessions dir: {e}"))?;
    fs::write(dir.join("SOUL.md"), &soul_md).map_err(|e| format!("Failed to write SOUL.md: {e}"))?;
    fs::write(dir.join("config.yaml"), &config_yaml).map_err(|e| format!("Failed to write config.yaml: {e}"))?;
    fs::write(dir.join("tools.json"), &tools_json).map_err(|e| format!("Failed to write tools.json: {e}"))?;
    let memory_path = memories_dir.join("MEMORY.md");
    if !memory_path.exists() {
        fs::write(&memory_path, format!("# Agent Memory: {agent_id}\n\n_No memories recorded yet._\n")).map_err(|e| format!("{e}"))?;
    }
    let user_path = memories_dir.join("USER.md");
    if !user_path.exists() {
        fs::write(&user_path, "# User Preferences\n\n_No user preferences recorded yet._\n").map_err(|e| format!("{e}"))?;
    }
    Ok(())
}

#[command]
pub async fn load_agent(agent_id: String) -> Result<AgentFiles, String> {
    let dir = agent_dir(&agent_id);
    if !dir.exists() { return Err(format!("Agent '{agent_id}' not found")); }
    Ok(AgentFiles {
        agent_id,
        soul_md: fs::read_to_string(dir.join("SOUL.md")).unwrap_or_default(),
        config_yaml: fs::read_to_string(dir.join("config.yaml")).unwrap_or_default(),
        tools_json: fs::read_to_string(dir.join("tools.json")).unwrap_or_default(),
        memory_md: fs::read_to_string(dir.join("memories").join("MEMORY.md")).unwrap_or_default(),
        user_md: fs::read_to_string(dir.join("memories").join("USER.md")).unwrap_or_default(),
    })
}

#[command]
pub async fn list_agents() -> Result<Vec<String>, String> {
    let dir = agents_dir();
    if !dir.exists() { return Ok(vec![]); }
    let mut agents = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        if let Ok(entry) = entry {
            if entry.path().is_dir() {
                if let Some(name) = entry.file_name().to_str() { agents.push(name.to_string()); }
            }
        }
    }
    agents.sort();
    Ok(agents)
}

#[command]
pub async fn delete_agent(agent_id: String) -> Result<(), String> {
    let dir = agent_dir(&agent_id);
    if dir.exists() { fs::remove_dir_all(&dir).map_err(|e| format!("Failed to delete agent: {e}"))?; }
    Ok(())
}
