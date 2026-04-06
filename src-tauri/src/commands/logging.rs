use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use tauri::command;
use chrono::Local;

fn logs_dir() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")).join(".multiclawprotocol").join("logs")
}

#[command]
pub async fn append_log(level: String, agent_id: Option<String>, message: String) -> Result<(), String> {
    let dir = logs_dir();
    fs::create_dir_all(&dir).map_err(|e| format!("{e}"))?;
    let path = dir.join(format!("{}.log", Local::now().format("%Y-%m-%d")));
    let line = format!("{} [{}] {}: {}\n", Local::now().format("%Y-%m-%d %H:%M:%S%.3f"), level, agent_id.as_deref().unwrap_or("system"), message);
    let mut file = OpenOptions::new().create(true).append(true).open(&path).map_err(|e| format!("{e}"))?;
    file.write_all(line.as_bytes()).map_err(|e| format!("{e}"))?;
    Ok(())
}

#[command]
pub async fn read_log(date: Option<String>) -> Result<String, String> {
    let path = if let Some(d) = date {
        logs_dir().join(format!("{d}.log"))
    } else {
        logs_dir().join(format!("{}.log", Local::now().format("%Y-%m-%d")))
    };
    if !path.exists() { return Ok(String::new()); }
    fs::read_to_string(&path).map_err(|e| format!("{e}"))
}

#[command]
pub async fn list_log_dates() -> Result<Vec<String>, String> {
    let dir = logs_dir();
    if !dir.exists() { return Ok(vec![]); }
    let mut dates = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        if let Ok(entry) = entry {
            if let Some(name) = entry.file_name().to_str() {
                if name.ends_with(".log") { dates.push(name.trim_end_matches(".log").to_string()); }
            }
        }
    }
    dates.sort();
    dates.reverse();
    Ok(dates)
}
