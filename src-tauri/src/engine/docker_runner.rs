use std::path::PathBuf;
use std::process::Stdio;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tauri::{AppHandle, Emitter};

use super::runner::RunnerEvent;

const DEFAULT_IMAGE: &str = "nikolaik/python-nodejs:python3.11-nodejs20";
const DEFAULT_MEMORY: &str = "4g";
const DEFAULT_CPUS: &str = "2";
const DEFAULT_TIMEOUT_SECS: u64 = 600;

#[derive(Debug, Clone)]
pub struct DockerRunner {
    workspace_base: PathBuf,
}

#[derive(Debug)]
pub struct ContainerResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub workspace_path: PathBuf,
}

impl DockerRunner {
    pub fn new(workspace_base: PathBuf) -> Self {
        Self { workspace_base }
    }

    /// Run a command inside a Docker container with resource limits and workspace mount.
    pub async fn run_in_container(
        &self,
        app_handle: &AppHandle,
        run_id: &str,
        node_id: &str,
        agent_id: &str,
        command: &[String],
        image: Option<&str>,
        timeout_secs: Option<u64>,
    ) -> Result<ContainerResult, String> {
        let workspace = self.workspace_base.join(run_id).join(node_id);
        std::fs::create_dir_all(&workspace)
            .map_err(|e| format!("Failed to create workspace: {e}"))?;

        let timeout = timeout_secs.unwrap_or(DEFAULT_TIMEOUT_SECS);
        let container_image = image.unwrap_or(DEFAULT_IMAGE);

        // Emit start event
        let _ = app_handle.emit(
            "runner-event",
            RunnerEvent::NodeStarted {
                run_id: run_id.to_string(),
                node_id: node_id.to_string(),
                agent_id: agent_id.to_string(),
            },
        );

        let start = std::time::Instant::now();

        // Build docker run command
        let mut docker_cmd = Command::new("docker");
        docker_cmd
            .arg("run")
            .arg("--rm")
            .args(["--memory", DEFAULT_MEMORY])
            .args(["--cpus", DEFAULT_CPUS])
            .args(["--network", "host"])
            .args([
                "-v",
                &format!("{}:/workspace", workspace.display()),
            ])
            .args(["-w", "/workspace"])
            .args(["-e", "OLLAMA_HOST=http://localhost:11434"])
            .arg(container_image);

        // Append the user command
        for arg in command {
            docker_cmd.arg(arg);
        }

        docker_cmd.stdout(Stdio::piped()).stderr(Stdio::piped()).kill_on_drop(true);

        let mut child = docker_cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn docker: {e}"))?;

        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
        let stderr = child.stderr.take().ok_or("Failed to capture stderr")?;

        let mut stdout_reader = BufReader::new(stdout).lines();
        let mut stderr_reader = BufReader::new(stderr).lines();
        let mut full_stdout = String::new();
        let mut full_stderr = String::new();

        let app_clone = app_handle.clone();
        let run_id_owned = run_id.to_string();
        let node_id_owned = node_id.to_string();

        // Stream output with timeout
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
                                    full_stdout.push_str(&line);
                                    full_stdout.push('\n');
                                }
                                Ok(None) => break,
                                Err(e) => {
                                    full_stderr.push_str(&format!("stdout error: {e}\n"));
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

        // Handle timeout — kill the container
        if result.is_err() {
            let _ = child.kill().await;
            let _ = app_handle.emit(
                "runner-event",
                RunnerEvent::NodeError {
                    run_id: run_id.to_string(),
                    node_id: node_id.to_string(),
                    error: format!("Docker container timed out after {timeout}s"),
                },
            );
            return Err(format!("Docker container timed out after {timeout}s"));
        }

        let status = child
            .wait()
            .await
            .map_err(|e| format!("Failed to wait on docker: {e}"))?;

        let exit_code = status.code().unwrap_or(-1);

        if !status.success() {
            let error_msg = if full_stderr.is_empty() {
                format!("Docker container exited with code {exit_code}")
            } else {
                format!("Docker failed (exit {}): {}", exit_code, full_stderr.trim())
            };

            let _ = app_handle.emit(
                "runner-event",
                RunnerEvent::NodeError {
                    run_id: run_id.to_string(),
                    node_id: node_id.to_string(),
                    error: error_msg.clone(),
                },
            );
            return Err(error_msg);
        }

        // Emit completion
        let _ = app_handle.emit(
            "runner-event",
            RunnerEvent::NodeCompleted {
                run_id: run_id.to_string(),
                node_id: node_id.to_string(),
                cost_usd: 0.0,
                tokens_input: 0,
                tokens_output: 0,
                duration_ms,
            },
        );

        Ok(ContainerResult {
            exit_code,
            stdout: full_stdout,
            stderr: full_stderr,
            workspace_path: workspace,
        })
    }

    /// Check if Docker is available
    pub async fn health_check() -> bool {
        Command::new("docker")
            .args(["info", "--format", "{{.ServerVersion}}"])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .output()
            .await
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}
