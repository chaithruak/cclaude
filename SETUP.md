# CClaude — Setup Guide

> Created by **Chaithrodaya Sukruth** · chaithru@gmail.com  
> © 2025 CClaude™

---

## Prerequisites

Before anything else, install the following:

### 1. Node.js (v18+)
Download from https://nodejs.org — choose the **LTS** version.

```bash
node --version   # v18.x.x or higher
npm --version    # 9.x.x or higher
```

### 2. Git
Download from https://git-scm.com

### 3. free-claude-code (local LLM proxy)
CClaude connects to this proxy which routes to your chosen AI provider.

```bash
# Install
pip install free-claude-code

# Start the proxy (keep this running)
fcc-server
```

After startup you'll see:
```
INFO: Admin UI: http://127.0.0.1:8082/admin (local-only)
```

Open that Admin UI to configure your provider (NVIDIA NIM, Ollama, OpenRouter, etc.).

---

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/chaithruak/CClaude.git
cd CClaude

# 2. Install dependencies
npm install
```

> **Windows fix** — if you see an error about `@rollup/rollup-win32-x64-msvc`:
> ```powershell
> Remove-Item -Recurse -Force node_modules, package-lock.json
> npm install
> ```

---

## Option A — Run in Browser (Development)

```bash
# Terminal 1: start the LLM proxy
fcc-server

# Terminal 2: start the UI
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Option B — Run as Desktop App (Electron)

### Development mode (live reload)

```bash
# Terminal 1: start the LLM proxy
fcc-server

# Terminal 2: launch Electron + Vite together
npm run electron:dev
```

A native desktop window will open automatically.

### Build a Windows installer (.exe)

```bash
npm run electron:build
```

Output is in the `release/` folder — double-click the `.exe` to install CClaude as a proper d