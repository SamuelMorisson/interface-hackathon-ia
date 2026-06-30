import { useState, useRef, useEffect } from 'react'
import './App.css'

const MODEL = 'techcorp-finance:latest'

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

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const chatRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  async function send(text) {
    const userText = (text || input).trim()
    if (!userText || loading) return

    setInput('')
    setLoading(true)

    const userMsg = { role: 'user', content: userText }
    const history = [...messages, userMsg]

    setMessages([...history, { role: 'assistant', content: '', streaming: true }])

    try {
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

      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: fullText },
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `Erreur de connexion. Vérifiez qu'Ollama est lancé. (${err.message})` },
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
        <div className="status">
          <div className="status-dot" />
          Phi-3.5 Financial · Online
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
        <p className="model-tag">techcorp-finance:latest · Ollama · localhost:11434</p>
      </footer>
    </div>
  )
}
