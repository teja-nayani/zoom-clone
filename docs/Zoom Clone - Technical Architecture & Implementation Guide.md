# **Zoom Clone \- Technical Architecture & Implementation Guide**

## **Objective**

Build a Zoom-like video conferencing platform using:

* Frontend: Next.js \+ React \+ TypeScript  
* Backend: FastAPI (Python)  
* Database: SQLite

The application should support:

* Dashboard/Home Page  
* Instant Meeting Creation  
* Join Meeting  
* Schedule Meeting  
* Video Conferencing Room  
* Participant Management  
* Meeting History  
* Upcoming Meetings

---

# **1\. Required Knowledge Areas**

## **Frontend**

### **Core Technologies**

* Next.js  
* React  
* TypeScript  
* Tailwind CSS

### **UI Libraries**

* shadcn/ui  
* Radix UI

### **Forms & Validation**

* React Hook Form  
* Zod

### **Date Handling**

* date-fns  
* Day.js

### **Icons**

* lucide-react

### **Browser APIs**

#### **Camera & Microphone**

navigator.mediaDevices.getUserMedia()

Used for:

* Camera access  
* Microphone access

#### **Screen Sharing**

navigator.mediaDevices.getDisplayMedia()

Used for:

* Screen sharing  
* Window sharing  
* Tab sharing

#### **WebRTC**

RTCPeerConnection

Used for:

* Audio communication  
* Video communication  
* Peer-to-peer media transmission

#### **WebSocket**

Used for:

* Real-time room communication  
* Signaling messages  
* Participant state updates

---

## **Backend**

### **Framework**

* FastAPI

### **Database**

* SQLite

### **ORM**

* SQLAlchemy

### **Migrations**

* Alembic (Optional)

### **Validation**

* Pydantic

### **Realtime Communication**

* FastAPI WebSockets

---

# **2\. Understanding Communication Protocols**

## **HTTP**

Use HTTP for:

* Creating meetings  
* Scheduling meetings  
* Fetching dashboard data  
* Validating meeting IDs  
* Updating database records

Examples:

GET /meetings  
POST /meetings  
PATCH /meetings

---

## **WebSocket**

Use WebSockets for:

* Participant joined notifications  
* Participant left notifications  
* Signaling messages  
* Mute/unmute events  
* Video on/off events  
* Chat messages  
* Host controls

Examples:

participant joined  
participant left  
offer  
answer  
ice candidate  
mute all  
remove participant

---

## **WebRTC**

Use WebRTC for:

* Audio streaming  
* Video streaming  
* Screen sharing

Important:

WebRTC carries the actual media streams.

WebSocket DOES NOT carry video/audio.

WebSocket only helps establish WebRTC connections.

---

# **3\. Database Design**

## **users**

users  
\------  
id  
name  
email  
avatar\_url  
created\_at

---

## **meetings**

meetings  
\---------  
id  
meeting\_code  
title  
description  
host\_user\_id  
scheduled\_start\_time  
duration\_minutes  
status  
invite\_link  
created\_at

Status:

scheduled  
live  
ended

---

## **participants**

participants  
\-------------  
id  
meeting\_id  
display\_name  
user\_id  
role  
joined\_at  
left\_at  
is\_muted  
is\_video\_on

Role:

host  
participant

---

## **recent\_meetings**

recent\_meetings  
\----------------  
id  
meeting\_id  
user\_id  
joined\_at

---

# **4\. Application Components**

---

# **A. Dashboard**

## **Features**

* New Meeting  
* Join Meeting  
* Schedule Meeting  
* Upcoming Meetings  
* Recent Meetings

## **Communication Type**

HTTP

## **APIs**

GET /meetings/upcoming  
GET /meetings/recent

Reason:

Dashboard data is normal CRUD data and does not require realtime communication.

---

# **B. Instant Meeting Creation**

## **Flow**

User clicks:

New Meeting

Backend:

1. Generate unique meeting code  
2. Create meeting record  
3. Mark status as LIVE  
4. Generate invite link

API:

POST /meetings/instant

Example Response:

{  
  "meeting\_code": "123456789",  
  "invite\_link": "/meeting/123456789"  
}

Frontend Redirect:

/meeting/123456789

Communication Type:

HTTP

---

# **C. Join Meeting**

## **Flow**

Step 1

User enters:

Meeting ID  
or  
Invite Link

Step 2

Validate Meeting

GET /meetings/{meeting\_code}

Step 3

User enters display name

Step 4

Join Meeting

POST /meetings/{meeting\_code}/join

Step 5

Navigate to Meeting Room

Step 6

Open WebSocket Connection

Step 7

Start WebRTC

---

# **D. Schedule Meeting**

## **Form Fields**

* Title  
* Description  
* Date  
* Time  
* Duration

