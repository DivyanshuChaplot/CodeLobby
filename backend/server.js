const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { runCode } = require('./runner');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Ephemeral room store
// roomId -> { code, language, users: { socketId: { name, color, cursor } }, canvasStrokes, chatMessages }
const rooms = {};

// Colors palette for user cursors (strictly variations of Yellow and White!)
const USER_COLORS = [
  '#FFE000', // Bright Gold/Yellow
  '#FFFFFF', // Pure White
  '#FFF59D', // Light Yellow
  '#FFF176', // Accent Yellow
  '#EEEEEE', // Off-White
  '#FBC02D', // Dark Yellow/Gold
  '#FFFDE7'  // Ivory/White
];

app.post('/api/run', (req, res) => {
  const { language, code, stdin } = req.body;
  if (!language || !code) {
    return res.status(400).json({ error: 'Missing language or code' });
  }

  runCode(language, code, stdin, (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message || 'Execution error' });
    }
    res.json(result);
  });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle joining a room
  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId);
    
    // Initialize room if it doesn't exist
    if (!rooms[roomId]) {
      rooms[roomId] = {
        code: '// Welcome to CodeLobby!\n// Collaborative Code & whiteboard workspace.\n\nfunction greet() {\n  console.log("Hello from CodeLobby!");\n}\n\ngreet();\n',
        language: 'javascript',
        users: {},
        canvasStrokes: [],
        chatMessages: []
      };
    }

    // Assign color from yellow-white palette
    const colorIndex = Object.keys(rooms[roomId].users).length % USER_COLORS.length;
    const userColor = USER_COLORS[colorIndex];

    // Add user to room state
    rooms[roomId].users[socket.id] = {
      name: username || `Guest_${socket.id.substring(0, 4)}`,
      color: userColor,
      cursor: null
    };

    // Send current state to the joining user
    socket.emit('room-init', {
      code: rooms[roomId].code,
      language: rooms[roomId].language,
      canvasStrokes: rooms[roomId].canvasStrokes,
      chatMessages: rooms[roomId].chatMessages,
      users: rooms[roomId].users,
      myId: socket.id
    });

    // Notify other users
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      user: rooms[roomId].users[socket.id]
    });

    console.log(`User ${username || socket.id} joined room ${roomId}`);
  });

  // Handle code modification
  socket.on('code-change', ({ roomId, changes, fullCode }) => {
    if (rooms[roomId]) {
      rooms[roomId].code = fullCode;
      // Broadcast character edits/deltas to other clients
      socket.to(roomId).emit('code-update', { changes, fullCode });
    }
  });

  // Handle language change
  socket.on('language-change', ({ roomId, language }) => {
    if (rooms[roomId]) {
      rooms[roomId].language = language;
      socket.to(roomId).emit('language-update', language);
    }
  });

  // Handle cursor position updates
  socket.on('cursor-move', ({ roomId, cursor }) => {
    if (rooms[roomId] && rooms[roomId].users[socket.id]) {
      rooms[roomId].users[socket.id].cursor = cursor;
      socket.to(roomId).emit('cursor-update', {
        userId: socket.id,
        cursor
      });
    }
  });

  // Handle whiteboard drawings
  socket.on('draw-stroke', ({ roomId, stroke }) => {
    if (rooms[roomId]) {
      rooms[roomId].canvasStrokes.push(stroke);
      socket.to(roomId).emit('draw-stroke-update', stroke);
    }
  });

  // Handle clear whiteboard
  socket.on('clear-canvas', (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].canvasStrokes = [];
      io.to(roomId).emit('clear-canvas-update');
    }
  });

  // Handle chat messages
  socket.on('send-message', ({ roomId, message }) => {
    if (rooms[roomId] && rooms[roomId].users[socket.id]) {
      const chatMsg = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        senderId: socket.id,
        senderName: rooms[roomId].users[socket.id].name,
        senderColor: rooms[roomId].users[socket.id].color,
        text: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      rooms[roomId].chatMessages.push(chatMsg);
      io.to(roomId).emit('receive-message', chatMsg);
    }
  });

  // Handle WebRTC audio call signals
  socket.on('webrtc-signal', ({ targetSocketId, signal }) => {
    io.to(targetSocketId).emit('webrtc-signal-receive', {
      senderSocketId: socket.id,
      signal
    });
  });

  // Handle run code socket event (alternative to HTTP POST)
  socket.on('run-code', ({ roomId, stdin }) => {
    if (rooms[roomId]) {
      const { language, code } = rooms[roomId];
      io.to(roomId).emit('run-status', { status: 'running' });
      runCode(language, code, stdin, (err, result) => {
        if (err) {
          io.to(roomId).emit('run-status', {
            status: 'completed',
            result: { stdout: '', stderr: err.message || 'Execution error', exitCode: 1 }
          });
        } else {
          io.to(roomId).emit('run-status', {
            status: 'completed',
            result
          });
        }
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find room the user belonged to
    for (const roomId in rooms) {
      if (rooms[roomId].users[socket.id]) {
        const username = rooms[roomId].users[socket.id].name;
        delete rooms[roomId].users[socket.id];

        // Notify remaining users in the room
        socket.to(roomId).emit('user-left', {
          userId: socket.id,
          username
        });

        // Clean up empty rooms
        if (Object.keys(rooms[roomId].users).length === 0) {
          console.log(`Room ${roomId} is empty. Auto-deleting in 5 seconds...`);
          setTimeout(() => {
            if (rooms[roomId] && Object.keys(rooms[roomId].users).length === 0) {
              delete rooms[roomId];
              console.log(`Room ${roomId} deleted due to inactivity.`);
            }
          }, 5000);
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`CodeLobby backend running on port ${PORT}`);
});
