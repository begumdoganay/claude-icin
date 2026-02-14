// WebSocket Server with Socket.IO
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:8000'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

// Store connected users
const connectedUsers = new Map();

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // User authentication
  socket.on('authenticate', (userData) => {
    connectedUsers.set(socket.id, {
      userId: userData.userId,
      name: userData.name,
      socketId: socket.id,
      connectedAt: new Date()
    });
    
    console.log(`👤 User authenticated: ${userData.name} (${socket.id})`);
    
    // Send welcome message
    socket.emit('welcome', {
      message: `Welcome ${userData.name}!`,
      onlineUsers: connectedUsers.size
    });

    // Broadcast to others
    socket.broadcast.emit('user_joined', {
      name: userData.name,
      onlineUsers: connectedUsers.size
    });
  });

  // New receipt uploaded
  socket.on('receipt_uploaded', (data) => {
    console.log('📄 Receipt uploaded:', data);
    
    // Emit to the user who uploaded
    socket.emit('receipt_processed', {
      success: true,
      receiptId: data.receiptId,
      tokensEarned: data.tokensEarned,
      newBalance: data.newBalance,
      message: `You earned ${data.tokensEarned} LUVY tokens!`
    });

    // Update leaderboard for all users
    io.emit('leaderboard_update', {
      userId: data.userId,
      name: data.userName,
      newBalance: data.newBalance,
      timestamp: new Date()
    });
  });

  // Balance update
  socket.on('balance_update', (data) => {
    socket.emit('balance_updated', {
      newBalance: data.balance,
      change: data.change
    });
  });

  // Achievement unlocked
  socket.on('achievement_unlocked', (data) => {
    socket.emit('achievement', {
      title: data.title,
      description: data.description,
      icon: data.icon,
      reward: data.reward
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      console.log(`❌ User disconnected: ${user.name} (${socket.id})`);
      connectedUsers.delete(socket.id);
      
      // Broadcast to others
      io.emit('user_left', {
        name: user.name,
        onlineUsers: connectedUsers.size
      });
    }
  });
});

// REST API endpoints for testing
app.post('/api/test/receipt', (req, res) => {
  const { userId, userName, tokensEarned, newBalance } = req.body;
  
  // Simulate receipt processing
  io.emit('receipt_processed', {
    userId,
    userName,
    tokensEarned,
    newBalance,
    message: `${userName} earned ${tokensEarned} LUVY tokens!`
  });

  res.json({ success: true, message: 'Receipt broadcast sent' });
});

app.post('/api/test/notification', (req, res) => {
  const { message, type } = req.body;
  
  io.emit('notification', {
    type: type || 'info',
    message: message || 'Test notification',
    timestamp: new Date()
  });

  res.json({ success: true, message: 'Notification sent' });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    connectedUsers: connectedUsers.size,
    uptime: process.uptime()
  });
});

const PORT = process.env.WS_PORT || 3001;

server.listen(PORT, () => {
  console.log('🚀 WebSocket server running on port', PORT);
  console.log('📡 Socket.IO ready for connections');
});

module.exports = { io, server };
