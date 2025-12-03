import React, { useState } from 'react'
import api from '../services/api'

const DR_BOT_ENGINE_URL = 'http://localhost:15602'

export default function Clinical({ user, setView }){
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [jobState, setJobState] = useState(null)
  const [result, setResult] = useState(null)
  const [polling, setPolling] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b')

  const models = [
    { id: 'llama-3.3-70b', name: 'Llama 3.3 70B', provider: 'Groq', speed: 'Fast' },
    { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', speed: 'Balanced' },
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', speed: 'Balanced' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', speed: 'Deep' },
  ]

  const openSocraticCoach = () => {
    window.open(`${DR_BOT_ENGINE_URL}/socratic`, '_blank')
  }

  const loadCases = async () => {
    setLoading(true)
    try {
      const r = await api.get('/clinical/cases')
      setCases(r.data.cases || [])
    } catch(e) {
      console.error(e)
    }
    setLoading(false)
  }

  const submitQuery = async () => {
    if (!query.trim()) return
    if (!user) {
      alert('Please sign in to use the Clinical AI')
      return
    }
    
    setLoading(true)
    setResult(null)
    try {
      const payload = { 
        model: selectedModel, 
        messages: [{ role: 'user', content: query }] 
      }
      const resp = await api.post('/drbot/async/completion', payload)
      const id = resp.data?.jobId || resp.jobId
      setJobId(id)
      pollJob(id)
    } catch(e) {
      console.error(e)
      setResult({ error: e.message || 'Failed to submit query' })
    }
    setLoading(false)
  }

  const submitQuickSummary = async () => {
    if (!user) {
      alert('Please sign in to use the Clinical AI')
      return
    }
    
    setLoading(true)
    setResult(null)
    try {
      const payload = { 
        model: selectedModel, 
        messages: [{ 
          role: 'user', 
          content: 'Provide a clinical summary for: patient presenting with acute chest pain. Include differential diagnoses ranked by likelihood, key investigations to order, and red flags to watch for.' 
        }] 
      }
      const resp = await api.post('/drbot/async/completion', payload)
      const id = resp.data?.jobId || resp.jobId
      setJobId(id)
      pollJob(id)
    } catch(e) {
      console.error(e)
    }
    setLoading(false)
  }

  const pollJob = async (id) => {
    setJobState('processing')
    setPolling(true)
    const poll = async () => {
      try {
        const s = await api.get(`/sidecar/status/${id}`)
        const st = s.data.job?.state || s.job?.state
        setJobState(st)
        if (st === 'completed') {
          const val = s.data.job?.returnValue || s.job?.returnValue
          setResult(val)
          setPolling(false)
          return
        }
        if (st === 'failed') {
          setResult({ error: s.data?.job?.error || s.job?.error || 'Job failed' })
          setPolling(false)
          return
        }
      } catch(e) { 
        console.error(e)
        setPolling(false) 
      }
      setTimeout(poll, 2000)
    }
    poll()
  }

  const downloadBlob = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime || 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const downloadJSON = () => {
    if (!result) return
    downloadBlob(JSON.stringify(result, null, 2), `drbot-result-${jobId}.json`, 'application/json')
  }

  const downloadMarkdown = () => {
    if (!result) return
    const text = result?.result?.text || result?.text || result?.content || JSON.stringify(result, null, 2)
    const md = `# Dr. Bot Clinical Analysis\n\n**Job ID:** ${jobId}\n**Model:** ${selectedModel}\n**Date:** ${new Date().toISOString()}\n\n---\n\n${text}`
    downloadBlob(md, `drbot-result-${jobId}.md`, 'text/markdown')
  }

  const getResultText = () => {
    if (!result) return ''
    if (result.error) return `Error: ${result.error}`
    return result?.result?.text || result?.text || result?.content || JSON.stringify(result, null, 2)
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="hero">
        <h2>🩺 Clinical Decision Support</h2>
        <p className="lead">
          Access Dr. Bot's AI-powered clinical reasoning engine. Get evidence-based insights, differential diagnoses, and Socratic coaching for complex cases.
        </p>
        <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="button button-large" onClick={openSocraticCoach}>
            🧠 Open Socratic Coach
          </button>
          <a 
            href={`${DR_BOT_ENGINE_URL}/socratic`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="button button-large button-secondary"
          >
            🔗 Direct Link to Coach
          </a>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid-3" style={{marginBottom: 32}}>
        <div className="clinical-card" onClick={openSocraticCoach}>
          <div className="clinical-card-icon" style={{color:'var(--primary)'}}>🧠</div>
          <h4>Socratic Coaching</h4>
          <p>Interactive AI coaching that guides you through clinical reasoning with questions, not answers.</p>
          <span className="badge primary">Voice Enabled</span>
        </div>
        
        <div className="clinical-card" onClick={submitQuickSummary} style={{ cursor: user ? 'pointer' : 'not-allowed', opacity: user ? 1 : 0.6 }}>
          <div className="clinical-card-icon" style={{color:'var(--secondary)'}}>📋</div>
          <h4>Quick Clinical Summary</h4>
          <p>Generate a structured clinical summary with differentials and recommended investigations.</p>
          <span className="badge warning">Async Processing</span>
        </div>
        
        <div className="clinical-card" onClick={loadCases}>
          <div className="clinical-card-icon" style={{color:'var(--accent)'}}>📚</div>
          <h4>Case Library</h4>
          <p>Browse anonymized clinical cases for learning and reference. Explore bifurcation analyses.</p>
          <span className="badge success">Educational</span>
        </div>

        <div className="clinical-card" onClick={() => setView && setView('fractal')}>
          <div className="clinical-card-icon" style={{color:'#c084fc'}}>🔬</div>
          <h4>Fractal Research</h4>
          <p>Run LOG3/LOG4 bifurcation experiments on wicked problems using the Constitutional AI framework.</p>
          <span className="badge" style={{background:'rgba(192, 132, 252, 0.15)', color:'#c084fc'}}>Advanced</span>
        </div>
      </div>

      {/* Query Interface */}
      {user && (
        <div className="card">
          <div className="card-header">
            <h3>💬 Ask Dr. Bot</h3>
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              className="input"
              style={{ width: 'auto', minWidth: 180 }}
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.speed})</option>
              ))}
            </select>
          </div>
          
          <div style={{marginBottom: 16}}>
            <textarea 
              className="input"
              placeholder="Describe a clinical scenario, ask for differential diagnoses, or request a treatment plan analysis..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              style={{ resize: 'vertical', minHeight: 100 }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              className="button" 
              onClick={submitQuery} 
              disabled={loading || !query.trim()}
            >
              {loading ? <span className="spinner"></span> : '🚀'} Submit Query
            </button>
            <button 
              className="button button-secondary" 
              onClick={() => setQuery('')}
              disabled={!query}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {!user && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <h3>🔒 Sign in Required</h3>
          <p className="text-muted" style={{ marginTop: 8 }}>Please sign in to submit clinical queries. You can still access the Socratic Coach above.</p>
        </div>
      )}

      {/* Job Status */}
      {jobId && (
        <div className="card">
          <div className="card-header">
            <div style={{display:'flex', alignItems:'center', gap:12}}>
              <strong>Job #{jobId}</strong>
              <span className={`badge ${jobState === 'completed' ? 'success' : jobState === 'failed' ? 'danger' : 'warning'}`}>
                {jobState === 'completed' ? '✓ Completed' : 
                 jobState === 'failed' ? '✗ Failed' : 
                 '⟳ Processing...'}
              </span>
            </div>
            {polling && <span className="text-muted">Updating...</span>}
          </div>
          
          {result && (
            <div>
              <div style={{background:'rgba(0,0,0,0.2)', padding:16, borderRadius:8, marginBottom:16, whiteSpace:'pre-wrap', fontFamily:'monospace', fontSize:13}}>
                {getResultText()}
              </div>
              
              {!result.error && (
                <div style={{display:'flex', gap:12}}>
                  <button className="button button-secondary" onClick={downloadJSON}>
                    📥 Download JSON
                  </button>
                  <button className="button button-secondary" onClick={downloadMarkdown}>
                    📝 Download Markdown
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Case Library */}
      {cases.length > 0 && (
        <div className="card">
          <h3>📚 Case Library</h3>
          <div style={{marginTop:16, display:'flex', flexDirection:'column', gap:12}}>
            {cases.map(c => (
              <div key={c.id} style={{padding:12, background:'rgba(255,255,255,0.05)', borderRadius:8}}>
                <strong>{c.title || c.id}</strong>
                <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{c.createdAt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="card" style={{ marginTop: 24, background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)' }}>
        <h4>🔗 Engine Diagnostics</h4>
        <p className="text-muted" style={{ marginBottom: 12, fontSize: 13 }}>
          Advanced users can access the underlying engine status. Note: The engine root may display "Kea V4" (Voice Module) - this is normal.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
          <a href={`${DR_BOT_ENGINE_URL}/`} target="_blank" rel="noopener noreferrer" className="text-primary">Engine Status</a>
          <span className="text-muted">•</span>
          <a href={`${DR_BOT_ENGINE_URL}/api/models/limits`} target="_blank" rel="noopener noreferrer" className="text-primary">Model Limits</a>
        </div>
      </div>
    </div>
  )
}
