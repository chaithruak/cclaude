'use strict'

const { app, BrowserWindow, Menu, shell, ipcMain, nativeTheme, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')
const { exec } = require('child_process')

const isDev = process.env.NODE_ENV === 'development'

// ── Window ────────────────────────────────────────────────────────────────────
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 800, minHeight: 600,
    title: 'CClaude',
    backgroundColor: '#1a1a1a',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    icon: path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  mainWindow.on('closed', () => { mainWindow = null })
}

// ── App Menu ──────────────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{ label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] }] : []),
    { label: 'File', submenu: [
      { label: 'New Chat', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new-chat') },
      { type: 'separator' },
      process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' },
    ]},
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'forceReload' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }, ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : [])] },
    { label: 'Help', submenu: [
      { label: 'About CClaude', click: () => {
        dialog.showMessageBox(mainWindow, { type: 'info', title: 'About CClaude', message: 'CClaude™', detail: `Version: ${app.getVersion()}\nCreated by: Chaithrodaya Sukruth\n\nLocal AI chat UI powered by free-claude-code.`, buttons: ['OK'] })
      }},
      { label: 'Open fcc-server Admin', click: () => shell.openExternal('http://localhost:8082/admin') },
    ]},
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ── IPC — App ─────────────────────────────────────────────────────────────────
ipcMain.handle('app:version', () => app.getVersion())
ipcMain.handle('app:platform', () => process.platform)
ipcMain.handle('app:homeDir', () => os.homedir())
ipcMain.handle('app:cwd', () => process.cwd())

// ── IPC — File System (Cowork) ────────────────────────────────────────────────

ipcMain.handle('fs:list', async (_, dirPath) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    return {
      ok: true,
      entries: entries.map(e => ({
        name: e.name,
        isDir: e.isDirectory(),
        isFile: e.isFile(),
        path: path.join(dirPath, e.name),
        size: e.isFile() ? (() => { try { return fs.statSync(path.join(dirPath, e.name)).size } catch { return 0 } })() : null,
        modified: (() => { try { return fs.statSync(path.join(dirPath, e.name)).mtime.toISOString() } catch { return null } })(),
      }))
    }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('fs:read', async (_, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return { ok: true, content }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('fs:write', async (_, filePath, content) => {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, 'utf-8')
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('fs:delete', async (_, filePath) => {
  try {
    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) fs.rmSync(filePath, { recursive: true })
    else fs.unlinkSync(filePath)
    return { ok: true }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('fs:mkdir', async (_, dirPath) => {
  try { fs.mkdirSync(dirPath, { recursive: true }); return { ok: true } }
  catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('fs:exists', async (_, filePath) => {
  return { ok: true, exists: fs.existsSync(filePath) }
})

ipcMain.handle('fs:stat', async (_, filePath) => {
  try {
    const s = fs.statSync(filePath)
    return { ok: true, isDir: s.isDirectory(), isFile: s.isFile(), size: s.size, modified: s.mtime.toISOString() }
  } catch (e) { return { ok: false, error: e.message } }
})

ipcMain.handle('fs:pickDir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] })
  return { ok: true, path: result.filePaths[0] ?? null }
})

// ── IPC — Shell (Cowork) ──────────────────────────────────────────────────────
const runningProcesses = new Map()

ipcMain.handle('shell:exec', async (event, cmd, opts = {}) => {
  const cwd = opts.cwd || os.homedir()
  const timeout = opts.timeout || 60000
  return new Promise((resolve) => {
    const proc = exec(cmd, { cwd, timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      runningProcesses.delete(proc.pid)
      resolve({ ok: true, stdout: stdout || '', stderr: stderr || '', exitCode: err?.code ?? 0 })
    })
    if (proc.pid) runningProcesses.set(proc.pid, proc)
    proc.stdout?.on('data', d => event.sender.send('shell:output', { pid: proc.pid, data: d.toString(), stream: 'stdout' }))
    proc.stderr?.on('data', d => event.sender.send('shell:output', { pid: proc.pid, data: d.toString(), stream: 'stderr' }))
  })
})

ipcMain.handle('shell:kill', async (_, pid) => {
  const proc = runningProcesses.get(pid)
  if (proc) { proc.kill(); runningProcesses.delete(pid); return { ok: true } }
  return { ok: false, error: 'Process not found' }
})

ipcMain.handle('shell:openPath', async (_, filePath) => {
  shell.openPath(filePath); return { ok: true }
})

ipcMain.handle('shell:sysInfo', async () => {
  return {
    ok: true,
    platform: process.platform,
    arch: process.arch,
    homeDir: os.homedir(),
    tmpDir: os.tmpdir(),
    cpus: os.cpus().length,
    totalMem: os.totalmem(),
    freeMem: os.freemem(),
    hostname: os.hostname(),
  }
})

// ── Lifecycle ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark'
  buildMenu()
  createWindow()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
