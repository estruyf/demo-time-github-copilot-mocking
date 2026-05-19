# GitHub Copilot Chat Mocking Guide

This project uses Dev Proxy to mock GitHub Copilot Chat network calls so you can run reliable demos without depending on live backend responses.

## What this project does

- Intercepts Copilot API requests to:
	- https://api.individual.githubcopilot.com/*
	- https://api.githubcopilot.com/*
- Returns local mock responses from text and JSON files.
- Supports both streaming endpoints and non-streaming chat completion endpoints.

## Files in this folder

- `devproxyrc.jsonc`: Dev Proxy configuration (plugins, watched URLs, mock settings).
- `mocks.json`: Request matching rules and corresponding mock responses.
- `messages-mock.txt`: Mock SSE stream for `/v1/messages` requests.
- `responses-mock.txt`: Mock SSE stream for `/responses` requests.

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

Use the generator script when you want to create a new pair of mock files and retarget mocks.json in one step:

```bash
node generate-mock.mjs "Hello from the mock" demo
```

This writes:

- `demo-messages.txt`
- `demo-responses.txt`

You can also pass an optional output directory as the third argument.

### 1) Change streamed Copilot output

- Edit `messages-mock.txt` for `/v1/messages*` responses.
- Edit `responses-mock.txt` for `/responses*` responses.
- Keep valid SSE format:
	- `event: ...`
	- `data: ...`
	- Blank line between events.

### 2) Change chat completion output

- Edit the `/chat/completions*` mock objects in `mocks.json`.
- Update `choices[0].message.content` with your desired output.

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
4. Tweak `messages-mock.txt` or `responses-mock.txt` as needed.
5. Re-run the same prompt to demonstrate deterministic behavior.

## Troubleshooting

- No mocked response:
	- Verify Dev Proxy is running.
	- Verify URL patterns in `mocks.json` match the actual request URL.
	- Ensure your client is routing traffic through Dev Proxy.
- Broken stream output:
	- Validate SSE formatting in `messages-mock.txt` or `responses-mock.txt`.
	- Ensure each `data:` line is valid JSON where required.
- Wrong endpoint mocked:
	- Check whether the client is calling `api.individual.githubcopilot.com` or `api.githubcopilot.com` and update the corresponding mock.