# CClaude — Local AI Chat UI

> A Claude Desktop-inspired chat interface for your local LLM, built with React + Vite.  
> Created by **Chaithrodaya Sukruth** · chaithru@gmail.com

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the App](#running-the-app)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [Desktop App](#desktop-app)
- [Troubleshooting](#troubleshooting)

---

## Overview

CClaude is a polished, dark-themed chat UI that connects to a locally running LLM proxy server ([free-claude-code](https://github.com/Alishahryar1/free-claude-code)). It gives you a Claude Desktop-like experience — conversations, projects, model switching — entirely on your own machine.

---

## Features

| Feature | Description |
|---------|-------------|
| 💬 Chat | Streaming conversations with your local LLM |
| 📁 Projects | Organize conversations by project |
| 🔄 Model Selector | Search and switch models live, with active model badge |
| ⚙️ Settings | Configure endpoint, auth token, system prompt |
| 🧩 Cowork / Skills / Dispatch | Placeholder sections for future capabilities |
| 🌑 Dark theme | Professional dark UI matching Claude Desktop aesthetics |

---

## Prerequisites

You need the following installed before proceeding:

### 1. Node.js (v18 or higher)

Download from [nodejs.org](https://nodejs.org) — choose the **LTS** version.

Verify:
```bash
node --version   # should print v18.x.x or higher
npm --version    # should print 9.x.x or higher
```

### 2. Git

Download from [git-scm.com](https://git-scm.com).

Verify:
```bash
git --version
```

### 3. free-claude-code proxy server

This is the local LLM backend that CClaude connects to.

```bash
# Install via pip (requires Python 3.11+)
pip install free-claude-code

# OR clone and run from source
git clone https://github.com/Alishahryar1/free-claude-code.git
cd free-claude-code
uv run uvicorn server:app --host 0.0.0.0 --port 8082
```

After startup you should see:
```
INFO:     Admin UI: http://127.0.0.1:8082/admin (local-only)
```

Configure your provider (NVIDIA NIM, Ollama, OpenRouter, etc.) via the Admin UI at `http://127.0.0.1:8082/admin`.

---

## Installation

```bash
# 1. Clone this repository
git clone https://github.com/chaithruak/CClaude.git
cd CClaude

# 2. Install dependencies
#    IMPORTANT: Delete node_modules and package-lock.json first if you've run
#    npm install before on a different OS — this avoids a known npm native
#    binary bug with rollup on Windows.
npm install
```

> **Windows users:** If you see an error about `@rollup/rollup-win32-x64-msvc`, run:
> ```powershell
> Remove-Item -Recurse -Force node_modules, package-lock.json
> npm install
> ```

---

## Running the App

### Step 1 — Start the LLM proxy

In a terminal:
```bash
fcc-server
```

Keep this running in the background.

### Step 2 — Start the UI dev server

In a second terminal, from the `claude-ui` folder:
```bash
npm run dev
```

### Step 3 — Open in browser

```
http://localhost:5173
```

---

## Configuration

Click **Settings** at the bottom of the sidebar to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| Endpoint | *(blank — uses proxy)* | Leave blank to use Vite's built-in proxy to `localhost:8082`. Set a full URL to point at a remote server. |
| Auth Token | `freecc` | Must match your `fcc-server` auth token |
| Default Model | *(auto-detected)* | Fetched from `/v1/models`. Can also be set manually. |
| System Prompt | *(built-in)* | Sent with every message as the system context |

### Changing the backend port

If your `fcc-server` runs on a port other than `8082`, update `vite.config.js`:

```js
proxy: {
  '/v1': {
    target: 'http://localhost:YOUR_PORT',  // ← change here
    changeOrigin: true,
  }
}
```

---

## Project Structure

```
claude-ui/
├── index.html                  # App entry point
├── vite.config.js              # Vite config + proxy to LLM server
├── package.json
├── src/
│   ├── main.jsx                # React root
│   ├── App.jsx                 # Layout + global store context
│   ├── index.css               # CSS variables + global resets
│   ├── components/
│   │   ├── Sidebar.jsx         # Collapsible nav sidebar
│   │   ├── ModelSelector.jsx   # Active model badge + searchable switcher
│   │   ├── MessageBubble.jsx   # Chat message renderer (markdown, code blocks)
│   │   ├── SettingsModal.jsx   # Settings overlay
│   │   └── PlaceholderView.jsx # Reusable "coming soon" page shell
│   ├── hooks/
│   │   └── useChat.js          # Streaming SSE chat hook → Anthropic /v1/messages
│   ├── store/
│   │   └── useStore.js         # In-memory + localStorage state (projects, conversations, settings)
│   └── views/
│       ├── ChatView.jsx        # Main chat interface
│       ├── ProjectsView.jsx    # Project CRUD manager
│       ├── CoworkView.jsx      # Placeholder
│       ├── SkillsView.jsx      # Placeholder
│       └── DispatchView.jsx    # Placeholder
```

---

## Desktop App

Yes — CClaude can be packaged as a native desktop app using **Electron**. Here's how:

### Quick setup

```bash
# Install Electron and builder tools
npm install --save-dev electron electron-builder concurrently wait-on

# Add these scripts to package.json:
# "electron:dev":   "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
# "electron:build": "npm run build && electron-builder"
```

Create `electron/main.js`:
```js
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })
  // In dev: load Vite dev server. In prod: load built files.
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
```

Then run:
```bash
npm run electron:dev    # development
npm run electron:build  # produces an .exe / .dmg / .AppImage installer
```

> Ask for "Convert to desktop app" and the full Electron setup will be added to this project automatically.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Failed to fetch` in chat | Make sure `fcc-server` is running. Check Settings → endpoint is blank (uses proxy). |
| `@rollup/rollup-win32-x64-msvc` error | Delete `node_modules` and `package-lock.json`, then `npm install` again. |
| Model selector shows "No models found" | Proxy isn't reachable. Verify `fcc-server` is on port 8082. |
| Port 5173 already in use | Change `port` in `vite.config.js` or kill the conflicting process. |

---

## License

MIT — feel free to fork, modify, and distribute.

---

*© 2025 CClaude™ · Created by Chaithrodaya Sukruth