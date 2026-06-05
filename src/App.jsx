import React, { useState, useEffect, createContext, useContext } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatView from './views/ChatView.jsx'
import CoworkView from './views/CoworkView.jsx'
import SkillsView from './views/SkillsView.jsx'
import DispatchView from './views/DispatchView.jsx'
import ProjectsView from './views/ProjectsView.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import { useStore } from './store/useStore.js'

export const StoreContext = createContext(null)
export const useAppStore = () => useContext(StoreContext)

export default function App() {
  const store = useStore()
  const [activeNav, setActiveNav] = useState('chat')
  const [showSettings, setShowSettings] = useState(false)

  // Listen for native menu "New Chat" (Electron only)
  useEffect(() => {
    if (!window.electron) return
    const unsub = window.electron.onNewChat(() => {
      setActiveNav('chat')
      store.createConversation(store.activeProjectId)
    })
    return unsub
  }, [store])

  const views = {
    chat: <ChatView />,
    cowork: <CoworkView />,
    skills: <SkillsView />,
    dispatch: <DispatchView />,
    projects: <ProjectsView />,
  }

  return (
    <StoreContext.Provider value={store}>
      <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--bg-base)' }}>
        <Sidebar
          activeNav={activeNav}
          onNavChange={setActiveNav}
          onOpenSettings={() => setShowSettings(true)}
        />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {views[activeNav]}
        </main>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </StoreContext.Provider>
  )
}
