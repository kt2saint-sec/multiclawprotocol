mod commands;
mod engine;

use commands::execution::ExecutionManager;
#[cfg(debug_assertions)]
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(ExecutionManager::default())
        .invoke_handler(tauri::generate_handler![
            // Model router
            commands::models::ollama_health,
            commands::models::list_models,
            commands::models::warmup_model,
            // Execution engine
            commands::execution::start_run,
            commands::execution::pause_run,
            commands::execution::resume_run,
            commands::execution::cancel_run,
            commands::execution::get_run_status,
            // PTY terminal
            commands::pty::spawn_pty,
            commands::pty::pty_write,
            commands::pty::pty_resize,
            commands::pty::pty_kill,
            // Agent filesystem
            commands::agent_fs::save_agent,
            commands::agent_fs::load_agent,
            commands::agent_fs::list_agents,
            commands::agent_fs::delete_agent,
            // ChromaDB
            engine::chromadb::chroma_search,
            engine::chromadb::chroma_store,
            // Logging
            commands::logging::append_log,
            commands::logging::read_log,
            commands::logging::list_log_dates,
            // Health
            commands::health::check_all_health,
            commands::health::check_agent_health,
        ])
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(if cfg!(debug_assertions) {
                    log::LevelFilter::Debug
                } else {
                    log::LevelFilter::Info
                })
                .build(),
        )
        .setup(|_app| {
            #[cfg(debug_assertions)]
            if let Some(window) = _app.get_webview_window("main") {
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
