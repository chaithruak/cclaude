'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  getHomeDir: () => ipcRenderer.invoke('app:homeDir'),
  onNewChat: (cb) => {
    ipcRenderer.on('menu:new-chat', cb)
    return () => ipcRenderer.removeListener('menu:new-chat', cb)
  },
})

// Cowork — file system API
contextBridge.exposeInMainWorld('coworkFS', {
  list:    (dirPath)             => ipcRenderer.invoke('fs:list', dirPath),
  read:    (filePath)            => ipcRenderer.invoke('fs:read', filePath),
  write:   (filePath, content)   => ipcRenderer.invoke('fs:write', filePath, content),
  delete:  (filePath)            => ipcRenderer.invoke('fs:delete', filePath),
  mkdir:   (dirPath)             => ipcRenderer.invoke('fs:mkdir', dirPath),
  exists:  (filePath)            => ipcRenderer.invoke('fs:exists', filePath),
  stat:    (filePath)            => ipcRenderer.invoke('fs:stat', filePath),
  pickDir: ()                    => ipcRenderer.invoke('fs:pickDir'),
})

// Cowork — shell API
contextBridge.exposeInMainWorld('coworkShell', {
  exec:      (cmd, opts)   => ipcRenderer.invoke('shell:exec', cmd, opts),
  kill:      (pid)         => ipcRenderer.invoke('shell:kill', pid),
  openPath:  (p)           => ipcRenderer.invoke('shell:openPath', p),
  sysInfo:   ()            => ipcRenderer.invoke('shell:sysInfo'),
  onOutput:  (cb)          => {
    ipcRenderer.on('shell:output', (_, data) => cb(data))
    return () => ipcRenderer.removeAllListeners('shell:output')
  },
})
