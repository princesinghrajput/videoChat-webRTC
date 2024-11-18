// backend/index.js
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.get('/', (req, res) => {
  res.send('<h1>WebRTC Signaling Server</h1>');
});

// Socket.IO signaling logic
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle room joining
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  // Exchange SDP offers and answers
  socket.on('offer', ({ room, offer }) => {
    socket.to(room).emit('offer', offer);
  });

  socket.on('answer', ({ room, answer }) => {
    socket.to(room).emit('answer', answer);
  });

  // Exchange ICE candidates
  socket.on('ice-candidate', ({ room, candidate }) => {
    socket.to(room).emit('ice-candidate', candidate);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