API

POST /meetings/schedule

Example Request

{  
  "title": "Team Sync",  
  "description": "Daily Standup",  
  "scheduled\_start\_time": "2026-06-13T10:00:00",  
  "duration\_minutes": 30  
}

Backend:

1. Generate meeting code  
2. Generate invite link  
3. Save meeting  
4. Return meeting details

Communication Type:

HTTP

---

# **E. Meeting Room**

This is the most important module.

Technology Stack:

WebRTC  
\+  
WebSocket

Responsibilities:

WebRTC:

* Video  
* Audio  
* Screen Share

WebSocket:

* Signaling  
* Participant state updates  
* Meeting events

---

# **5\. WebSocket Events**

## **Client → Server**

join-room  
leave-room  
offer  
answer  
ice-candidate  
toggle-audio  
toggle-video  
screen-share-started  
screen-share-stopped  
remove-participant  
mute-participant

---

## **Server → Client**

participant-joined  
participant-left  
offer  
answer  
ice-candidate  
participant-audio-updated  
participant-video-updated  
host-muted-you  
removed-from-meeting

---

# **6\. Room Management**

Backend stores active rooms.

Example:

rooms \= {  
    "123456789": {  
        "socket\_1": participant,  
        "socket\_2": participant  
    }  
}

For assignment purposes:

In-memory storage is sufficient.

For production:

Redis

would be used.

---

# **7\. WebRTC Signaling Flow**

Example with 2 participants.

## **User A joins**

Open camera  
Open microphone

---

## **User B joins**

Server sends:

participant-joined

to User A.

---

## **Offer Creation**

User A:

Create RTCPeerConnection  
Create Offer  
Send Offer

Offer sent via WebSocket.

---

## **Answer Creation**

User B:

Receive Offer  
Create Answer  
Send Answer

Answer sent via WebSocket.

---

## **ICE Exchange**

Both users exchange:

ICE Candidates

via WebSocket.

---

## **Media Flow Begins**

After connection establishment:

Audio  
Video

flow directly through WebRTC.

---

# **8\. Multi Participant Meetings**

Mesh Architecture

Each participant maintains a peer connection with every other participant.

Example:

4 users

User A \-\> B  
User A \-\> C  
User A \-\> D

User B \-\> C  
User B \-\> D

User C \-\> D

Each user has:

3 peer connections

Mesh is acceptable for:

2–5 participants

Perfect for assignment requirements.

---

# **9\. Feature vs Technology Mapping**

| Feature | Technology |
| ----- | ----- |
| Dashboard | HTTP |
| Create Meeting | HTTP |
| Schedule Meeting | HTTP |
| Validate Meeting | HTTP |
| Join Meeting | HTTP |
| Participant Join/Leave | WebSocket |
| Chat | WebSocket |
| Audio | WebRTC |
| Video | WebRTC |
| Screen Share | WebRTC |
| Mute/Unmute | WebSocket |
| Host Controls | WebSocket |
| Recent Meetings | HTTP |
| End Meeting | HTTP \+ WebSocket |

---

# **10\. Recommended Frontend Structure**

frontend/  
│  
├── app/  
│   ├── page.tsx  
│   ├── dashboard/page.tsx  
│   ├── join/page.tsx  
│   ├── schedule/page.tsx  
│   └── meeting/\[meetingCode\]/page.tsx  
│  
├── components/  
│   ├── dashboard/  
│   ├── meeting/  
│   └── ui/  
│  
├── hooks/  
│   ├── useWebSocket.ts  
│   ├── useWebRTC.ts  
│   └── useMediaDevices.ts  
│  
└── lib/  
    ├── api.ts  
    ├── constants.ts  
    └── types.ts

---

# **11\. Recommended Backend Structure**

backend/  
│  
├── app/  
│   ├── main.py  
│   ├── database.py  
│   ├── models.py  
│   ├── schemas.py  
│  
├── routers/  
│   ├── meetings.py  
│   └── participants.py  
│  
├── websocket/  
│   ├── manager.py  
│   └── signaling.py  
│  
└── seed.py

---

# **12\. Recommended Libraries**

## **Frontend**

next  
react  
typescript  
tailwindcss  
shadcn/ui  
lucide-react  
react-hook-form  
zod  
date-fns  
axios (optional)

---

## **Backend**

fastapi  
uvicorn  
sqlalchemy  
pydantic  
python-dotenv  
alembic (optional)

---

# **13\. Development Roadmap**

Phase 1

* Setup Frontend  
* Setup Backend  
* Setup SQLite

---

Phase 2

* Dashboard UI  
* Meeting APIs  
* Schedule APIs  
* Recent Meetings APIs

---

Phase 3

* Meeting Room Layout  
* Camera Preview  
* Microphone Preview

---

Phase 4

