import React, { useState } from 'react'
import api from '../services/api'

export default function Login({ onLogin }){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  const submit = async (e)=>{
    e.preventDefault()
    try{
      const res = await api.post('/auth/login', { email, password })
      if(res.data && res.data.token){
        onLogin(res.data.user, res.data.token)
      }
    }catch(err){
      setError(err.response?.data?.error || err.message)
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3>Sign In</h3>
      </div>
      
      {error && (
        <div className="badge danger" style={{width:'100%', marginBottom:16, justifyContent:'center'}}>
          {error}
        </div>
      )}
      
      <form onSubmit={submit}>
        <div style={{marginBottom:16}}>
          <label className="small" style={{display:'block', marginBottom:6}}>Email Address</label>
          <input 
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            className="input" 
            placeholder="name@hospital.org" 
          />
        </div>
        <div style={{marginBottom:24}}>
          <label className="small" style={{display:'block', marginBottom:6}}>Password</label>
          <input 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            type="password" 
            className="input" 
            placeholder="••••••••" 
          />
        </div>
        <button className="button" style={{width:'100%'}}>Sign In</button>
      </form>
      
      <div style={{marginTop:24, padding:16, background:'rgba(255,255,255,0.03)', borderRadius:'var(--radius-sm)'}}>
        <div className="small" style={{fontWeight:600, marginBottom:4, color:'var(--text-main)'}}>Demo Access:</div>
        <div className="small" style={{fontFamily:'monospace'}}>User: dr.smith@drbot.health</div>
        <div className="small" style={{fontFamily:'monospace'}}>Pass: demo123</div>
      </div>
    </div>
  )
}
