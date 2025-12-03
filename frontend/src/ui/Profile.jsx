import React, { useState, useEffect } from 'react'
import api from '../services/api'

export default function Profile({ user }){
  const [profile, setProfile] = useState(user)
  const [bio, setBio] = useState(user.bio || '')
  const [saving, setSaving] = useState(false)

  useEffect(()=>{
    async function load(){
      try {
        const r = await api.get(`/users/${user.id}`)
        if(r.data && r.data.user) {
          setProfile(r.data.user)
          setBio(r.data.user.bio||'')
        }
      } catch(e) {
        console.error(e)
      }
    }
    load()
  },[user.id])

  const save = async ()=>{
    setSaving(true)
    try {
      const r = await api.put('/users/profile', { bio })
      setProfile(r.data.user)
    } catch(e) {
      console.error(e)
    }
    setSaving(false)
  }

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-header">
          <h3>Profile Settings</h3>
        </div>
        
        <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:24}}>
          <div className="avatar" style={{width:64, height:64, fontSize:24, background:'var(--gradient-primary)'}}>
            {profile.username ? profile.username[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h4 style={{fontSize:18, color:'var(--text-main)'}}>{profile.name || profile.username}</h4>
            <div className="small" style={{color:'var(--primary)'}}>{profile.title || 'Medical Professional'}</div>
            <div className="small">{profile.specialty || 'General Practice'}</div>
          </div>
        </div>

        <div style={{marginBottom:16}}>
          <label className="small" style={{display:'block', marginBottom:6}}>Professional Bio</label>
          <textarea 
            rows={6} 
            className="input" 
            value={bio} 
            onChange={e=>setBio(e.target.value)} 
            placeholder="Share your medical background and interests..."
          />
        </div>
        
        <div style={{textAlign:'right'}}>
          <button className="button" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Credentials & Badges</h3>
        </div>
        
        {(!profile.credentials || profile.credentials.length === 0) && (
          <div style={{textAlign:'center', padding:24, color:'var(--text-muted)', border:'1px dashed var(--border)', borderRadius:'var(--radius-sm)'}}>
            No verified credentials yet.
          </div>
        )}
        
        <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
          {(profile.credentials || []).map((cid, i) => (
            <span key={i} className="badge success">
              ✓ {cid}
            </span>
          ))}
          <span className="badge primary">Dr. Bot Member</span>
        </div>

        <div style={{marginTop:32}}>
          <h4 style={{fontSize:14, marginBottom:12, color:'var(--text-muted)'}}>Account Status</h4>
          <div className="feed-item" style={{border:0, padding:0, paddingBottom:12}}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <span className="small">Member Since</span>
              <span className="small" style={{color:'var(--text-main)'}}>{new Date().getFullYear()}</span>
            </div>
          </div>
          <div className="feed-item" style={{border:0, padding:0}}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <span className="small">Verification Level</span>
              <span className="badge warning" style={{fontSize:10}}>Pending</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