* FastAPI WebSocket Server  
* Room Management

---

Phase 5

* WebRTC Signaling  
* Offer/Answer Exchange  
* ICE Candidate Exchange

---

Phase 6

* Video Calling  
* Audio Calling  
* Screen Sharing

---

Phase 7

* Host Controls  
* Mute Participants  
* Remove Participants

---

Phase 8

* Seed Database  
* Testing  
* Deployment

---

# **14\. Final Architecture Summary**

Use:

HTTP  
→ Database Operations

WebSocket  
→ Realtime Communication & Signaling

WebRTC  
→ Actual Audio, Video and Screen Sharing

Simple Rule:

If data needs to be stored → HTTP

If data needs instant updates → WebSocket

If data is media (video/audio) → WebRTC

---

# **15\. Assumptions, Technical Decisions, and Production Differences**

## **15.1 Key Assumptions for Assignment MVP**

### **1\. Default User Is Logged In**

The assignment says login is not required.

Assumption:

A default user is already logged in.

Implementation:

Hardcode a default user in backend seed data.

Example:

{  
  "id": 1,  
  "name": "Demo User",  
  "email": "demo@example.com"  
}

Production Difference:

Use real authentication with JWT/session cookies, OAuth, Google login, etc.

---

## **15.2 Video Architecture Decision**

### **Decision: Use Mesh WebRTC**

For this assignment, use:

Mesh WebRTC Architecture

Meaning:

Every participant connects directly to every other participant.

Example:

For 4 users:

A connects to B, C, D  
B connects to A, C, D  
C connects to A, B, D  
D connects to A, B, C

Each participant has:

N \- 1 peer connections

So for 4 users:

3 peer connections per user

Why this is good for assignment:

Simple to build  
No media server required  
Works for small meetings  
Good enough for 2–5 users  
Easier to explain in evaluation

Limitations:

Not scalable for large meetings  
Higher CPU usage  
Higher bandwidth usage  
Each user uploads video to every other participant  
Poor performance when participant count increases

---

## **15.3 Production Video Architecture**

In production, Zoom-like apps do not usually depend only on mesh WebRTC.

Production would use:

SFU \- Selective Forwarding Unit

Examples:

mediasoup  
LiveKit  
Janus  
Jitsi Videobridge  
Agora  
Twilio Video  
Daily.co

How SFU works:

Each participant sends one media stream to the SFU.  
The SFU forwards streams to other participants.

Benefits:

Scales better  
Lower client CPU usage  
Lower upload bandwidth  
Better for group calls  
Supports recording  
Supports adaptive video quality  
Supports active speaker layout

Assignment MVP:

Browser ↔ Browser

Production:

Browser ↔ SFU Media Server ↔ Other Browsers

---

## **15.4 Signaling Decision**

### **Decision: Use FastAPI WebSocket for Signaling**

Use WebSocket for:

join-room  
leave-room  
offer  
answer  
ice-candidate  
toggle-audio  
toggle-video  
screen-share-started  
screen-share-stopped  
host controls

Why:

WebRTC needs signaling.  
WebSocket provides real-time bidirectional messaging.  
FastAPI already supports WebSockets.  
No need to introduce Node.js or Socket.IO.

Production Difference:

Use Redis Pub/Sub or message broker for multi-server WebSocket scaling.

MVP:

One backend server  
In-memory WebSocket room manager

Production:

Multiple backend servers  
Redis for shared room state  
Load balancer with sticky sessions or WebSocket-aware routing

---

## **15.5 Room State Decision**

### **Decision: Store Active Room State In Memory**

MVP backend can store active meeting room state like this:

rooms \= {  
    "123456789": {  
        "socket\_1": participant,  
        "socket\_2": participant  
    }  
}

Why:

Fast to implement  
Easy to debug  
Enough for assignment/demo

Limitation:

State disappears if backend restarts.  
Does not work well with multiple backend instances.

Production Difference:

Use:

Redis  
PostgreSQL  
Message broker  
Presence service

Production state examples:

Who is currently online  
Who is in which room  
Which socket belongs to which user  
Which participant is muted  
Which participant is sharing screen

---

## **15.6 Database Decision**

### **Decision: Use SQLite**

The assignment asks for SQLite.

Use SQLite for:

users  
meetings  
participants  
recent\_meetings

Why:

Simple setup  
No external DB needed  
Good for assignment  
Easy local development

Production Difference:

Use:

PostgreSQL  
MySQL  
Cloud SQL  
Amazon RDS  
Neon  
Supabase

Why production needs PostgreSQL:

Better concurrency  
Better reliability  
Better migrations  
Better indexing  
Better scaling  
Better backup/restore

---

## **15.7 Authentication Decision**

### **MVP Decision: No Real Auth**

Assumption:

