// DrBoT Community Platform - Main Backend Server
// Healthcare Professional Social Network with AI Clinical Support

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 4700;
const JWT_SECRET = process.env.JWT_SECRET || 'drbot-community-secret-2025';
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MRBOT_URL = (process.env.MRBOT_URL || process.env.DRBOT_ENGINE_URL || 'http://localhost:15602').replace(/\/$/, '');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type || 'general';
    const dir = path.join(UPLOADS_DIR, type);
    fs.mkdir(dir, { recursive: true }).then(() => cb(null, dir));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

// ============================================================
// IN-MEMORY DATABASE (Replace with PostgreSQL in production)
// ============================================================
const db = {
  users: new Map(),
  posts: new Map(),
  articles: new Map(),
  comments: new Map(),
  connections: new Map(), // friendships
  messages: new Map(),
  credentials: new Map(),
  notifications: new Map(),
  clinicalCases: new Map(),
  sessions: new Map()
};

// Demo users for testing
const initDemoData = async () => {
  const demoUsers = [
    {
      id: 'user-demo-1',
      email: 'dr.smith@drbot.health',
      password: await bcrypt.hash('demo123', 10),
      name: 'Dr. Sarah Smith',
      avatar: null,
      specialty: 'General Practice',
      title: 'GP',
      bio: 'Passionate about AI in healthcare. 15 years experience in family medicine.',
      location: 'Auckland, NZ',
      credentials: [],
      verified: true,
      membershipTier: 'pro',
      connections: [],
      createdAt: new Date().toISOString()
    },
    {
      id: 'user-demo-2',
      email: 'dr.jones@drbot.health',
      password: await bcrypt.hash('demo123', 10),
      name: 'Dr. Michael Jones',
      avatar: null,
      specialty: 'Dentistry',
      title: 'BDS, FRACDS',
      bio: 'Dental surgeon with special interest in digital workflows and AI scribes.',
      location: 'Wellington, NZ',
      credentials: [],
      verified: true,
      membershipTier: 'pro',
      connections: [],
      createdAt: new Date().toISOString()
    }
  ];

  for (const user of demoUsers) {
    db.users.set(user.id, user);
  }

  // Demo posts
  const demoPosts = [
    {
      id: 'post-demo-1',
      authorId: 'user-demo-1',
      content: '🤖 Just tried the new AI scribe feature for my clinic notes. Saved 20 minutes per patient! Game changer for reducing admin burden. #AIinHealthcare #DrBoT',
      media: [],
      likes: ['user-demo-2'],
      comments: [],
      shares: 0,
      visibility: 'public',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'post-demo-2',
      authorId: 'user-demo-2',
      content: 'Interesting ethical dilemma today: Teen patient wanting extensive cosmetic work. Used the bifurcation analysis to explore different approaches. The AI highlighted considerations I hadn\'t fully thought through. Anyone else using it for complex cases?',
      media: [],
      likes: ['user-demo-1'],
      comments: [],
      shares: 2,
      visibility: 'public',
      createdAt: new Date(Date.now() - 7200000).toISOString()
    }
  ];

  for (const post of demoPosts) {
    db.posts.set(post.id, post);
  }

  console.log('📊 Demo data initialized');
};

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = db.users.get(decoded.userId);
    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = db.users.get(decoded.userId);
    } catch (err) {
      // Ignore invalid token
    }
  }
  next();
};

// ============================================================
// AUTH ROUTES
// ============================================================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, specialty, title } = req.body;

    // Check if email exists
    for (const [, user] of db.users) {
      if (user.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = `user-${uuidv4()}`;

    const user = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      avatar: null,
      specialty: specialty || '',
      title: title || '',
      bio: '',
      location: '',
      credentials: [],
      verified: false,
      membershipTier: 'free',
      connections: [],
      createdAt: new Date().toISOString()
    };

    db.users.set(userId, user);

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    let foundUser = null;
    for (const [, user] of db.users) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, foundUser.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: foundUser.id }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...safeUser } = foundUser;
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json({ success: true, user: safeUser });
});

