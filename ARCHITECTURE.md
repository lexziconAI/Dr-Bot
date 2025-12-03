# DrBoT Community Platform Architecture

## Overview
A Facebook-style professional healthcare community platform with integrated AI clinical decision support.

## Core Features

### 1. Social Layer (Facebook-style)
- User profiles with credentials verification
- Friend/connection system
- News feed with posts and articles
- Comments, likes, shares
- Direct messaging
- Groups and communities

### 2. Professional Layer
- Credential upload and verification (degrees, licenses, certifications)
- Professional badges and specialties
- Verified healthcare professional status
- CPD/CE tracking

### 3. Content Layer
- Posts (short updates)
- Articles (long-form with rich editor)
- Case studies (anonymized clinical scenarios)
- Resource library
- Workshop announcements

### 4. AI Clinical Support (LOG 3 & 4 Integration)
- Clinical Decision Support tool (existing Dr. Bot)
- Case scenario library for learning
- AI-assisted triage (patient-facing mode)
- Bifurcation analysis for complex decisions

### 5. Education Layer
- Workshop calendar
- Course enrollment
- Progress tracking
- Competency badges
- Certificate generation

## Technical Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS
- React Router for navigation
- React Query for data fetching
- Socket.io for real-time features

### Backend
- Node.js with Express
- PostgreSQL for relational data
- Redis for caching and sessions
- Socket.io for real-time
- JWT authentication

### AI Integration
- Existing Dr. Bot engine (port 4602)
- Groq Llama 70B for content
- Claude for complex reasoning
- Gemini for vision/documents

## Database Schema (High-Level)

### Users
- id, email, password_hash, name, avatar
- specialty, credentials[], verified_status
- membership_tier, created_at

### Posts
- id, author_id, content, media[], 
- likes_count, comments_count, shares_count
- visibility, created_at

### Articles
- id, author_id, title, content (rich text)
- tags[], category, published, featured

### Connections (Friends)
- user_id, friend_id, status, created_at

### Messages
- id, sender_id, recipient_id, content
- read_at, created_at

### Credentials
- id, user_id, type, title, issuer
- issue_date, expiry_date, document_url
- verification_status

### ClinicalCases
- id, author_id, title, scenario
- specialty, difficulty, learning_objectives
- bifurcation_data (JSON)

## Directory Structure

```
DrBotCommunity/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   ├── feed/
│   │   │   ├── profile/
│   │   │   ├── clinical/
│   │   │   ├── messaging/
│   │   │   └── common/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── utils/
│   └── public/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── utils/
│   ├── prisma/
│   └── tests/
└── shared/
    └── types/
```

## Worker Assignments

### Worker 1: Auth & User System
- Login/Register pages
- JWT authentication
- User profile management
- Credential upload system

### Worker 2: Social Feed & Posts
- News feed component
- Post creation/editing
- Comments and likes
- Share functionality

### Worker 3: Articles & Content
- Rich text editor
- Article publishing
- Content moderation
- Search and discovery

### Worker 4: Connections & Messaging
- Friend request system
- Connection management
- Direct messaging
- Real-time notifications

### Worker 5: Clinical Integration
- Embed existing Dr. Bot
- Case library browser
- Learning mode interface
- Progress tracking

### Worker 6: Backend API
- Express server setup
- Database schema
- API endpoints
- Authentication middleware
