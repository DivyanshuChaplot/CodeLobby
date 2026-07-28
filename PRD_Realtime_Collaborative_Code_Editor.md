# Product Requirements Document (PRD)
## Real-Time Collaborative Code Editor ("CodeTogether")

**Version:** 1.0
**Author:** [Your Name]
**Date:** July 2026
**Status:** Draft — Ready for Development

---

## 1. Overview

### 1.1 Problem Statement
Developers, students, and interview panels often need to write and run code together in real time — for pair programming, technical interviews, teaching, or remote collaboration. Existing solutions (Google Docs for code, screen-sharing) lack proper syntax handling, live multi-cursor editing, and safe in-browser code execution. Tools like Replit/CodeSandbox exist but are closed-source, expensive at scale, or overkill for a focused use case.

### 1.2 Product Vision
A lightweight, self-hostable, real-time collaborative code editor where multiple users can write code together, execute it safely in isolated sandboxes, chat, and optionally talk over voice/video — all inside a single browser tab.

### 1.3 Goals
- Enable seamless multi-user real-time code editing with near-zero conflict/lag
- Provide safe, sandboxed multi-language code execution
- Support built-in communication (chat + optional audio/video) so no third-party tool is needed
- Be resume-worthy: demonstrate strong system design, real-time systems, security awareness, and DevOps skills

### 1.4 Non-Goals (v1)
- Full IDE feature parity (no debugging, no extensions marketplace)
- Support for 50+ concurrent users per room (target: 2–10 users/room)
- Mobile-native apps (web-responsive only)
- Enterprise auth (SSO/SAML) — basic auth only for v1

---

## 2. Target Users

| Persona | Use Case |
|---|---|
| Technical interviewer | Runs live coding interviews with candidates |
| Study group / students | Pair programming, DSA practice together |
| Remote dev teams | Quick collaborative debugging sessions |
| Educators | Live coding demonstrations to a class |

---

## 3. Core Features & Requirements

### 3.1 Room Management (P0 — Must Have)
- Create a room with a unique shareable link/code
- Join a room via link (no mandatory signup — guest mode with display name)
- Room owner can set: programming language, max participants, room expiry
- Room auto-deletes after inactivity (e.g., 24 hrs) or on owner's exit if empty

**Acceptance Criteria:**
- Room creation returns a unique URL within 500ms
- Second user joining sees the exact current state of the editor instantly (no stale/empty doc)

### 3.2 Real-Time Collaborative Editing (P0 — Must Have)
- Multiple cursors visible with user name/color labels
- Live text sync across all clients with conflict-free merging (CRDT-based)
- Syntax highlighting per selected language
- Undo/redo that respects collaborative history (not just local)

**Acceptance Criteria:**
- Edit-to-sync latency < 150ms on standard broadband
- No data loss or corruption when 2+ users type simultaneously in the same line
- Reconnecting after a network drop resyncs without duplicating/losing content

### 3.3 Code Execution (P0 — Must Have)
- Support at least: Python, JavaScript (Node), C++, Java (extendable)
- "Run" button executes current code, streams stdout/stderr back live
- Execution fully sandboxed — no network access, no filesystem persistence, capped CPU/memory, hard timeout (e.g. 10s)
- Support for stdin input for interactive programs

**Acceptance Criteria:**
- A malicious/infinite-loop script cannot hang or crash the server (timeout kills container)
- Execution result appears within 2s for typical short programs
- Concurrent executions from different rooms don't interfere with each other

### 3.4 Chat (P1 — Should Have)
- Room-scoped text chat panel alongside the editor
- Message history persists for the room's lifetime
- Basic markdown support (code blocks, bold, links)

**Acceptance Criteria:**
- Messages delivered in real time (<200ms) to all room participants
- Chat history loads for a user who joins mid-session

### 3.5 Video/Audio (P2 — Nice to Have)
- Optional toggle-able audio/video call within the room
- Mute/unmute, camera on/off controls
- Peer-to-peer for small rooms (≤4 users); documented upgrade path to SFU (mediasoup/LiveKit) for larger rooms

