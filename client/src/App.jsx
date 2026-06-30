import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'

const MODEL = 'techcorp-finance:latest'

const BACKENDS = {
  ollama: { label: 'Ollama', port: '11434' },
  triton: { label: 'Triton', port: '8000' },
}

const SUGGESTIONS = [
  "Qu'est-ce que le ROI ?",
  "Explique-moi les obligations",
  "Analyse de bilan comptable",
  "Stratégies de trading",
]

function Typing() {
  return (
    <div className="typing">
      <span /><span /><span />
    </div>
  )
}

function Message({ role, content, streaming }) {
  return (
    <div className={`message ${role}`}>
      <div className="avatar">{role === 'user' ? 'U' : 'AI'}</div>
      <div className="bubble">
        {streaming && !content ? <Typing /> : content}
      </div>
    </div>
  )
}

function StatusDot({ online }) {
  return <span className={`dot ${online ? 'online' : 'offline'}`} />
}

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [backend, setBackend] = useState('ollama')
  const [status, setStatus] = useState({ ollama: false, triton: false })
  const chatRef = useRef(null)
  const inputRef = useRef(null)

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status')
      const data = await res.json()
      setStatus(data)
    } catch {}
  }, [])

  useEffect(() => {
    checkStatus()
    const interval = setInterval(checkStatus, 10000)
    return () => clearInterval(interval)
  }, [checkStatus])

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  async function sendOllama(history) {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: history }),
    })

    if (!res.ok) throw new Error(`Erreur serveur ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const lines = decoder.decode(value, { stream: true }).split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const data = JSON.parse(line)
          if (data.message?.content) {
            fullText += data.message.content
            setMessages(prev => [
              ...prev.slice(0, -1),
              { role: 'assistant', content: fullText, streaming: true },
            ])
          }
        } catch {}
      }
    }

    return fullText
  }

  async function sendTriton(history) {
    const lastMessage = history[history.length - 1].content
    const res = await fetch('/api/triton', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: lastMessage }),
    })

    if (!res.ok) throw new Error(`Erreur Triton ${res.status}`)
    const data = await res.json()
    return data.text
  }

  async function send(text) {
    const userText = (text || input).trim()
    if (!userText || loading) return

    setInput('')
    setLoading(true)

    const userMsg = { role: 'user', content: userText }
    const history = [...messages, userMsg]

    setMessages([...history, { role: 'assistant', content: '', streaming: true }])

    try {
      const fullText = backend === 'ollama'
        ? await sendOllama(history)
        : await sendTriton(history)

      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: fullText },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `Erreur de connexion au backend ${BACKENDS[backend].label}. (${err.message})` },
      ])
    }

    setLoading(false)
    inputRef.current?.focus()
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="logo">TC</div>
        <div>
          <h1 className="header-title">TechCorp AI <span>Financial Assistant</span></h1>
        </div>

        <div className="header-right">
          <div className="status-badges">
            <span className="badge">
              <StatusDot online={status.ollama} />
              Ollama
            </span>
            <span className="badge">
              <StatusDot online={status.triton} />
              Triton
            </span>
          </div>

          <div className="backend-selector">
            {Object.entries(BACKENDS).map(([key, val]) => (
              <button
                key={key}
                className={`backend-btn ${backend === key ? 'active' : ''} ${!status[key] ? 'disabled' : ''}`}
                onClick={() => setBackend(key)}
              >
                {val.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="chat" ref={chatRef}>
        {messages.length === 0 ? (
          <div className="welcome">
            <h2>Bonjour, je suis votre assistant financier</h2>
            <p>Posez-moi vos questions sur la finance, les investissements ou la comptabilité.</p>
            <div className="suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} className="suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <Message key={i} role={msg.role} content={msg.content} streaming={msg.streaming} />
          ))
        )}
      </main>

      <footer className="footer">
        <div className="input-row">
          <textarea
            ref={inputRef}
            className="input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Posez votre question financière…"
            disabled={loading}
            rows={1}
          />
          <button className="send-btn" onClick={() => send()} disabled={loading || !input.trim()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="model-tag">
          {BACKENDS[backend].label} · port {BACKENDS[backend].port} · {MODEL}
        </p>
      </footer>
    </div>
  )
}
