# GitHub Copilot Chat Mocking Guide

## About this project

This is a **Demo Time** toolkit that enables you to reliably demonstrate GitHub Copilot Chat features without depending on live backend responses. It uses the [`copilot-mock-server`](https://github.com/estruyf/copilot-mock-server) tool to intercept and mock Copilot API calls, allowing you to replay consistent, pre-recorded responses during presentations.

Perfect for:
- Running live product demos of Copilot Chat capabilities
- Teaching workshops on GitHub Copilot
- Testing Chat integrations in your applications
- Creating reproducible, deterministic demo scenarios

---

## How it works

`copilot-mock-server` sits between VS Code's Copilot extension and the GitHub Copilot API. It matches incoming chat prompts against a set of rules and returns scripted, streaming responses — no live API call is ever made for matched prompts.

```
VS Code Copilot extension
        │
        ▼
copilot-mock-server  ◄──  cms.mock.json  (your rules)
        │
        ▼  (unmatched prompts only)
GitHub Copilot API
```

VS Code is pointed at the local server via three debug settings in `.vscode/settings.json`:

```json
{
  "github.copilot.advanced": {
    "debug.overrideProxyUrl": "http://localhost:3000",
    "debug.overrideCapiUrl": "http://localhost:3000",
    "debug.overrideAuthType": "token"
  }
}
```

When these settings are active and the server is running, every Copilot Chat request is intercepted. The server supports both the **WebSocket** and **HTTP SSE** transports that the Copilot extension uses.

---

## Installation

```bash
# Run without installing
npx copilot-mock-server

# Or install globally
npm i -g copilot-mock-server
```

---

## Quick start

**1. Start the mock server** (defaults to `http://localhost:3000`):

```bash
copilot-mock-server
```

**2. Enable the VS Code override:**

```bash
copilot-mock-server vscode add
```

This injects the required debug settings into [.vscode/settings.json](.vscode/settings.json):

```json
{
  "github.copilot.advanced.debug.overrideProxyUrl": "http://localhost:3000",
  "github.copilot.advanced.debug.overrideCapiUrl": "http://localhost:3000",
  "github.copilot.advanced.debug.overrideAuthType": "token"
}
```

**3. Reload VS Code** (`Developer: Reload Window`) so the settings take effect.

**4. Open Copilot Chat** and type a prompt that matches one of your rules.

---

## Mock rules (`cms.mock.json`)

Rules live in [cms.mock.json](cms.mock.json) (or a custom path set in your config). Each rule maps one or more input keywords to an output response.

```json
[
  {
    "input": ["keyword"],
    "title": "Optional chat title (if not provided, GitHub Copilot will provide one)",
    "output": "Response text (supports **markdown**)"
  }
]
```

**Matching behaviour:**
- Matching is case-insensitive.
- All `input` keywords must appear in the user's prompt.
- Single-word entries match as whole tokens; multi-word entries match as substrings.
- When multiple rules match, the most specific one wins (most tokens → longest total length → document order).

### Output formats

**Plain markdown:**

```json
{ "input": ["joke"], "output": "Why did the dev go broke? He used up all his cache." }
```

**File links** — renders as a clickable reference in the Chat panel:

```json
{
  "input": ["create", "file"],
  "output": {
    "text": "Created [[file:test.json]] with your content.",
    "tags": [{ "type": "file", "path": "test.json", "label": "test.json" }]
  }
}
```

**Inline file link syntax:** `[[file:path/to/file.ext]]` or `[[file:path/to/file.ext|Custom label]]`

### Examples from this project

| Prompt contains | What Copilot returns |
|---|---|
| `joke` | A developer joke |
| `code` | A TypeScript code block |
| `list` | A markdown checklist |
| `table` | A markdown table |
| `link` + `workspace` | Two clickable file references |
| `vscode` + `setting` | A VS Code settings JSON snippet |
| `vscode` + `command` | A VS Code command JSON snippet |

---

## Configuration (`cms.config.json`)

Create a `cms.config.json` at your project root to customise server behaviour (loaded automatically, or pass `-c <path>` to override):

```json
{
  "port": 3000,
  "responsesPath": "./cms.mock.json",
  "tokenDelayMs": 25,
  "chunkBy": "word",
  "logFile": "./copilot-capture.log",
  "enableConsoleLogs": true,
  "logRequestBodies": false,
  "forwardUnmatched": false,
  "fallbackBaseUrl": "https://api.githubcopilot.com"
}
```

| Field | Default | Description |
|---|---|---|
| `port` | `3000` | Port the server listens on |
| `responsesPath` | `./cms.mock.json` | Path to your rules file |
| `responses` | — | Inline rules array (overrides file) |
| `tokenDelayMs` | `25` | Streaming delay between tokens (ms) |
| `chunkBy` | `"word"` | Stream by `"word"` or `"char"` |
| `logFile` | `./copilot-capture.log` | Log file path |
| `enableConsoleLogs` | `true` | Print logs to the terminal |
| `logRequestBodies` | `false` | Log full HTTP/WS bodies (slows streaming) |
| `forwardUnmatched` | `false` | Proxy unmatched prompts to the real API |
| `fallbackBaseUrl` | `https://api.githubcopilot.com` | Upstream URL for forwarded requests |

---

## CLI reference

```
copilot-mock-server [command] [options]

Commands:
  (none)            Start the mock server
  vscode add        Inject proxy settings into .vscode/settings.json
  vscode remove     Remove proxy settings from .vscode/settings.json
  trust-ca          Trust the generated CA certificate system-wide
  wrap <cmd>        Run a command with HTTPS_PROXY pre-configured

Options:
  -c, --config <path>   Path to config file (default: cms.config.json)
  -v, --version         Show version
  -h, --help            Show help
```

### HTTPS proxy mode

For tools that respect the `HTTPS_PROXY` environment variable (e.g. the Copilot CLI), the server can intercept HTTPS traffic directly. On first run it generates a self-signed CA at `~/.copilot-mock-server/ca.crt`.

```bash
# Trust the CA system-wide
copilot-mock-server trust-ca

# Or scope it to a single command
copilot-mock-server wrap copilot
```

---

## Demo Time integration

The [.demo/](.demo/) directory contains **Demo Time** scenes that automate the VS Code setup during a live demo:

| Scene | What it does |
|---|---|
| **Apply proxy settings** | Patches `.vscode/settings.json` to enable the mock override and reloads VS Code |
| **Start copilot-mock-server** | Runs `copilot-mock-server` in the integrated terminal |
| **Reload VSCode** | Reloads the window to pick up any settings changes |
| **Remove proxy settings** | Restores `.vscode/settings.json` to its original state and reloads VS Code |

This means you can trigger the entire setup and teardown from the Demo Time panel with a single keystroke — no manual editing required during your presentation.

---

## Resources

- [copilot-mock-server on GitHub](https://github.com/estruyf/copilot-mock-server)
- [copilot-mock-server on npm](https://www.npmjs.com/package/copilot-mock-server)
- [Demo Time VS Code extension](https://marketplace.visualstudio.com/items?itemName=eliostruyf.vscode-demo-time)
