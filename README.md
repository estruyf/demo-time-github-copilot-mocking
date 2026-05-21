# GitHub Copilot Chat Mocking Guide

This project uses Dev Proxy to mock GitHub Copilot Chat network calls so you can run reliable demos without depending on live backend responses.

## What this project does

- Intercepts Copilot API requests to:
	- https://api.individual.githubcopilot.com/*
	- https://api.githubcopilot.com/*
- Returns local mock responses from local SSE files.
- Supports `/v1/messages`, `/responses`, and `/chat/completions` endpoint variants.

## Files in this folder

- `devproxyrc.jsonc`: Dev Proxy configuration (plugins, watched URLs, mock settings).
- `mocks.json`: Request matching rules and corresponding mock responses.
- `demo1-messages.txt`: Mock SSE stream for `/v1/messages` requests.
- `demo1-responses.txt`: Mock SSE stream for `/responses` requests.
- `demo1-chat-completions.txt`: Mock SSE stream for `/chat/completions` requests.

## Prerequisites

- Dev Proxy installed and available on your PATH.
- Your app/tool configured to route traffic through Dev Proxy.

## Start Dev Proxy

Run from this folder:

```bash
devproxy
```

Dev Proxy will load `devproxyrc.jsonc` and apply mocks from `mocks.json`.

## Stop Dev Proxy

Use this command to stop all running Dev Proxy processes:

```bash
kill -SIGINT $(pgrep devproxy)
```

## How to customize responses

### Generate mock files from a message

Use the generator script when you want to create a new set of mock files and retarget mocks.json in one step:

```bash
node generate-mock.mjs "Hello from the mock" demo
```

This writes:

- `demo-messages.txt`
- `demo-responses.txt`
- `demo-chat-completions.txt`

You can also pass an optional output directory as the third argument.

### 1) Change streamed Copilot output

- Edit `demo1-messages.txt` for `/v1/messages*` responses.
- Edit `demo1-responses.txt` for `/responses*` responses.
- Edit `demo1-chat-completions.txt` for `/chat/completions*` responses.
- Keep valid SSE format:
	- `event: ...`
	- `data: ...`
	- Blank line between events.

### 2) Switch between named mock sets

- Run `node set-mock.mjs demo1` to activate `demo1-messages.txt`, `demo1-responses.txt`, and `demo1-chat-completions.txt`.
- Run `node set-mock.mjs <name>` after generating a new set.

### 3) Add new endpoints

- Add another object to the `mocks` array in `mocks.json` with:
	- `request.url`
	- `request.method`
	- `response.statusCode`
	- `response.headers`
	- `response.body`

## Demo workflow

1. Start Dev Proxy.
2. Trigger a Copilot Chat request from your app/editor.
3. Confirm the mocked response appears.
4. Tweak the active `*-messages.txt`, `*-responses.txt`, or `*-chat-completions.txt` files as needed.
5. Re-run the same prompt to demonstrate deterministic behavior.

## VS Code demo setup

To ensure Copilot traffic goes through Dev Proxy in a demo environment:

1. Start Dev Proxy in this folder with `devproxy`.
2. In the VS Code host used for the demo, make sure this setting is set:
	- `"chat.advanced.responsesApi.webSocket.enabled": false`
3. Configure proxy env vars for the host process running Copilot Chat:
	- `HTTPS_PROXY=http://127.0.0.1:8000`
	- `HTTP_PROXY=http://127.0.0.1:8000`
4. If HTTPS interception certs are not trusted yet, trust the Dev Proxy root certificate so TLS requests can be intercepted.

## Disable WebSocket (force HTTP POST)

Dev Proxy currently does **not** support WebSocket traffic (yet), so WebSocket-based Copilot responses are not intercepted by these mocks.

Reference issue: https://github.com/dotnet/dev-proxy/issues/1567

To keep Copilot Chat requests mockable through Dev Proxy, force HTTP POST by disabling WebSocket transport.

### VS Code internal setting

Use this team-internal setting in your VS Code `settings.json` (or equivalent configuration service mock):

```json
"chat.advanced.responsesApi.webSocket.enabled": false
```

### Behavior notes

- The setting defaults to `false`.
- In some environments, experimentation/flighting can enable WebSocket transport for specific users.
- Setting this value explicitly to `false` is the safest way to keep HTTP POST behavior for demos and tests.

### Optional fallback if you control model metadata

If you control the mock endpoint or model metadata, you can also prevent WebSocket selection by ensuring the model's `supported_endpoints` does **not** include `ModelSupportedEndpoint.WebSocketResponses`.

That effectively short-circuits WebSocket selection regardless of experiment state.

## Troubleshooting

- WebSocket requests bypass mocks:
	- See the **Disable WebSocket (force HTTP POST)** section above.

- No mocked response:
	- Verify Dev Proxy is running.
	- Verify URL patterns in `mocks.json` match the actual request URL.
	- Ensure your client is routing traffic through Dev Proxy.
- Broken stream output:
	- Validate SSE formatting in your active `*-messages.txt`, `*-responses.txt`, or `*-chat-completions.txt` file.
	- Ensure each `data:` line is valid JSON where required.
- Wrong endpoint mocked:
	- Check whether the client is calling `api.individual.githubcopilot.com` or `api.githubcopilot.com` and update the corresponding mock.
