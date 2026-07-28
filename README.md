# CodeLobby ⚡

CodeLobby is an advanced real-time collaborative code editor and shared whiteboard workspace designed in a high-contrast **Cyberpunk Yellow and White** theme. It provides a shared virtual space for developers, study groups, or interviewers.

## Features
- **Strict Yellow & White Cyberpunk UI:** Tailored brand colors using pure dark backgrounds (`#000000`/`#0d0d0d`) and exclusively white and yellow accents.
- **Collaborative Editor:** Multi-user real-time code editor with live syntax highlighting (powered by Monaco Editor) and remote cursor sync displaying names/colors.
- **Dual Workspace Toggle:** Seamlessly switch between the code compiling editor and a **real-time whiteboard board** (syncing pointer-draws, rectangles, lines, circles, and erasers).
- **Secure Code Execution Runner:** Sandboxed compiler endpoint for executing JavaScript (Node.js) and Python 3 scripts with execution limits, process timeouts, and stdin interactive inputs.
- **Lobby Audio Call:** Integrated P2P voice call channel using WebRTC connections established directly via WebSocket signaling.
- **Visual Code Flow Map:** AST-like realtime code analyzer displaying a visual list of defined functions and classes. Click to jump editor cursor to that specific line!
- **Active Code Chat Feed:** Persistent room-scoped messaging board.

---

## Installation & Running Local Development

### 1. Prerequisite
- [Node.js](https://nodejs.org) installed on your system.
- (Optional) `python` or `python3` command available on the host system to run Python code execution.

### 2. Startup Instructions
From the root workspace directory (`d:/CodeLobby`), run:

```bash
# Install root, frontend and backend node modules
npm run install:all

# Run both the Socket.io backend server (port 5000) and the Vite React frontend (port 5173) concurrently
npm run dev
```

Open two separate browser tabs at [http://localhost:5173](http://localhost:5173) (or the Vite dev server port shown), log in with different names under the same Room Key (e.g. `room123`), and start pair programming!

---

## Technical Architecture Details
- **Frontend Framework:** React + Vite
- **Styling:** Vanilla CSS Custom Variables (designed for strict compliance with Yellow & White guidelines)
- **Editor Canvas:** Monaco Editor with custom token rules
- **Realtime Sync Transport:** Socket.io Engine (Node/Express Server)
- **Voice Signal channel:** Peer Connection signaling over WebSockets (STUN Google Servers)
- **Compiler Runner:** Node `child_process` execution worker with strict timeouts.
