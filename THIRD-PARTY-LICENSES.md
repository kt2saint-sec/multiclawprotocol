# Third-Party Licenses

MultiClawProtocol incorporates the following open-source components.
Each is governed by its respective license.

## Frontend Dependencies

| Package | Version | License | Copyright |
|---------|---------|---------|-----------|
| React | 19.x | MIT | Meta Platforms, Inc. |
| React DOM | 19.x | MIT | Meta Platforms, Inc. |
| @xyflow/react (React Flow) | 12.x | MIT | webkid GmbH (2019-2025) |
| Zustand | 5.x | MIT | Paul Henschel |
| Tailwind CSS | 4.x | MIT | Tailwind Labs, Inc. |
| @tailwindcss/vite | 4.x | MIT | Tailwind Labs, Inc. |
| xterm.js | 5.x | MIT | The xterm.js authors, SourceLair Private Company |
| @xterm/addon-fit | 0.11.x | MIT | The xterm.js authors |
| @xterm/addon-web-links | 0.12.x | MIT | The xterm.js authors |
| js-yaml | 4.x | MIT | Vitaly Puzrin |
| Vite | 8.x | MIT | Evan You |
| @vitejs/plugin-react | 6.x | MIT | Evan You |
| TypeScript | 5.9.x | Apache-2.0 | Microsoft Corporation |
| PostCSS | 8.x | MIT | Andrey Sitnik |
| ESLint | 9.x | MIT | OpenJS Foundation |

## Rust/Tauri Dependencies

| Crate | Version | License | Copyright |
|-------|---------|---------|-----------|
| Tauri | 2.10.x | MIT/Apache-2.0 | Tauri Programme within The Commons Conservancy |
| tauri-plugin-fs | 2.x | MIT/Apache-2.0 | Tauri Programme |
| tauri-plugin-shell | 2.x | MIT/Apache-2.0 | Tauri Programme |
| tauri-plugin-dialog | 2.x | MIT/Apache-2.0 | Tauri Programme |
| tauri-plugin-log | 2.x | MIT/Apache-2.0 | Tauri Programme |
| tokio | 1.x | MIT | Tokio Contributors |
| serde | 1.x | MIT/Apache-2.0 | David Tolnay |
| serde_json | 1.x | MIT/Apache-2.0 | David Tolnay |
| reqwest | 0.12.x | MIT/Apache-2.0 | Sean McArthur |
| rusqlite | 0.32.x | MIT | The rusqlite authors |
| chrono | 0.4.x | MIT/Apache-2.0 | Kang Seonghoon |
| uuid | 1.x | MIT/Apache-2.0 | The uuid authors |
| thiserror | 2.x | MIT/Apache-2.0 | David Tolnay |
| log | 0.4.x | MIT/Apache-2.0 | The Rust Project Developers |

## Data/AI Dependencies (Bundled)

| Package | License | Copyright |
|---------|---------|-----------|
| ChromaDB | Apache-2.0 | Chroma, Inc. |
| SQLite | Public Domain | D. Richard Hipp |
| sentence-transformers | Apache-2.0 | UKP Lab, TU Darmstadt |
| all-MiniLM-L6-v2 | Apache-2.0 | Microsoft Corporation |

## Model Provider APIs (External Services)

| Service | Terms |
|---------|-------|
| OpenRouter | https://openrouter.ai/terms |
| Anthropic (Claude) | https://www.anthropic.com/terms |
| OpenAI | https://openai.com/terms |
| Google AI | https://ai.google.dev/terms |
| xAI (Grok) | https://x.ai/legal/terms-of-service |
| Mistral AI | https://mistral.ai/terms |
| Ollama | MIT License (local, self-hosted) |
| LiteLLM | MIT License (local proxy) |

## Notes

- All MIT-licensed components permit commercial use, modification, and distribution
  provided the copyright notice is included.
- Apache-2.0 licensed components additionally grant patent rights.
- SQLite is public domain with no restrictions.
- React Flow (MIT) — we have hidden the attribution badge; the license permits this
  as long as the copyright notice is included in this file.
- Model provider APIs are external services governed by their own terms of service.
  MultiClawProtocol does not redistribute their models.
