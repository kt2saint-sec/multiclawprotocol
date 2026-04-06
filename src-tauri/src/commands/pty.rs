use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use tauri::{command, AppHandle, Emitter};

static NEXT_ID: AtomicU32 = AtomicU32::new(1);

struct PtySession {
    writer: Box<dyn Write + Send>,
    child: Box<dyn portable_pty::Child + Send>,
}

static SESSIONS: std::sync::LazyLock<Mutex<HashMap<u32, PtySession>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));

#[command]
pub async fn spawn_pty(app: AppHandle, cols: u16, rows: u16) -> Result<u32, String> {
    let session_id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
        .map_err(|e| format!("Failed to open PTY: {e}"))?;

    let mut cmd = CommandBuilder::new("/bin/bash");
    cmd.arg("--login");
    cmd.cwd(dirs::home_dir().unwrap_or_else(|| ".".into()));

    let child = pair.slave.spawn_command(cmd).map_err(|e| format!("Failed to spawn shell: {e}"))?;
    let writer = pair.master.take_writer().map_err(|e| format!("Failed to get PTY writer: {e}"))?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| format!("Failed to get PTY reader: {e}"))?;

    {
        let mut sessions = SESSIONS.lock().map_err(|e| e.to_string())?;
        sessions.insert(session_id, PtySession { writer, child });
    }

    let event_name = format!("pty-output-{session_id}");
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app.emit(&event_name, data);
                }
                Err(_) => break,
            }
        }
        if let Ok(mut sessions) = SESSIONS.lock() {
            sessions.remove(&session_id);
        }
        let _ = app.emit(&format!("pty-exit-{session_id}"), ());
    });

    Ok(session_id)
}

#[command]
pub async fn pty_write(session_id: u32, data: String) -> Result<(), String> {
    let mut sessions = SESSIONS.lock().map_err(|e| e.to_string())?;
    let session = sessions.get_mut(&session_id).ok_or("Session not found")?;
    session.writer.write_all(data.as_bytes()).map_err(|e| format!("Write failed: {e}"))?;
    session.writer.flush().map_err(|e| format!("Flush failed: {e}"))?;
    Ok(())
}

#[command]
pub async fn pty_resize(_session_id: u32, _cols: u16, _rows: u16) -> Result<(), String> {
    Ok(())
}

#[command]
pub async fn pty_kill(session_id: u32) -> Result<(), String> {
    let mut sessions = SESSIONS.lock().map_err(|e| e.to_string())?;
    if let Some(mut session) = sessions.remove(&session_id) {
        let _ = session.child.kill();
    }
    Ok(())
}
