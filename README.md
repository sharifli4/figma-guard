# Figma Guard

Figma Guard is a Figma plugin for checking designs against your team's design-system rules.

It lets you upload a Markdown file with project rules, validate changed nodes with an LLM, ask questions about the rules, and scan the current page for conflicts.

## Features

- Upload design-system rules from a `.md` file
- Persist rules and provider settings with Figma `clientStorage`
- Listen to `documentchange`, `selectionchange`, and `currentpagechange`
- Run live validation when designers create or modify nodes
- Chat with an LLM about the uploaded rules
- Scan the current page and report rule conflicts
- Support multiple providers:
  - OpenAI
  - Anthropic
  - Gemini
  - Ollama
  - Custom OpenAI-compatible endpoint

## Stack

- TypeScript
- React
- Vite
- Figma Plugin API

## Project Structure

```text
src/
  core/
    rules/
    scan/
    validation/
  llm/
    providers/
  plugin/
    code.ts
  shared/
    types.ts
  ui/
    App.tsx
    main.tsx
```

## How It Works

1. The user uploads a Markdown file with design-system rules.
2. The plugin parses and stores those rules.
3. The plugin listens for Figma document changes.
4. When nodes change, the plugin builds compact snapshots and sends them to the UI.
5. The UI calls the selected LLM provider and returns structured validation results.
6. The plugin shows live findings and can also run a full current-page scan.
7. The same rule set is used for the chat experience.

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

This generates the plugin bundle in `dist/`.

## Lint

```bash
npm run lint
```

## Preview UI Only

```bash
npm run preview
```

This is only for checking the built UI in a browser. Real plugin behavior must be tested in Figma.

## Load In Figma

Use the Figma desktop app for local manifest import.

1. Run `npm run build`
2. Open Figma desktop
3. Open any Figma file
4. Go to `Plugins`
5. Open `Development`
6. Click `Import plugin from manifest...`
7. Select `manifest.json` from this repository

After import, run the plugin from the Development plugins list.

## Using The Plugin

### 1. Upload Rules

Upload a Markdown file containing your design-system rules.

Example:

```md
# Buttons

- Primary buttons must use the brand blue fill
- Border radius must be 8
- Padding must be 12 horizontal and 8 vertical

# Typography

- Body text must use Inter 16
- Headings must use the approved heading scale
```

### 2. Configure A Provider

Choose a provider in the plugin UI, then save:

- `OpenAI`: API key, model, base URL
- `Anthropic`: API key, model, base URL
- `Gemini`: API key and model
- `Ollama`: local base URL and local model name
- `Custom`: OpenAI-compatible endpoint

### 3. Live Validation

After rules and provider settings are saved:

- create a node
- modify a node
- change component properties

The plugin listens for document changes and runs a debounced validation flow.

### 4. Ask Rules

Use the chat input to ask questions such as:

- "Does this spacing follow our rules?"
- "What is the button radius standard?"
- "What typography should I use for captions?"

### 5. Scan Design

Click `Scan Design` to analyze the current page and list rule conflicts.

## Supported Network Targets

The manifest currently allows these hosted domains:

- `https://api.openai.com`
- `https://api.anthropic.com`
- `https://generativelanguage.googleapis.com`
- `https://openrouter.ai`

Local development endpoints are also allowed:

- `http://localhost:11434`
- `http://127.0.0.1:11434`
- `http://localhost:1234`
- `http://127.0.0.1:1234`

## Notes And Limitations

- The plugin currently validates changed or newly created nodes on the active page.
- Page scanning is limited to the current page.
- LLM requests are made from the plugin UI layer.
- Some providers or local servers may require permissive CORS behavior to work inside Figma.
- For local models, `Ollama` or an OpenAI-compatible local server is the easiest setup.

## Development Notes

- Main plugin runtime: `src/plugin/code.ts`
- React UI: `src/ui/App.tsx`
- Rule parsing: `src/core/rules/parser.ts`
- Node snapshot building: `src/core/scan/nodeSnapshot.ts`
- Prompt construction and response parsing: `src/core/validation/`
- Provider adapters: `src/llm/providers/`

## Future Improvements

- richer rule parsing from Markdown
- smarter component-aware validation
- stronger provider-specific error handling
- better batching for large page scans
- direct node navigation from findings
- stronger support for remote collaboration changes
