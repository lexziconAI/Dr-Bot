import React, { useEffect, useState } from 'react'
import api from '../services/api'

export default function Feed({ user }){
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')

  useEffect(()=>{
    load()
  },[])

  const load = async ()=>{
    try {
      const r = await api.get('/feed')
      setPosts(r.data.posts || [])
    } catch(e) {
      console.error(e)
    }
  }

  const submit = async (e)=>{
    e.preventDefault()
    if(!content.trim()) return
    try {
      const form = new FormData()
      form.append('content', content)
      await api.post('/posts', form)
      setContent('')
      load()
    } catch(e) {
      console.error(e)
    }
  }

  return (
    <div>
      <div className="card">
        <form onSubmit={submit}>
          <textarea 
            rows={3} 
            value={content} 
            onChange={e=>setContent(e.target.value)} 
            className="input" 
            placeholder={`What's on your mind, Dr. ${user.username || 'User'}?`}
            style={{resize:'none'}}
          ></textarea>
          <div style={{marginTop:12, textAlign:'right'}}>
            <button className="button" disabled={!content.trim()}>Post Update</button>
          </div>
        </form>
      </div>

      <div className="card" style={{padding:0, overflow:'hidden'}}>
        <div className="card-header" style={{margin:0, padding:'16px 24px', background:'rgba(0,0,0,0.2)'}}>
          <h3>Community Feed</h3>
        </div>
        <div>
          {posts.length === 0 && (
            <div style={{padding:32, textAlign:'center', color:'var(--text-muted)'}}>
              No posts yet. Be the first to share!
            </div>
          )}
          {posts.map(p=> (
            <div key={p.id} className="feed-item">
              <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  <div className="avatar" style={{width:24, height:24, fontSize:10}}>
                    {p.author?.name ? p.author.name[0] : 'U'}
                  </div>
                  <div>
                    <strong style={{color:'var(--text-main)'}}>{p.author?.name}</strong> 
                    <span className="small" style={{marginLeft:6}}>{p.author?.title}</span>
                  </div>
                </div>
                <div className="small">{new Date(p.createdAt).toLocaleDateString()}</div>
              </div>
              <div style={{color:'var(--text-dim)', lineHeight:1.6}}>{p.content}</div>
              <div style={{marginTop:12, display:'flex', gap:16}}>
                <span className="small" style={{cursor:'pointer', color:'var(--primary)'}}>♥ {p.likesCount || 0} Likes</span>
                <span className="small" style={{cursor:'pointer'}}>💬 Comment</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
