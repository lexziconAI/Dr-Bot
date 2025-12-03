import React, { useEffect, useState } from 'react'
import Login from '../ui/AuthLogin'
import Feed from '../ui/Feed'
import Profile from '../ui/Profile'
import Clinical from './Clinical'
import FractalResearchFramework from '../components/FractalResearchFramework'
import api from '../services/api'

export default function App(){
  const [user, setUser] = useState(null)
  const [view, setView] = useState('feed')

  useEffect(()=>{
    const token = localStorage.getItem('token')
    if(token){
      api.get('/auth/me').then(r=>{
        if(r.data && r.data.user) setUser(r.data.user)
      }).catch(()=>localStorage.removeItem('token'))
    }
  },[])

  const handleLogin = (user, token)=>{
    localStorage.setItem('token', token)
    setUser(user)
    setView('feed')
  }

  const handleLogout = ()=>{
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <div className="app-shell">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="logo-mark">Dr</div>
          <div className="brand-text">
            <h1>Dr. Bot</h1>
            <span>Community</span>
          </div>
        </div>

        <nav className="nav-menu">
          <a className={`nav-item ${view === 'feed' ? 'active' : ''}`} onClick={()=>setView('feed')}>
            <span>📰</span> Feed
          </a>
          <a className={`nav-item ${view === 'clinical' ? 'active' : ''}`} onClick={()=>setView('clinical')}>
            <span>🩺</span> Clinical AI
          </a>
          <a className={`nav-item ${view === 'fractal' ? 'active' : ''}`} onClick={()=>setView('fractal')}>
            <span>🔬</span> Research
          </a>
          {user && (
            <a className={`nav-item ${view === 'profile' ? 'active' : ''}`} onClick={()=>setView('profile')}>
              <span>👤</span> Profile
            </a>
          )}
        </nav>

        <div className="user-profile">
          {user ? (
            <>
              <div className="avatar">{user.username ? user.username[0].toUpperCase() : 'U'}</div>
              <div style={{flex:1, overflow:'hidden'}}>
                <div style={{fontSize:14, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{user.username}</div>
                <div style={{fontSize:11, cursor:'pointer', color:'var(--danger)'}} onClick={handleLogout}>Sign Out</div>
              </div>
            </>
          ) : (
            <button className="button" style={{width:'100%'}} onClick={()=>setView('login')}>Sign In</button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {!user && view === 'login' && (
          <div style={{maxWidth:400, margin:'0 auto'}}>
            <Login onLogin={handleLogin} />
          </div>
        )}
        
        {user && view === 'feed' && <Feed user={user} />}
        
        {view === 'clinical' && <Clinical user={user} setView={setView} />}
        
        {view === 'fractal' && <FractalResearchFramework />}

        {user && view === 'profile' && <Profile user={user} />}
        
        {!user && view !== 'login' && view !== 'clinical' && view !== 'fractal' && (
          <div className="hero">
            <h2>Welcome to Dr. Bot Community</h2>
            <p className="lead">Join a network of healthcare professionals powered by evidence-based AI clinical decision support. Access Socratic coaching, case analysis, and peer collaboration.</p>
            <div style={{marginTop:24, display:'flex', gap:12, flexWrap:'wrap'}}>
              <button className="button button-large" onClick={()=>setView('login')}>Sign in to continue</button>
              <button className="button button-large button-secondary" onClick={()=>setView('clinical')}>Explore Clinical AI</button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