// ============================================================
// USER ROUTES
// ============================================================

// Get user profile
app.get('/api/users/:userId', optionalAuth, (req, res) => {
  const user = db.users.get(req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { password: _, ...safeUser } = user;
  
  // Add connection status if authenticated
  if (req.user) {
    safeUser.isConnected = req.user.connections.includes(user.id);
    safeUser.isOwnProfile = req.user.id === user.id;
  }

  res.json({ success: true, user: safeUser });
});

// Update profile
app.put('/api/users/profile', authMiddleware, (req, res) => {
  const { name, specialty, title, bio, location } = req.body;

  const user = req.user;
  if (name) user.name = name;
  if (specialty) user.specialty = specialty;
  if (title) user.title = title;
  if (bio !== undefined) user.bio = bio;
  if (location !== undefined) user.location = location;

  db.users.set(user.id, user);

  const { password: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// Upload avatar
app.post('/api/users/avatar', authMiddleware, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const user = req.user;
  user.avatar = `/uploads/general/${req.file.filename}`;
  db.users.set(user.id, user);

  res.json({ success: true, avatar: user.avatar });
});

// ============================================================
// CREDENTIALS ROUTES
// ============================================================

// Upload credential
app.post('/api/credentials', authMiddleware, upload.single('document'), async (req, res) => {
  try {
    const { type, title, issuer, issueDate, expiryDate } = req.body;

    const credentialId = `cred-${uuidv4()}`;
    const credential = {
      id: credentialId,
      userId: req.user.id,
      type, // degree, license, certification, membership
      title,
      issuer,
      issueDate,
      expiryDate: expiryDate || null,
      documentUrl: req.file ? `/uploads/general/${req.file.filename}` : null,
      verificationStatus: 'pending', // pending, verified, rejected
      createdAt: new Date().toISOString()
    };

    db.credentials.set(credentialId, credential);

    // Add to user's credentials
    req.user.credentials.push(credentialId);
    db.users.set(req.user.id, req.user);

    res.json({ success: true, credential });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user credentials
app.get('/api/credentials', authMiddleware, (req, res) => {
  const userCredentials = [];
  for (const credId of req.user.credentials) {
    const cred = db.credentials.get(credId);
    if (cred) userCredentials.push(cred);
  }
  res.json({ success: true, credentials: userCredentials });
});

// ============================================================
// POSTS ROUTES
// ============================================================

// Create post
app.post('/api/posts', authMiddleware, upload.array('media', 4), (req, res) => {
  try {
    const { content, visibility = 'public' } = req.body;

    const postId = `post-${uuidv4()}`;
    const media = req.files ? req.files.map(f => `/uploads/general/${f.filename}`) : [];

    const post = {
      id: postId,
      authorId: req.user.id,
      content,
      media,
      likes: [],
      comments: [],
      shares: 0,
      visibility,
      createdAt: new Date().toISOString()
    };

    db.posts.set(postId, post);
    res.json({ success: true, post: enrichPost(post) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get feed
app.get('/api/feed', optionalAuth, (req, res) => {
  const posts = [];
  for (const [, post] of db.posts) {
    if (post.visibility === 'public') {
      posts.push(enrichPost(post));
    }
  }

  // Sort by date descending
  posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, posts: posts.slice(0, 50) });
});

// Get single post
app.get('/api/posts/:postId', optionalAuth, (req, res) => {
  const post = db.posts.get(req.params.postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  res.json({ success: true, post: enrichPost(post) });
});

// Like/unlike post
app.post('/api/posts/:postId/like', authMiddleware, (req, res) => {
  const post = db.posts.get(req.params.postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const userId = req.user.id;
  const likeIndex = post.likes.indexOf(userId);

  if (likeIndex === -1) {
    post.likes.push(userId);
  } else {
    post.likes.splice(likeIndex, 1);
  }

  db.posts.set(post.id, post);
  res.json({ success: true, liked: likeIndex === -1, likesCount: post.likes.length });
});

// Comment on post
app.post('/api/posts/:postId/comments', authMiddleware, (req, res) => {
  const post = db.posts.get(req.params.postId);
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }

  const commentId = `comment-${uuidv4()}`;
  const comment = {
    id: commentId,
    postId: post.id,
    authorId: req.user.id,
    content: req.body.content,
    likes: [],
    createdAt: new Date().toISOString()
  };

  db.comments.set(commentId, comment);
  post.comments.push(commentId);
  db.posts.set(post.id, post);

  res.json({ success: true, comment: enrichComment(comment) });
});

// Helper to enrich post with author info
function enrichPost(post) {
  const author = db.users.get(post.authorId);
  const comments = post.comments.map(cId => {
    const c = db.comments.get(cId);
    return c ? enrichComment(c) : null;
  }).filter(Boolean);

  return {
    ...post,
    author: author ? {
      id: author.id,
      name: author.name,
      avatar: author.avatar,
      title: author.title,
      specialty: author.specialty,
      verified: author.verified
    } : null,
    comments,
    likesCount: post.likes.length,
    commentsCount: comments.length
  };
}

function enrichComment(comment) {
  const author = db.users.get(comment.authorId);
  return {
    ...comment,
    author: author ? {
      id: author.id,
      name: author.name,
      avatar: author.avatar,
      title: author.title,
      verified: author.verified
    } : null
  };
}

// ============================================================
// ARTICLES ROUTES
// ============================================================

// Create article
app.post('/api/articles', authMiddleware, (req, res) => {
  try {
    const { title, content, tags, category, coverImage } = req.body;

    const articleId = `article-${uuidv4()}`;
    const article = {
      id: articleId,
      authorId: req.user.id,
      title,
      content,
      tags: tags || [],
      category: category || 'General',
      coverImage: coverImage || null,
      published: true,
      featured: false,
      views: 0,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.articles.set(articleId, article);
    res.json({ success: true, article: enrichArticle(article) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get articles
app.get('/api/articles', optionalAuth, (req, res) => {
  const articles = [];
  for (const [, article] of db.articles) {
    if (article.published) {
      articles.push(enrichArticle(article));
    }
  }

  articles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, articles: articles.slice(0, 20) });
});

// Get single article
app.get('/api/articles/:articleId', optionalAuth, (req, res) => {
  const article = db.articles.get(req.params.articleId);
  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  // Increment views
  article.views++;
  db.articles.set(article.id, article);

  res.json({ success: true, article: enrichArticle(article) });
});

function enrichArticle(article) {
  const author = db.users.get(article.authorId);
  return {
    ...article,
    author: author ? {
      id: author.id,
      name: author.name,
      avatar: author.avatar,
      title: author.title,
      specialty: author.specialty,
      verified: author.verified
    } : null,
    likesCount: article.likes.length,
    commentsCount: article.comments.length
  };
}

// ============================================================
// CONNECTIONS (FRIENDS) ROUTES
// ============================================================

// Send connection request
app.post('/api/connections/request', authMiddleware, (req, res) => {
  const { targetUserId } = req.body;

  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: 'Cannot connect with yourself' });
  }

  const targetUser = db.users.get(targetUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const connectionId = `conn-${uuidv4()}`;
  const connection = {
    id: connectionId,
    requesterId: req.user.id,
    targetId: targetUserId,
    status: 'pending', // pending, accepted, rejected
    createdAt: new Date().toISOString()
  };

  db.connections.set(connectionId, connection);

  // Create notification
  createNotification(targetUserId, 'connection_request', {
    from: req.user.id,
    connectionId
  });

  res.json({ success: true, connection });
});

// Accept/reject connection
app.post('/api/connections/:connectionId/respond', authMiddleware, (req, res) => {
  const { accept } = req.body;
  const connection = db.connections.get(req.params.connectionId);

  if (!connection) {
    return res.status(404).json({ error: 'Connection request not found' });
  }

  if (connection.targetId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (accept) {
    connection.status = 'accepted';

    // Add to both users' connections
    const requester = db.users.get(connection.requesterId);
    if (requester) {
      requester.connections.push(req.user.id);
      db.users.set(requester.id, requester);
    }
    req.user.connections.push(connection.requesterId);
    db.users.set(req.user.id, req.user);

    // Notify requester
    createNotification(connection.requesterId, 'connection_accepted', {
      from: req.user.id
    });
  } else {
    connection.status = 'rejected';
  }

  db.connections.set(connection.id, connection);
  res.json({ success: true, connection });
});

// Get connections
app.get('/api/connections', authMiddleware, (req, res) => {
  const connections = req.user.connections.map(userId => {
    const user = db.users.get(userId);
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      title: user.title,
      specialty: user.specialty,
      verified: user.verified
    };
  }).filter(Boolean);

  res.json({ success: true, connections });
});

// Get pending requests
app.get('/api/connections/pending', authMiddleware, (req, res) => {
  const pending = [];
  for (const [, conn] of db.connections) {
    if (conn.targetId === req.user.id && conn.status === 'pending') {
      const requester = db.users.get(conn.requesterId);
      if (requester) {
        pending.push({
          connectionId: conn.id,
          user: {
            id: requester.id,
            name: requester.name,
            avatar: requester.avatar,
            title: requester.title,
            specialty: requester.specialty
          },
          createdAt: conn.createdAt
        });
      }
    }
  }
  res.json({ success: true, pending });
});

// ============================================================
// MESSAGING ROUTES
// ============================================================

// Send message
app.post('/api/messages', authMiddleware, (req, res) => {
  const { recipientId, content } = req.body;

  const recipient = db.users.get(recipientId);
  if (!recipient) {
    return res.status(404).json({ error: 'Recipient not found' });
  }

  const messageId = `msg-${uuidv4()}`;
  const message = {
    id: messageId,
    senderId: req.user.id,
    recipientId,
    content,
    readAt: null,
    createdAt: new Date().toISOString()
  };

  db.messages.set(messageId, message);

  // Real-time notification via Socket.io
  io.to(`user-${recipientId}`).emit('new_message', enrichMessage(message));

  res.json({ success: true, message: enrichMessage(message) });
});

// Get conversation
app.get('/api/messages/:userId', authMiddleware, (req, res) => {
  const messages = [];
  for (const [, msg] of db.messages) {
    if (
      (msg.senderId === req.user.id && msg.recipientId === req.params.userId) ||
      (msg.senderId === req.params.userId && msg.recipientId === req.user.id)
    ) {
      messages.push(enrichMessage(msg));
    }
  }

  messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  res.json({ success: true, messages });
});

// Get conversations list
app.get('/api/conversations', authMiddleware, (req, res) => {
  const conversations = new Map();

  for (const [, msg] of db.messages) {
    if (msg.senderId === req.user.id || msg.recipientId === req.user.id) {
      const otherId = msg.senderId === req.user.id ? msg.recipientId : msg.senderId;
      const existing = conversations.get(otherId);

      if (!existing || new Date(msg.createdAt) > new Date(existing.lastMessage.createdAt)) {
        const otherUser = db.users.get(otherId);
        if (otherUser) {
          conversations.set(otherId, {
            user: {
              id: otherUser.id,
              name: otherUser.name,
              avatar: otherUser.avatar,
              title: otherUser.title
            },
            lastMessage: msg,
            unread: msg.recipientId === req.user.id && !msg.readAt
          });
        }
      }
    }
  }

  res.json({ success: true, conversations: Array.from(conversations.values()) });
});

function enrichMessage(msg) {
  const sender = db.users.get(msg.senderId);
  return {
    ...msg,
    sender: sender ? {
      id: sender.id,
      name: sender.name,
      avatar: sender.avatar
    } : null
  };
}

// ============================================================
// NOTIFICATIONS
// ============================================================

function createNotification(userId, type, data) {
  const notifId = `notif-${uuidv4()}`;
  const notification = {
    id: notifId,
    userId,
    type,
    data,
    read: false,
    createdAt: new Date().toISOString()
  };

  db.notifications.set(notifId, notification);
  io.to(`user-${userId}`).emit('notification', notification);
}

app.get('/api/notifications', authMiddleware, (req, res) => {
  const notifications = [];
  for (const [, notif] of db.notifications) {
    if (notif.userId === req.user.id) {
      notifications.push(notif);
    }
  }

  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, notifications: notifications.slice(0, 50) });
});

// ============================================================
// CLINICAL CASES (LOG 3 & 4 Integration)
// ============================================================

// Get clinical cases
app.get('/api/clinical/cases', optionalAuth, (req, res) => {
  const cases = [];
  for (const [, c] of db.clinicalCases) {
    cases.push(c);
  }
  cases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, cases });
});

// ============================================================
// SIDECAR / JOB QUEUE (supports Redis/BullMQ or HTTP sidecar)
// ============================================================
const REDIS_URL = process.env.REDIS_URL || null;
let completionQueue = null;
if (REDIS_URL) {
  try {
    const { Queue } = require('bullmq');
    const IORedis = require('ioredis');
    const connection = new IORedis(REDIS_URL);
    completionQueue = new Queue('completion', { connection });
    console.log('🔁 Using Redis queue for sidecar at', REDIS_URL);
  } catch (err) {
    console.warn('⚠️  Failed to init Redis queue:', err.message);
    completionQueue = null;
  }
}

const SIDECAR_URL = process.env.SIDECAR_URL || 'http://localhost:4800';

// Submit a job to the sidecar (requires auth).
// If Redis is configured, enqueue directly; otherwise proxy to HTTP sidecar.
app.post('/api/sidecar/submit', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    body.meta = body.meta || {};
    body.meta.requester = req.user.id;

    if (completionQueue) {
      const job = await completionQueue.add('completion', body.payload || body, { removeOnComplete: 1000, removeOnFail: 1000 });
      return res.json({ success: true, jobId: job.id });
    }

    // Fallback to HTTP sidecar
    const resp = await axios.post(`${SIDECAR_URL}/enqueue`, body);
    const data = resp.data;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Sidecar unavailable', details: err.message });
  }
});

// Check job status
app.get('/api/sidecar/status/:id', authMiddleware, async (req, res) => {
  try {
    const jobId = req.params.id;
    
    // Handle mock jobs (when sidecar is unavailable)
    if (jobId.startsWith('mock-')) {
      return res.json({ 
        success: true, 
        job: { 
          id: jobId, 
          state: 'completed', 
          returnValue: { message: 'Mock job completed (sidecar unavailable)' },
          finishedOn: Date.now()
        } 
      });
    }
    
    if (completionQueue) {
      const job = await completionQueue.getJob(jobId);
      if (!job) return res.status(404).json({ error: 'Job not found' });
      const state = await job.getState();
      const returnValue = state === 'completed' ? await job.returnvalue : null;
      return res.json({ success: true, job: { id: job.id, state, returnValue, finishedOn: job.finishedOn, processedOn: job.processedOn } });
    }

    // Fallback to HTTP sidecar
    try {
      const resp = await axios.get(`${SIDECAR_URL}/jobs/${encodeURIComponent(jobId)}`);
      res.json(resp.data);
    } catch (sidecarErr) {
      return res.status(404).json({ error: 'Job not found or sidecar unavailable' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Sidecar unavailable', details: err.message });
  }
});

// List recent jobs (admin/debug)
app.get('/api/sidecar/jobs', authMiddleware, async (req, res) => {
  try {
    if (completionQueue) {
      // BullMQ doesn't provide a simple list API; query recent by range from Redis
      // For prototype, return not-supported
      return res.json({ success: true, message: 'Use Redis/BullMQ admin tools to view jobs' });
    }

    const resp = await fetch(`${SIDECAR_URL}/jobs`);
    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(502).json({ error: 'Sidecar error', details: txt });
    }
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Sidecar unavailable', details: err.message });
  }
});

// ============================================================
// FRACTAL RESEARCH FRAMEWORK ROUTES
// ============================================================

// Helper functions for parsing LLM output
function extractConclusion(text) {
  const match = text.match(/DECISION:\s*(.+)$/i);
  return match ? match[1].trim() : 'Unknown';
}

function extractYamaScores(text) {
  const scores = {};
  const principles = ['Ahimsa', 'Satya', 'Asteya', 'Brahmacharya', 'Aparigraha'];
  let total = 0;
  let count = 0;
  
  principles.forEach(p => {
    const regex = new RegExp(`${p}:\\s*([0-9.]+)`, 'i');
    const match = text.match(regex);
    if (match) {
      const val = parseFloat(match[1]);
      scores[p.toLowerCase()] = val;
      total += val;
      count++;
    }
  });
  
  return {
    ...scores,
    composite: count > 0 ? total / count : 0
  };
}

// Proxy to Engine for synchronous completion (Fractal Mode)
app.post('/api/fractal/completion', async (req, res) => {
  try {
    const { prompt, model, pathId, dimension } = req.body;
    const start = Date.now();
    
    // Construct payload for engine
    const enginePayload = {
      model: model || 'llama-3.3-70b',
      prompt: prompt,
      pathId: pathId,
      dimension: dimension,
      stream: false
    };

    const resp = await fetch(`${MRBOT_URL}/api/completion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enginePayload)
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      return res.status(resp.status).json({ success: false, error: errorText });
    }

    const data = await resp.json();
    const text = data.text || data.content || JSON.stringify(data);
    
    res.json({
      success: true,
      result: {
        text: text,
        latency: Date.now() - start,
        wordCount: text.split(/\s+/).length,
        conclusion: extractConclusion(text),
        yamaScores: extractYamaScores(text),
        proof: { hash: `sha256-${Math.random().toString(36).substring(2)}` } // Mock proof
      }
    });

  } catch (err) {
    console.error('Fractal Proxy Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save experiment results
app.post('/api/fractal/experiments', async (req, res) => {
  try {
    const experiment = req.body;
    const filename = `${experiment.experimentId}.json`;
    const filepath = path.join(DATA_DIR, 'experiments', filename);
    
    await fs.mkdir(path.join(DATA_DIR, 'experiments'), { recursive: true });
    await fs.writeFile(filepath, JSON.stringify(experiment, null, 2));
    
    res.json({ success: true, id: experiment.experimentId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Proxy for Report Generation (Claude Skill)
app.post('/api/report', async (req, res) => {
  try {
    const { results, model } = req.body;
    
    const resp = await fetch(`${MRBOT_URL}/api/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results, model })
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      return res.status(resp.status).json({ success: false, error: errorText });
    }

    const data = await resp.json();
    res.json(data);
  } catch (err) {
    console.error('Report Proxy Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Async completion submit helper (enqueue to sidecar)
// NOTE: This MUST be defined BEFORE the wildcard /api/drbot/* route
app.post('/api/drbot/async/completion', authMiddleware, async (req, res) => {
  try {
    const jobPayload = {
      type: 'completion',
      payload: req.body || {}
    };

    // Attach meta for auditing
    jobPayload.payload.meta = jobPayload.payload.meta || {};
    jobPayload.payload.meta.requester = req.user.id;
    if (completionQueue) {
      const job = await completionQueue.add('completion', jobPayload.payload, { removeOnComplete: 1000, removeOnFail: 1000 });
      return res.json({ success: true, jobId: job.id });
    }

    try {
      const resp = await axios.post(`${SIDECAR_URL.replace(/\/$/,'')}/enqueue`, jobPayload);
      const data = resp.data;
      // Return jobId so client can poll /api/sidecar/status/:id
      res.json({ success: true, jobId: data.jobId });
    } catch (sidecarErr) {
      // Sidecar not available - return mock success for now
      console.warn('⚠️  Sidecar unavailable:', sidecarErr.message);
      res.json({ success: true, jobId: 'mock-' + Date.now(), note: 'Sidecar unavailable - using mock mode' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit async job', details: err.message });
  }
});

// Proxy to Dr. Bot engine - WILDCARD must come AFTER specific routes
app.all('/api/drbot/*', authMiddleware, async (req, res) => {
  try {
    const targetPath = req.path.replace('/api/drbot', '');
    const targetUrl = `${MRBOT_URL}${targetPath}`;

    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: ['POST', 'PUT'].includes(req.method) ? req.body : undefined
    });

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Dr. Bot engine unavailable', details: err.message });
  }
});

// ============================================================
// SOCKET.IO HANDLERS
// ============================================================

io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('authenticate', (token) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.join(`user-${decoded.userId}`);
      console.log(`🔐 User authenticated: ${decoded.userId}`);
    } catch (err) {
      socket.emit('auth_error', 'Invalid token');
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
  });
});

// ============================================================
// HEALTH & STARTUP
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    platform: 'DrBoT Community',
    version: '1.0.0'
  });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start server
async function bootstrap() {
  // Ensure directories exist
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(UPLOADS_DIR, { recursive: true });

  // Initialize demo data
  await initDemoData();

  // Start HTTP server
  
// ============================================================
// RESEARCH API PROXY - Added by Fractal Army Integration
// ============================================================

const axios = require('axios');
const RESEARCH_API = process.env.RESEARCH_API_URL || 'http://localhost:8787';

// Proxy all /api/research/* requests to Research API
app.all('/api/research/*', async (req, res) => {
  try {
    const path = req.path.replace('/api/research', '');
    const url = `${RESEARCH_API}${path}`;
    
    // Forward with auth token if present
    const headers = {};
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }
    
    const response = await axios({
      method: req.method,
      url: url,
      data: req.body,
      headers: headers,
      params: req.query
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Research API proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Research API error',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health/ecosystem', async (req, res) => {
  const health = {
    community: 'healthy',
    timestamp: new Date().toISOString()
  };
  
  try {
    await axios.get(`${RESEARCH_API}/health`, { timeout: 2000 });
    health.research_api = 'healthy';
  } catch (e) {
    health.research_api = 'offline';
  }
  
  res.json(health);
});


server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🏥  DrBoT COMMUNITY PLATFORM                                ║
║  Healthcare Professional Social Network                      ║
╚══════════════════════════════════════════════════════════════╝

🌐 Server running on: http://localhost:${PORT}
🔌 WebSocket: ws://localhost:${PORT}
🤖 Dr. Bot Engine: ${MRBOT_URL} (proxy at /api/drbot/*)

📡 API Endpoints:
  Auth:
    POST /api/auth/register     - Create account
    POST /api/auth/login        - Login
    GET  /api/auth/me           - Current user

  Users:
    GET  /api/users/:id         - Get profile
    PUT  /api/users/profile     - Update profile
    POST /api/users/avatar      - Upload avatar

  Credentials:
    POST /api/credentials       - Upload credential
    GET  /api/credentials       - List credentials

  Social:
    POST /api/posts             - Create post
    GET  /api/feed              - Get feed
    POST /api/posts/:id/like    - Like post
    POST /api/articles          - Create article
    GET  /api/articles          - List articles

  Connections:
    POST /api/connections/request    - Send request
    POST /api/connections/:id/respond - Accept/reject
    GET  /api/connections            - List connections

  Messaging:
    POST /api/messages          - Send message
    GET  /api/messages/:userId  - Get conversation
    GET  /api/conversations     - List conversations

  Clinical:
    GET  /api/clinical/cases    - Case library
    ALL  /api/drbot/*           - Proxy to Dr. Bot engine

Demo Accounts:
  📧 dr.smith@drbot.health / demo123
  📧 dr.jones@drbot.health / demo123
    `);
  });
}

bootstrap().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

// Keep event loop alive with a heartbeat timer
setInterval(() => {
  // Heartbeat - prevents Node.js from exiting
}, 30000);