Default user is logged in.

Use:

DEFAULT\_USER\_ID \= 1

Production Difference:

Add:

Signup  
Login  
JWT/session authentication  
Password hashing  
OAuth login  
Role-based permissions  
Protected routes

Host controls should verify:

Only host can mute/remove participants.

---

## **15.8 Meeting ID Decision**

### **Decision: Generate Unique Meeting Code**

Use meeting codes like:

123-456-789

or:

123456789

Backend should ensure uniqueness.

MVP approach:

Generate random 9-digit code.  
Check DB if it already exists.  
Regenerate if duplicate.

Production Difference:

Use stronger IDs  
Rate-limit meeting creation  
Prevent guessing/brute force  
Add meeting passwords/waiting rooms

---

## **15.9 Invite Link Decision**

### **Decision: Simple Invite Link**

MVP invite link:

https://your-frontend.com/meeting/123456789

Production Difference:

Signed invite links  
Meeting passwords  
Waiting room support  
Expiry time  
Access control  
Calendar integration  
Email invites

---

## **15.10 Screen Sharing Decision**

Use:

navigator.mediaDevices.getDisplayMedia()

MVP behavior:

Replace camera video track with screen share track.  
When screen share stops, switch back to camera track.

Production Difference:

Separate screen-share stream  
Multiple quality layers  
Presenter controls  
Permission handling  
Recording support

---

## **15.11 Host Controls Decision**

MVP host controls:

Mute participant  
Remove participant  
Mute all  
End meeting

Use WebSocket events.

Example:

host sends mute-participant  
server checks host role  
server sends host-muted-you to participant  
participant disables local audio track

Production Difference:

Server-side permission enforcement  
Audit logs  
Role hierarchy  
Co-hosts  
Waiting rooms  
Lock meeting  
Report participant

---

## **15.12 Recent Meetings Decision**

MVP:

Store recent meetings when user joins/leaves a meeting.

Use HTTP API:

GET /meetings/recent

Production Difference:

Paginated history  
Search/filter meetings  
Cloud recordings  
Attendance reports  
Analytics

---

## **15.13 Upcoming Meetings Decision**

MVP:

Upcoming meetings \= scheduled meetings where scheduled\_start\_time \> current time.

API:

GET /meetings/upcoming

Production Difference:

Timezone support  
Recurring meetings  
Calendar sync  
Email reminders  
Push notifications

---

## **15.14 Deployment Decision**

MVP deployment:

Frontend → Vercel  
Backend → Render/Railway  
Database → SQLite file on backend server

Production Difference:

Frontend → Vercel/CloudFront  
Backend → Kubernetes/ECS/Fly.io  
Database → PostgreSQL  
Media Server → SFU cluster  
Redis → real-time state  
Object Storage → recordings/files  
Monitoring → Grafana/Datadog/Sentry

Important:

SQLite on Render/Railway may not be reliable for persistent production data.

For assignment, it is acceptable.

---

## **15.15 What We Are Not Building in MVP**

Not required for assignment:

Large-scale group calls  
Cloud recording  
Real user auth  
Email invites  
Calendar sync  
Waiting room  
Meeting passwords  
Breakout rooms  
Chat persistence  
Push notifications  
Mobile app  
SFU media server  
Admin dashboard  
Analytics

These can be mentioned as production improvements.

---

# **16\. Final Decision Summary**

| Area | MVP Decision | Production Decision |
| ----- | ----- | ----- |
| Video Architecture | Mesh WebRTC | SFU-based architecture |
| Signaling | FastAPI WebSocket | WebSocket \+ Redis/message broker |
| Database | SQLite | PostgreSQL |
| Auth | Default user | Real auth with JWT/OAuth |
| Room State | In-memory | Redis/presence service |
| Meeting Links | Simple links | Secure signed links/passwords |
| Deployment | Vercel \+ Render/Railway | Scalable cloud infra |
| Participants | 2–5 users | Large meetings |
| Host Controls | Basic WebSocket events | Permissioned controls \+ audit logs |
| Screen Share | Basic getDisplayMedia | Dedicated screen stream \+ recording |
| Recent Meetings | Simple DB table | Analytics/history/recordings |
| Upcoming Meetings | Simple scheduled query | Calendar/recurring/reminders |

---

# **17\. Final Architecture Philosophy**

For this assignment:

Keep the system simple, working, and explainable.

Use:

HTTP for CRUD  
WebSocket for realtime events and signaling  
WebRTC for audio/video/screen sharing  
SQLite for persistence  
In-memory state for active rooms  
Mesh WebRTC for small calls

For production:

Replace mesh WebRTC with SFU  
Replace SQLite with PostgreSQL  
Replace in-memory state with Redis  
Add real authentication  
Add permissions and security  
Add monitoring and scalable deployment