**Acceptance Criteria:**
- A/V connects within 3s of both users enabling it
- Feature fails gracefully (doesn't break editor/chat) if WebRTC connection fails

### 3.6 Presence & Awareness (P1 — Should Have)
- Live list of connected users per room
- Typing/active indicator
- Cursor color-coded per user

---

## 4. Technical Architecture

### 4.1 Tech Stack
| Layer | Technology | Reasoning |
|---|---|---|
| Frontend | React + Monaco Editor | Industry-standard editor (VS Code core) |
| Real-time sync | Yjs (CRDT) + y-websocket | Conflict-free sync, proven at scale |
| Transport | Socket.IO / WebSocket | Bi-directional low-latency comms |
| Backend | Node.js + Express | Matches WebSocket ecosystem, single language stack |
| Execution sandbox | Docker + dockerode | Isolation, resource limits, security |
| Job queue | BullMQ + Redis | Decouples execution from request thread |
| Presence/Pub-Sub | Redis | Fast ephemeral state, scales Socket.IO horizontally |
| Persistent storage | PostgreSQL / MongoDB | Rooms, users, saved sessions |
| Video/Audio | WebRTC (mesh → mediasoup later) | Native browser support, no license cost |
| Deployment | Docker Compose → Kubernetes | Local dev parity → production scaling |

### 4.2 High-Level Data Flow
```
User types → Yjs CRDT update → WebSocket broadcast → Redis Pub/Sub (if multi-instance)
→ All connected clients update editor state

User clicks Run → REST/WS request → BullMQ job queued → Docker container spawned
(isolated, no network, resource-capped) → stdout/stderr captured → streamed back via WebSocket
```

### 4.3 Security Considerations
- Code execution containers: `--network=none`, `--memory=128m`, `--cpus=0.5`, `--read-only` filesystem, non-root user
- Rate-limit execution requests per room/IP to prevent abuse
- Sanitize all chat input (XSS protection)
- Room access via unguessable UUIDs; optional password-protected rooms

### 4.4 Scalability Plan
- Socket.IO Redis adapter to support multiple backend instances
- Stateless backend nodes behind a load balancer
- Docker execution workers can scale independently as a separate pool/queue consumer

---

## 5. Success Metrics (for resume/portfolio framing)

| Metric | Target |
|---|---|
| Real-time sync latency | < 150ms |
| Code execution turnaround | < 2s for typical scripts |
| Concurrent rooms supported (demo) | 50+ |
| Uptime during demo/testing | 99%+ |
| Test coverage (backend) | 70%+ |

---

## 6. Milestones / Build Roadmap

| Phase | Deliverable | Est. Time |
|---|---|---|
| Phase 1 | Room creation + Socket.IO connection, user presence | 1 week |
| Phase 2 | Monaco + Yjs integration → working collaborative editor | 1–2 weeks |
| Phase 3 | Chat panel with persistence | 3–4 days |
| Phase 4 | Docker-based sandboxed code execution (Python + JS first) | 1–2 weeks |
| Phase 5 | Add more languages (C++, Java) + execution queue via BullMQ | 1 week |
| Phase 6 | WebRTC audio/video (mesh, small rooms) | 1 week |
| Phase 7 | Polish: themes, auth, room settings, deployment (Docker Compose) | 1 week |
| Phase 8 | (Stretch) Kubernetes deployment + mediasoup SFU upgrade | 1–2 weeks |

**Total estimated time:** ~7–9 weeks for a solid solo-built version (Phases 1–7)

---

## 7. Resume/Portfolio Framing Tips

When you list this project, highlight the systems-design depth, not just "built a code editor":

- *"Designed and built a real-time collaborative code editor using CRDT-based synchronization (Yjs), supporting sub-150ms multi-user editing latency."*
- *"Implemented a secure, sandboxed multi-language code execution engine using Docker with strict resource isolation (no network access, memory/CPU caps, execution timeouts) to safely run untrusted user code."*
- *"Architected horizontally scalable WebSocket infrastructure using Redis Pub/Sub adapter, enabling the app to scale across multiple backend instances."*
- *"Integrated WebRTC for peer-to-peer audio/video, with a documented scaling path to SFU architecture (mediasoup) for larger rooms."*

These lines signal to recruiters/interviewers that you understand **distributed systems, security, and real-time infrastructure** — not just CRUD app building.

---

## 8. Open Questions / Risks

- Do we need persistent code save/version history per room, or is it purely ephemeral (session-based)?
- What's the abuse-prevention strategy if this is publicly deployed (execution costs, spam rooms)?
- Should authentication be mandatory, or keep guest-mode for frictionless demos?
- Language support priority — which 3 languages give the best demo impact vs. build effort?
