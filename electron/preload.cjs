'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// Expose a safe API to the renderer (React app)
contextBridge.exposeInMainWorld('electron', {
  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),

  // Menu events → React can listen for native menu actions
  onNewChat: (callback) => {
    ipcRenderer.on('menu:new-chat', callback)
    return () => ipcRenderer.removeListener('menu:new-chat', callback)
  },
})
