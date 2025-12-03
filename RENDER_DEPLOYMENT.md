# 🚀 DrBotCommunity Render Deployment Guide

## Quick Deploy

### Option 1: One-Click Deploy (Blueprint)
1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **"New" → "Blueprint"**
4. Connect your GitHub repo: `lexziconAI/ckicas-drought-monitor`
5. Set root directory: `axiom-x/DrBotCommunity`
6. Click **"Apply"** - Render will deploy all services automatically!

### Option 2: Manual Deploy

#### Backend API
1. **New Web Service**
   - Name: `drbot-community-backend`
   - Runtime: **Node**
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && node server.js`
   - Port: `4700`

2. **Environment Variables** (Add in Render dashboard):
   ```
   NODE_ENV=production
   JWT_SECRET=<auto-generate>
   REDIS_URL=<from Redis service>
   SIDECAR_URL=https://drbot-sidecar.onrender.com
   MRBOT_URL=https://drbot-engine.onrender.com
   ```

3. **Health Check**: `/api/health`

#### Frontend (Static Site)
1. **New Static Site**
   - Name: `drbot-community-frontend`
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`

2. **Environment Variables**:
   ```
   VITE_API_URL=https://drbot-community-backend.onrender.com
   ```

3. **Rewrite Rules** (for React Router):
   - Source: `/*`
   - Destination: `/index.html`

#### Redis (Optional - for job queue)
1. **New Redis Instance**
   - Name: `drbot-redis`
   - Plan: **Starter** (free)
   - Copy connection string to backend `REDIS_URL`

---

## 📋 Pre-Deployment Checklist

### 1. Update API Base URL in Frontend
The frontend needs to know where the backend is. Update `src/services/api.js`:

```javascript
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4700/api',
  timeout: 20000
})
```

### 2. Add Health Check Endpoint
Make sure backend has `/api/health`:

```javascript
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});
```

### 3. Configure CORS for Production
Update backend CORS to allow Render frontend:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
```

### 4. Set Node Version (optional)
Create `backend/.node-version`:
```
20.11.0
```

---

## 🔧 Post-Deployment Configuration

### Link Services
1. **Frontend → Backend**: Set `VITE_API_URL` to backend URL
2. **Backend → Redis**: Set `REDIS_URL` from Redis service
3. **Backend → Sidecar**: Set `SIDECAR_URL` if sidecar is deployed

### Custom Domain (Optional)
1. Go to service settings
2. Add custom domain: `community.drbot.com`
3. Update DNS records as shown

---

## 📊 Monitoring

### Health Checks
- Backend: `https://drbot-community-backend.onrender.com/api/health`
- Frontend: Check main page loads

### Logs
- View real-time logs in Render dashboard
- Set up log drains for external monitoring

### Metrics
- Response times
- Error rates
- Memory usage
- CPU usage

---

## 🐛 Troubleshooting

### Backend Won't Start
- Check build logs for npm install errors
- Verify all required env vars are set
- Check Node version compatibility

### Frontend Shows Blank Page
- Verify build completed successfully
- Check rewrite rules are configured
- Verify `VITE_API_URL` is correct

### "Network Error" in Frontend
- Backend might be sleeping (free tier)
- Check CORS configuration
- Verify API URL is correct

### Redis Connection Issues
- Verify `REDIS_URL` format is correct
- Check IP allowlist settings
- Try internal connection string

---

## 💰 Cost Estimates

### Free Tier
- **Backend**: Free (750 hrs/month, sleeps after 15 min inactivity)
- **Frontend**: Free (100 GB bandwidth/month)
- **Redis**: $7/month (Starter plan)

### Paid Tier (Recommended for Production)
- **Backend**: $7/month (always-on, no sleep)
- **Frontend**: Free
- **Redis**: $7/month
- **Total**: ~$14/month

---

## 🚀 Benefits of Render

### Stability
✅ 99.9% uptime SLA (paid tiers)
✅ Auto-restart on crashes
✅ Health check monitoring
✅ DDoS protection

### Developer Experience
✅ Auto-deploy on git push
✅ Pull request previews
✅ Easy rollbacks
✅ Zero-downtime deploys

### Scalability
✅ Auto-scaling available
✅ Load balancing
✅ CDN for static assets
✅ Global edge network

---

## 📝 Alternative: Keep Backend Local, Deploy Frontend Only

If you want to keep the backend running locally but deploy the frontend:

1. **Deploy frontend to Render** (static site)
2. **Use ngrok for backend**:
   ```bash
   ngrok http 4700
   ```
3. **Set frontend `VITE_API_URL`** to ngrok URL
4. **Pros**: Free, backend stays on your machine
5. **Cons**: Backend stops when your computer sleeps

---

## 🎯 Next Steps

1. ✅ Push code to GitHub
2. ✅ Create Render account
3. ✅ Deploy using Blueprint (automatic)
4. ✅ Configure environment variables
5. ✅ Test deployed services
6. ✅ Set up custom domain (optional)
7. ✅ Monitor logs and metrics

**Your DrBotCommunity will be live at**:
- Backend: `https://drbot-community-backend.onrender.com`
- Frontend: `https://drbot-community-frontend.onrender.com`

**No more dropped connections!** 🎉
