import { useState } from 'react'
import './App.css'
import ChatPage from './pages/ChatPage.jsx'
import AdminLoginPage from './pages/AdminLoginPage.jsx'

function App() {
  const [activeView, setActiveView] = useState('chat')

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">RAG Chatbot</p>
          <h1>Document assistant</h1>
        </div>

        <nav className="app-nav" aria-label="Primary">
          <button
            type="button"
            className={activeView === 'chat' ? 'active' : ''}
            onClick={() => setActiveView('chat')}
          >
            Chat
          </button>
          <button
            type="button"
            className={activeView === 'admin' ? 'active' : ''}
            onClick={() => setActiveView('admin')}
          >
            Admin
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeView === 'chat' ? <ChatPage /> : <AdminLoginPage />}
      </main>
    </div>
  )
}

export default App
